const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {spawn}=require('node:child_process');
const dotenv=require('dotenv');
const {createClient}=require('@supabase/supabase-js');
const {buildEnvironment}=require('./start-staging.cjs');
const root=path.resolve(__dirname,'..'),base='http://127.0.0.1:3032';
const founder='42fce0f8-b0d3-41a9-b246-2d4a5def266e';
const reviewer='8acd8892-8651-423c-ab8b-71437492f02b';
const checks=[];let child,db,env,token,reviewToken;
function check(ok,name){if(!ok)throw new Error(name);checks.push(name);console.log('PASS: '+name);}
async function http(route,method='GET',body,auth=token){
 const r=await fetch(base+route,{method,headers:{...(auth?{Authorization:'Bearer '+auth}:{}),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(15000),redirect:'error'});
 const bytes=Buffer.from(await r.arrayBuffer());let json;try{json=JSON.parse(bytes.toString());}catch{}
 return {status:r.status,json,hash:crypto.createHash('sha256').update(bytes).digest('hex')};
}
async function stop(){
 if(!child)return;
 const c=child;child=null;
 if(c.exitCode!==null)return;
 await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(new Error('Temporary backend did not stop')),10000);c.once('exit',()=>{clearTimeout(timer);resolve();});c.kill();});
}
async function start(enabled){
 child=spawn(process.execPath,[path.join(root,'src/app.js')],{cwd:root,env:{...env,PORT:'3032',PASSPORT_WRITES_ENABLED:String(enabled)},stdio:'ignore'});
 for(let i=0;i<50;i++){if(child.exitCode!==null)throw new Error('Temporary backend failed to start');try{const h=await http('/health');if(h.status===200){check(h.json.mode==='isolated-staging'&&h.json.supabaseProject==='sopklyxvzmungxwgboqs'&&h.json.backgroundWorkers===false,'Temporary backend staging identity');return;}}catch{}await new Promise(r=>setTimeout(r,200));}
 throw new Error('Temporary backend health timeout');
}
async function snapshot(){
 const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
 const records={};
 for(const table of ['profile_verification_checks','trust_evidence','verification_audit_history']){
  const result=await db.from(table).select('*',{count:'exact'}).limit(10000);
  if(result.error||result.data.length!==result.count)throw new Error('Snapshot failed or truncated: '+table);
  records[table]=result.data.map(row=>JSON.stringify(canonical(row))).sort();
 }
 return crypto.createHash('sha256').update(JSON.stringify(records)).digest('hex');
}
(async()=>{
 const values=dotenv.parse(fs.readFileSync(path.join(root,'.env.staging')));
 env=buildEnvironment(values);
 check(values.STAGING_TEST_REVIEWER==='true','Synthetic reviewer enabled');
 try{await fetch(base+'/health',{signal:AbortSignal.timeout(1000)});throw new Error('Port 3032 occupied; refusing to use existing service');}catch(e){if(e.message.startsWith('Port'))throw e;}
 const credentials=dotenv.parse(fs.readFileSync(path.join(root,'.env.staging-tests')));
 for(const [role,id]of [['founder',founder],['reviewer',reviewer]]){
  const auth=createClient(env.SUPABASE_URL,credentials.STAGING_PUBLIC_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data,error}=await auth.auth.signInWithPassword({email:'passport-'+role+'@example.invalid',password:credentials[role.toUpperCase()+'_TEST_PASSWORD']});
  check(!error&&data.user?.id===id,role+' authenticated');
  if(role==='founder')token=data.session.access_token;else reviewToken=data.session.access_token;
 }
 db=createClient(env.SUPABASE_URL,env.SUPABASE_SERVICE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 const before=await snapshot();
 await start(true);
 let w=await http('/api/passport/workspace');
 check(w.status===200&&w.json.data.mutationsEnabled===true,'Normal workspace writable');
 const evidence=w.json.data.evidence[0];
 check(!!evidence,'Existing synthetic evidence available');
 const download='/api/trust/evidence/'+evidence.id+'/download';
 const original=await http(download);
 check(original.status===200,'Owner download before pause');
 await stop();await start(false);
 w=await http('/api/passport/workspace');
 check(w.status===200&&w.json.data.mutationsEnabled===false,'Paused workspace readable');
 check((await http('/api/passport/me/summary')).status===200,'Paused owner summary readable');
 const owner=await http(download),review=await http(download,'GET',undefined,reviewToken);
 check(owner.status===200&&owner.hash===original.hash,'Paused owner download unchanged');
 check(review.status===200&&review.hash===original.hash,'Paused authorized reviewer download unchanged');
 check((await http(download,'GET',undefined,null)).status===401,'Paused anonymous download denied');
 for(const route of ['/api/passport/evidence','/api/passport/claims','/api/passport/claims/00000000-0000-4000-8000-000000000099/decision']){
  const r=await http(route,'POST',{});
  check(r.status===503&&r.json?.code==='PASSPORT_READ_ONLY','Paused mutation blocked: '+route);
 }
 check(await snapshot()===before,'Pause attempts preserved claims/evidence/audit');
 await stop();await start(true);
 w=await http('/api/passport/workspace');
 check(w.status===200&&w.json.data.mutationsEnabled===true,'Resumed workspace writable');
 check((await http('/api/passport/claims','POST',{})).status===400,'Resumed request reaches validation without creating claim');
 check(await snapshot()===before,'Resume preserved claims/evidence/audit');
 await stop();
 const report={status:'PASS',checks,scope:'Temporary local backend against hosted synthetic staging; no valid mutations submitted',limitations:['No in-flight request draining test','No production execution','Auth login records may change from test sign-ins']};
 fs.writeFileSync(path.join(root,'../audit/phase2b-staging/phase-g/pause-resume-results.json'),JSON.stringify(report,null,2)+'\n');
 console.log('PASS: rehearsal complete; temporary backend stopped');
})().catch(async e=>{console.error('STOP: '+e.message);try{await stop();}catch{console.error('Temporary backend cleanup requires inspection');}process.exitCode=1;});
