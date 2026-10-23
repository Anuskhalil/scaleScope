// Manual staging-only HTTP checks. Never log credentials or authentication responses.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const dotenv = require('dotenv');
const { buildEnvironment } = require('./start-staging.cjs');
const root = path.resolve(__dirname, '..');
const founder = '42fce0f8-b0d3-41a9-b246-2d4a5def266e';
const investor = '3ec91991-f475-4f07-a038-e2a7e1c8b24d';
const runId = crypto.randomUUID();
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jM1sAAAAASUVORK5CYII=', 'base64');
const checks = [];
const fixtures = new Set();
let env, base, token, status = 'FAIL';
function check(ok, name) {
  if (!ok) throw new Error(name);
  checks.push({test:name,status:'PASS'}); console.log('PASS: '+name);
}
async function request(url, bearer, method='GET', body, extra={}) {
  const headers = {...extra};
  if (bearer) headers.Authorization = 'Bearer '+bearer;
  const response = await fetch(url,{method,headers,body,redirect:'error',signal:AbortSignal.timeout(30000)});
  const bytes = Buffer.from(await response.arrayBuffer());
  let json; try { json=JSON.parse(bytes.toString()); } catch { json=null; }
  return {status:response.status,ok:response.ok,headers:response.headers,bytes,json};
}
const api = (route, bearer, method, body, headers) => request(base+'/api/trust'+route,bearer,method,body,headers);
async function upload(bytes) {
  const result = await api('/evidence',token,'POST',bytes,{
    'Content-Type':'image/png',
    'x-evidence-metadata':encodeURIComponent(JSON.stringify({category:'product',title:'Phase E synthetic '+runId,claim:'Harmless synthetic fixture, not real proof.'}))
  });
  if(result.json?.data?.id) fixtures.add(result.json.data.id);
  return result;
}
async function main() {
  env=buildEnvironment(dotenv.parse(fs.readFileSync(path.join(root,'.env.staging'))));
  base='http://127.0.0.1:'+env.PORT;
  const health=await request(base+'/health');
  check(health.ok && health.json?.mode==='isolated-staging' && health.json?.supabaseProject==='sopklyxvzmungxwgboqs' && health.json?.backgroundWorkers===false,'Isolated staging backend target confirmed');
  const input=dotenv.parse(fs.readFileSync(path.join(root,'.env.staging-tests')));
  const tokens={};
  for(const [name,id] of [['founder',founder],['investor',investor]]) {
    const password=input[name.toUpperCase()+'_TEST_PASSWORD'];
    if(!password || !input.STAGING_PUBLIC_KEY) throw new Error('Missing local staging test credentials');
    const login=await request(env.SUPABASE_URL+'/auth/v1/token?grant_type=password',null,'POST',JSON.stringify({email:'passport-'+name+'@example.invalid',password}),{apikey:input.STAGING_PUBLIC_KEY,'Content-Type':'application/json'});
    check(login.status===200 && login.json?.user?.id===id,name+' identity authenticated');
    tokens[name]=login.json.access_token;
  }
  token=tokens.founder;
  check((await api('/evidence')).status===401,'Anonymous backend access denied');
  check((await api('/review-queue',tokens.investor)).status===403,'Ordinary investor cannot access reviewer queue');
  const bad=await upload(Buffer.from('<html>Not a PNG</html>'));
  check(bad.status===400,'Fake PNG rejected by backend signature check');
  const created=await upload(png);
  check(created.ok && fixtures.size===1,'Owner uploads synthetic evidence through backend');
  const id=created.json.data.id;
  const downloaded=await api('/evidence/'+id+'/download',token);
  check(downloaded.ok && downloaded.bytes.equals(png),'Owner downloads exact original bytes');
  check(downloaded.headers.get('cache-control')?.includes('no-store') && downloaded.headers.get('x-content-type-options')==='nosniff' && downloaded.headers.get('content-disposition')?.startsWith('attachment'),'Download privacy headers present');
  check((await api('/evidence/'+id+'/download',tokens.investor)).status===403,'Connected investor cannot read unshared evidence');
  const own=await api('/evidence',token);
  const item=own.json?.data?.own?.find(e=>e.id===id);
  check(own.ok && item && !('object_path' in item) && !('sha256' in item),'Owner list omits internal storage path and hash');
  const shared=await api('/evidence/'+id+'/share',token,'POST',JSON.stringify({recipientId:investor,days:1}),{'Content-Type':'application/json'});
  check(shared.ok,'Owner explicitly shares legacy evidence with connected investor');
  const allowed=await api('/evidence/'+id+'/download',tokens.investor);
  check(allowed.ok && allowed.bytes.equals(png),'Granted investor downloads exact bytes');
  check((await api('/evidence/'+id, tokens.investor,'DELETE')).status===404,'Recipient cannot delete owner evidence');
  check((await api('/evidence/'+id+'/share/'+investor,token,'DELETE')).ok,'Owner revokes sharing');
  check((await api('/evidence/'+id+'/download',tokens.investor)).status===403,'Revoked recipient loses download access');
  status='PASS';
}
(async()=>{
  let cleanupSuccessful=true;
  try { await main(); } catch(error) { console.error('STOP: '+error.message); }
  finally {
    for(const id of fixtures) {
      try {
        const removed=await api('/evidence/'+id,token,'DELETE');
        const missing=await api('/evidence/'+id+'/download',token);
        if(!removed.ok || missing.status!==404) cleanupSuccessful=false;
      } catch { cleanupSuccessful=false; }
    }
    if(!cleanupSuccessful) status='FAIL';
    const target=path.resolve(root,'../audit/phase2b-staging/phase-e/backend-evidence-results.json');
    fs.mkdirSync(path.dirname(target),{recursive:true});
    fs.writeFileSync(target,JSON.stringify({status,runId,checks,cleanupSuccessful,fixtureIds:[...fixtures],remaining:['Authorized reviewer HTTP access','Passport-private evidence HTTP restrictions','Other bucket comparison'],note:'Synthetic evidence may leave review/audit history. No account admission decision is changed by this runner.'},null,2)+'\n');
    console.log('Backend evidence tests: '+status+'; '+checks.length+' checks. Cleanup: '+(cleanupSuccessful?'PASS':'FAIL'));
    console.log('Report: audit/phase2b-staging/phase-e/backend-evidence-results.json');
    process.exitCode=status==='PASS'?0:1;
  }
})();
