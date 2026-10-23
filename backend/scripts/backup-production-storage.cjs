// Read-only remote operations. Private backup files are never written into the repo.
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const dotenv=require('dotenv');
const {createClient}=require('@supabase/supabase-js');
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const expected='https://gqkjvxcyetesvqmjkuus.supabase.co';
async function main(){
 const destination=path.resolve(process.argv[2]||'');
 if(!process.argv[2] || !['roles.sql','schema.sql','data.sql'].every(n=>fs.statSync(path.join(destination,n)).size>0)) throw new Error('Existing database export folder required');
 const repo=path.resolve(__dirname,'../..');
 const relative=path.relative(repo,destination);
 if(!relative.startsWith('..'+path.sep) && !path.isAbsolute(relative)) throw new Error('Backup must be outside repository');
 const env=dotenv.parse(fs.readFileSync(path.resolve(__dirname,'../.env')));
 if(env.SUPABASE_URL?.replace(/\/$/,'')!==expected || !env.SUPABASE_SERVICE_KEY) throw new Error('Production target/key guard failed');
 const db=createClient(expected,env.SUPABASE_SERVICE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 const root=path.join(destination,'storage-'+new Date().toISOString().replace(/[:.]/g,'-'));
 fs.mkdirSync(root,{recursive:false,mode:0o700});
 const report={project:'gqkjvxcyetesvqmjkuus',startedAt:new Date().toISOString(),status:'INCOMPLETE',buckets:[],objects:[],databaseFiles:[],limitations:['Live export, not atomic with earlier database dump','Storage restore not yet rehearsed','Hashes validate downloaded/local bytes, not an independent source checksum']};
 const save=()=>fs.writeFileSync(path.join(root,'manifest.json'),JSON.stringify(report,null,2),{mode:0o600});
 async function inventory(bucket,prefix=''){
  const entries=[];
  for(let offset=0;;offset+=100){
   const {data,error}=await db.storage.from(bucket).list(prefix,{limit:100,offset,sortBy:{column:'name',order:'asc'}});
   if(error || !Array.isArray(data)) throw new Error('Storage listing failed');
   for(const item of data){
    const key=prefix?prefix+'/'+item.name:item.name;
    if(item.id) entries.push({bucket,key,id:item.id,updatedAt:item.updated_at,size:item.metadata?.size??null,contentType:item.metadata?.mimetype??null,cacheControl:item.metadata?.cacheControl??null});
    else entries.push(...await inventory(bucket,key));
   }
   if(data.length<100) break;
  }
  return entries;
 }
 const canonical=rows=>JSON.stringify(rows.sort((a,b)=>(a.bucket+'\0'+a.key).localeCompare(b.bucket+'\0'+b.key)));
 try{
  const {data:buckets,error}=await db.storage.listBuckets();
  if(error || !Array.isArray(buckets)) throw new Error('Bucket listing failed');
  report.buckets=buckets;
  const before=[];
  for(const bucket of buckets) before.push(...await inventory(bucket.id));
  save();
  for(const object of before){
   const {data,error}=await db.storage.from(object.bucket).download(object.key);
   if(error || !data) throw new Error('Object download failed');
   const bytes=Buffer.from(await data.arrayBuffer());
   if(object.size!==null && Number(object.size)!==bytes.length) throw new Error('Source/download size mismatch');
   const file=hash(Buffer.from(object.bucket+'\0'+object.key))+'.bin';
   fs.writeFileSync(path.join(root,file),bytes,{flag:'wx',mode:0o600});
   const sha256=hash(bytes);
   if(hash(fs.readFileSync(path.join(root,file)))!==sha256) throw new Error('Local hash mismatch');
   report.objects.push({...object,file,bytes:bytes.length,sha256});
   save();
  }
  const {data:afterBuckets,error:afterError}=await db.storage.listBuckets();
  if(afterError || JSON.stringify(buckets.map(b=>b.id).sort())!==JSON.stringify(afterBuckets.map(b=>b.id).sort())) throw new Error('Bucket set changed during copy');
  const after=[];
  for(const bucket of afterBuckets) after.push(...await inventory(bucket.id));
  if(canonical(before)!==canonical(after)) throw new Error('Objects changed during copy; keep export incomplete');
  for(const file of ['roles.sql','schema.sql','data.sql']){
   const bytes=fs.readFileSync(path.join(destination,file));
   report.databaseFiles.push({file,bytes:bytes.length,sha256:hash(bytes)});
  }
  report.status='COPY_VERIFIED_NOT_RESTORE_TESTED';
  report.completedAt=new Date().toISOString();
  save();
  console.log(JSON.stringify({status:report.status,buckets:buckets.length,objects:report.objects.length,bytes:report.objects.reduce((n,o)=>n+o.bytes,0),folder:root},null,2));
 }catch(error){save();throw error;}
}
main().catch(()=>{console.error('Storage backup incomplete. No remote writes were performed; keep partial files private and inspect configuration/source availability.');process.exitCode=1;});
