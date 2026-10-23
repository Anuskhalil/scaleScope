// Read-only comparison against the applied staging baseline, not a full Storage audit.
const fs=require('node:fs');
const path=require('node:path');
const dotenv=require('dotenv');
const {createClient}=require('@supabase/supabase-js');
const {buildEnvironment}=require('./start-staging.cjs');
const root=path.resolve(__dirname,'..');
const office=['application/pdf','application/vnd.ms-powerpoint','application/vnd.openxmlformats-officedocument.presentationml.presentation','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','image/png','image/jpeg','image/webp'];
const expected={
 avatars:[5242880,['image/jpeg','image/png','image/webp','image/gif']],
 'message-attachments':[null,null],
 'profile-documents':[15728640,[...office,'text/plain','text/csv','application/csv','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']],
 'profile-evidence':[10485760,office],
 'trust-evidence':[5242880,['application/pdf','image/png','image/jpeg']],
};
(async()=>{
 const checks=[]; let status='FAIL';
 try {
  const env=buildEnvironment(dotenv.parse(fs.readFileSync(path.join(root,'.env.staging'))));
  const db=createClient(env.SUPABASE_URL,env.SUPABASE_SERVICE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error}=await db.storage.listBuckets();
  if(error) throw new Error('Unable to read staging bucket configuration');
  if(data.length!==Object.keys(expected).length) throw new Error('Unexpected staging bucket inventory');
  for(const [id,[size,mimes]] of Object.entries(expected)) {
   const bucket=data.find(b=>b.id===id);
   const normalize=v=>v==null?null:[...v].sort();
   const passed=!!bucket && bucket.public===false && bucket.file_size_limit===size && JSON.stringify(normalize(bucket.allowed_mime_types))===JSON.stringify(normalize(mimes));
   checks.push({bucket:id,status:passed?'PASS':'FAIL'});
   console.log((passed?'PASS: ':'FAIL: ')+id+' baseline configuration');
  }
  status=checks.every(c=>c.status==='PASS')?'PASS':'FAIL';
 } catch(e) {console.error('STOP: '+e.message);}
 const finding='message-attachments baseline has no bucket-level size or MIME allowlist. Parity is not a security approval; application upload controls and bucket hardening need separate review.';
 console.log('FINDING: '+finding);
 const target=path.resolve(root,'../audit/phase2b-staging/phase-e/bucket-config-results.json');
 fs.mkdirSync(path.dirname(target),{recursive:true});
 fs.writeFileSync(target,JSON.stringify({status,checks,findings:[finding],scope:'Read-only staging baseline comparison. No production query or policy changes.'},null,2)+'\n');
 console.log('Bucket baseline comparison: '+status);
 process.exitCode=status==='PASS'?0:1;
})();
