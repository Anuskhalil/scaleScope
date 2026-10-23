// Explicit manual staging API test runner. Logs only test names/statuses, never tokens.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const dotenv = require('dotenv');
const { buildEnvironment } = require('./start-staging.cjs');
const root = path.resolve(__dirname, '..');
const bucket = 'trust-evidence';
const founder = '42fce0f8-b0d3-41a9-b246-2d4a5def266e';
const investor = '3ec91991-f475-4f07-a038-e2a7e1c8b24d';
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jM1sAAAAASUVORK5CYII=', 'base64');
const checks = [];
const cleanup = new Set();
let env;
const runId = crypto.randomUUID();
const prefix = `founders/${founder}/phase-e/${runId}`;
function assert(ok, label) {
  if (!ok) throw new Error(label);
  checks.push({ test: label, status: 'PASS' }); console.log('PASS: '+label);
}
async function call(route, key, token, method='GET', body, type) {
  const headers = { apikey: key };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (type) headers['Content-Type'] = type;
  const res = await fetch(env.SUPABASE_URL+route, { method, headers, body, signal: AbortSignal.timeout(30000) });
  const bytes = Buffer.from(await res.arrayBuffer());
  let json; try { json=JSON.parse(bytes.toString()); } catch { json=null; }
  return { status: res.status, ok: res.ok, json, bytes };
}
const denied = r => [400,401,403,404].includes(r.status);
async function main() {
  env=buildEnvironment(dotenv.parse(fs.readFileSync(path.join(root,'.env.staging'))));
  const input=dotenv.parse(fs.readFileSync(path.join(root,'.env.staging-tests')));
  for (const name of ['STAGING_PUBLIC_KEY','FOUNDER_TEST_PASSWORD','INVESTOR_TEST_PASSWORD']) {
    if (!input[name] || input[name].startsWith('REPLACE_')) throw new Error(`Fill ${name} locally in backend/.env.staging-tests first.`);
  }
  const pub=input.STAGING_PUBLIC_KEY, admin=env.SUPABASE_SERVICE_KEY;
  const tokens={};
  for (const [label,id,email,password] of [
    ['founder',founder,'passport-founder@example.invalid',input.FOUNDER_TEST_PASSWORD],
    ['investor',investor,'passport-investor@example.invalid',input.INVESTOR_TEST_PASSWORD],
  ]) {
    const r=await call('/auth/v1/token?grant_type=password',pub,null,'POST',JSON.stringify({email,password}),'application/json');
    assert(r.status===200 && r.json?.user?.id===id,`${label} staging identity authenticated`);
    tokens[label]=r.json.access_token;
  }
  const config=await call(`/storage/v1/bucket/${bucket}`,admin,admin);
  assert(config.ok && config.json.public===false && config.json.file_size_limit===5242880,'Private bucket and 5MB limit');
  assert(['application/pdf','image/png','image/jpeg'].every(t=>config.json.allowed_mime_types?.includes(t)) && !config.json.allowed_mime_types?.includes('text/html'),'Allowed MIME configuration');
  const object=`${prefix}/fixture.png`;
  cleanup.add(object);
  const uploaded=await call(`/storage/v1/object/${bucket}/${object}`,admin,admin,'POST',png,'image/png');
  assert(uploaded.ok,'Backend service uploads harmless PNG');
  const downloaded=await call(`/storage/v1/object/authenticated/${bucket}/${object}`,admin,admin);
  assert(downloaded.ok && downloaded.bytes.equals(png),'Backend service downloads exact bytes');
  assert(denied(await call(`/storage/v1/object/public/${bucket}/${object}`,pub,null)),'Public object URL denied');
  for (const [label,token] of [['anonymous',null],['owner',tokens.founder],['other-user',tokens.investor]]) {
    const attempted=`${prefix}/${label}.png`; cleanup.add(attempted);
    assert(denied(await call(`/storage/v1/object/${bucket}/${attempted}`,pub,token,'POST',png,'image/png')),`${label} direct upload denied`);
    assert(denied(await call(`/storage/v1/object/authenticated/${bucket}/${object}`,pub,token)),`${label} direct read denied`);
    assert(denied(await call(`/storage/v1/object/${bucket}/${object}`,pub,token,'PUT',Buffer.from('tamper'),'image/png')),`${label} update denied`);
    const removal=await call(`/storage/v1/object/${bucket}`,pub,token,'DELETE',JSON.stringify({prefixes:[object]}),'application/json');
    assert(denied(removal) || (removal.ok && Array.isArray(removal.json) && removal.json.length===0),`${label} delete denied or zero objects removed`);
    const intact=await call(`/storage/v1/object/authenticated/${bucket}/${object}`,admin,admin);
    assert(intact.ok && intact.bytes.equals(png),`${label} cannot change or remove stored bytes`);
  }
  for (const [label,file,type] of [['html',Buffer.from('<html>harmless fixture</html>'),'text/html'],
    ['oversize',Buffer.concat([png,Buffer.alloc(5242881)]),'image/png']]) {
    const name=`${prefix}/${label}`; cleanup.add(name);
    const r=await call(`/storage/v1/object/${bucket}/${name}`,admin,admin,'POST',file,type);
    assert([400,413,415,422].includes(r.status),`${label} upload rejected even for backend`);
  }
}
(async()=>{
 let status='FAIL';
 try { await main(); status='PASS'; }
 catch(error) { console.error('STOP: '+(error.message || 'Storage test failed')); }
 finally {
   let cleaned=true;
   if (env && cleanup.size) {
    try {
     const r=await call(`/storage/v1/object/${bucket}`,env.SUPABASE_SERVICE_KEY,env.SUPABASE_SERVICE_KEY,'DELETE',JSON.stringify({prefixes:[...cleanup]}),'application/json');
     cleaned=r.ok;
     if (cleaned) {
       const listing=await call(`/storage/v1/object/list/${bucket}`,env.SUPABASE_SERVICE_KEY,env.SUPABASE_SERVICE_KEY,
         'POST',JSON.stringify({prefix,limit:100}),'application/json');
       cleaned=listing.ok && Array.isArray(listing.json) && listing.json.length===0;
     }
     if (!cleaned) console.error('Cleanup failed; retry cleanup of this run prefix only.');
    } catch { cleaned=false; console.error('Cleanup request failed.'); }
   }
   if (!cleaned) status='FAIL';
   const report={status,project:'sopklyxvzmungxwgboqs',runId,fixturePrefix:prefix,cleanupSuccessful:cleaned,checks,
    remaining:['Backend HTTP upload/download and magic-byte checks','Passport-private sharing via backend','Reviewer access','Other bucket configuration comparison']};
   const target=path.resolve(root,'../audit/phase2b-staging/phase-e/storage-api-results.json');
   fs.mkdirSync(path.dirname(target),{recursive:true}); fs.writeFileSync(target,JSON.stringify(report,null,2)+'\n');
   console.log(`Storage API tests: ${status}; ${checks.length} checks. Report: audit/phase2b-staging/phase-e/storage-api-results.json`);
   process.exitCode=status==='PASS'?0:1;
 }
})();
