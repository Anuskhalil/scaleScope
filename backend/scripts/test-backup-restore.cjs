const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {spawnSync}=require('node:child_process');
const root=path.resolve(process.argv[2]||'');
if(!process.argv[2]) throw new Error('Private backup directory required');
const name='scalescope-restore-'+crypto.randomUUID().slice(0,8);
const report={status:'INCOMPLETE',network:'none',ports:[],checks:[],limitations:['Not a complete Supabase application/Auth service restore','No production or staging writes']};
const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
let started=false;
function docker(args,input){
 const r=spawnSync('docker',args,{input,encoding:'utf8',timeout:180000,maxBuffer:16*1024*1024});
 if(r.status!==0){fs.writeFileSync(path.join(root,'restore-error-private.log'),String(r.stderr||r.error||'Docker failed'));throw new Error('Local restore command failed; details retained privately');}
 return r.stdout;
}
async function main(){
 try{
  const dirs=fs.readdirSync(root).filter(n=>n.startsWith('storage-')).sort();
  const storage=path.join(root,dirs.at(-1)||'missing');
  const manifest=JSON.parse(fs.readFileSync(path.join(storage,'manifest.json')));
  if(manifest.status!=='COPY_VERIFIED_NOT_RESTORE_TESTED') throw new Error('Storage backup incomplete');
  for(const f of manifest.databaseFiles) if(digest(fs.readFileSync(path.join(root,f.file)))!==f.sha256)throw new Error('Database export changed');
  for(const f of manifest.objects){
   if(path.basename(f.file)!==f.file)throw new Error('Invalid local object filename');
   const b=fs.readFileSync(path.join(storage,f.file));
   if(b.length!==f.bytes||digest(b)!==f.sha256)throw new Error('Storage bytes changed');
  }
  report.checks.push('Database export hashes match','All '+manifest.objects.length+' Storage object hashes match');
  docker(['run','-d','--name',name,'--network','none','--tmpfs','/var/lib/postgresql/data','-e','POSTGRES_PASSWORD=disposable-local-only','public.ecr.aws/supabase/postgres:17.11.0.004']);started=true;
  let ready=false;
  for(let i=0;i<60;i++){
   if(spawnSync('docker',['exec',name,'pg_isready','-U','postgres'],{timeout:5000}).status===0){ready=true;break;}
   await new Promise(r=>setTimeout(r,1000));
  }
  if(!ready)throw new Error('Local database not ready');
  await new Promise(r=>setTimeout(r,5000));
  const psql=['exec','-i',name,'psql','-X','-U','supabase_admin','-d','postgres','-v','ON_ERROR_STOP=1'];
  const managed=fs.readFileSync(path.join(root,'managed-schema.sql'),'utf8');
  report.managedSchemaSha256=digest(Buffer.from(managed));
  const trigger='CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();';
  if(managed.split(trigger).length!==2)throw new Error('Unexpected managed signup trigger definition');
  // This fixed Docker exec target is disposable and has no network or exposed ports.
  docker(psql,'DROP SCHEMA auth CASCADE; DROP SCHEMA storage CASCADE;');
  report.attemptedFile='managed-schema.sql';
  docker(psql,managed.replace(trigger,''));
  report.checks.push('Exact managed schema restored; signup trigger deferred');
  for(const file of ['roles.sql','schema.sql','data.sql']){
   report.attemptedFile=file;
   const sql=fs.readFileSync(path.join(root,file),'utf8');
   docker(psql,file==='data.sql'?'BEGIN; SET LOCAL session_replication_role=replica;\n'+sql+'\nCOMMIT;':sql);
   if(file==='schema.sql')docker(psql,trigger);
   report.checks.push(file+' restored without SQL errors');
  }
  const data=fs.readFileSync(path.join(root,'data.sql'),'utf8');
  const counts=[];
  let current=null;
  for(const line of data.split(/\r?\n/)){
   const start=/^COPY "([^"]+)"\."([^"]+)" .* FROM stdin;$/.exec(line);
   if(start){current={schema:start[1],table:start[2],count:0};continue;}
   if(current && line==='\\.'){counts.push(current);current=null;continue;}
   if(current)current.count++;
  }
  if(current||counts.length===0)throw new Error('Could not validate COPY row counts');
  for(const entry of counts){
   const quote=s=>'"'+s.replaceAll('"','""')+'"';
   const actual=Number(docker([...psql,'-At'],`SELECT count(*) FROM ${quote(entry.schema)}.${quote(entry.table)};`).trim());
   if(actual!==entry.count)throw new Error('Restored row count mismatch');
  }
  report.checks.push('All '+counts.length+' exported COPY table row counts match');
  const stored=JSON.parse(docker([...psql,'-At'],"SELECT coalesce(json_agg(json_build_object('bucket',bucket_id,'key',name)), '[]'::json) FROM storage.objects;").trim());
  const keys=rows=>JSON.stringify(rows.map(x=>[x.bucket,x.key]).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))));
  if(keys(stored)!==keys(manifest.objects))throw new Error('Database Storage paths and file backup differ');
  report.checks.push('Restored Storage object paths match all backed-up files');
  if(process.argv.includes('--migration-rehearsal')){
   const sql=fs.readFileSync(path.resolve(__dirname,'../../audit/production-release/01_LOCAL_BACKUP_REHEARSAL.sql'),'utf8');
   const result=docker(psql,"SET scalescope.restore_rehearsal='isolated-local'; SET ROLE postgres;\n"+sql);
   if(!result.includes('PRODUCTION_BACKUP_MIGRATION_REHEARSAL_PASS_ROLLED_BACK'))throw new Error('Migration rehearsal marker missing');
   const unchanged=docker([...psql,'-At'],"SELECT to_regclass('public.verification_audit_history') IS NULL AND to_regclass('public.evidence_storage_quotas') IS NULL;").trim();
   if(unchanged!=='t')throw new Error('Rehearsal rollback failed');
   report.checks.push('Combined migration and RPC postflight pass on restored production backup; rolled back');
  }
  if(process.argv.includes('--release-candidate')){
   const folder=path.resolve(__dirname,'../../audit/production-release');
   docker(psql,'SET ROLE postgres;\n'+fs.readFileSync(path.join(folder,'02_PREFLIGHT_READ_ONLY.sql'),'utf8'));
   const applied=docker(psql,"SET ROLE postgres; SET scalescope.production_release_confirmation='gqkjvxcyetesvqmjkuus';\n"+fs.readFileSync(path.join(folder,'03_APPLY_CANDIDATE_NOT_YET_APPROVED.sql'),'utf8'));
   if(!applied.includes('PRODUCTION_PASSPORT_APPLIED'))throw new Error('Candidate apply marker missing');
   const verified=docker(psql,'SET ROLE postgres;\n'+fs.readFileSync(path.join(folder,'04_POSTFLIGHT_READ_ONLY.sql'),'utf8'));
   if(!verified.includes('PRODUCTION_POSTFLIGHT_PASS'))throw new Error('Postflight marker missing');
   report.checks.push('Exact production candidate preflight/apply/postflight passed on disposable restored backup only');
  }
  report.status='SQL_RESTORE_PASS_APPLICATION_NOT_TESTED';
 }catch(e){report.status='BLOCKED';report.error=e.message;}
 finally{
  if(started){const r=spawnSync('docker',['rm','-f','-v',name],{encoding:'utf8',timeout:30000});report.containerRemoved=r.status===0;}
  report.completedAt=new Date().toISOString();
  fs.writeFileSync(path.join(root,'restore-check-results.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
  process.exitCode=report.status==='BLOCKED'||report.containerRemoved===false?1:0;
 }
}
main();
