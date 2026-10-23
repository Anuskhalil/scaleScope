// Explicit manual staging fixture. Retains a synthetic tombstone; never approves profiles.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const dotenv = require('dotenv');
const { createClient } = require('@supabase/supabase-js');
const { buildEnvironment } = require('./start-staging.cjs');
const root = path.resolve(__dirname, '..');
const ids = {founder:'42fce0f8-b0d3-41a9-b246-2d4a5def266e',investor:'3ec91991-f475-4f07-a038-e2a7e1c8b24d',reviewer:'8acd8892-8651-423c-ab8b-71437492f02b'};
const eid = crypto.randomUUID();
const object = `founders/${ids.founder}/phase-e-passport/${eid}.png`;
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jM1sAAAAASUVORK5CYII=', 'base64');
const checks = [];
const revoked = process.argv.includes('--reviewer-disabled');
const metadata = process.argv.includes('--metadata');
const lifecycle = process.argv.includes('--lifecycle') || metadata;
const kind = metadata ? 'professional' : 'startup';
const withdrawal = process.argv.includes('--withdrawal');
const claimId = crypto.randomUUID();
let baselineClaims;
let db, base, inserted=false, attempted=false, status='FAIL';
function check(ok,label) { if(!ok) throw new Error(label); checks.push({test:label,status:'PASS'}); console.log('PASS: '+label); }
async function http(route,token,method='GET',body) {
  const headers={}; if(token) headers.Authorization='Bearer '+token;
  if(body) headers['Content-Type']='application/json';
  const r=await fetch(base+route,{method,headers,body:body?JSON.stringify(body):undefined,redirect:'error',signal:AbortSignal.timeout(30000)});
  const bytes=Buffer.from(await r.arrayBuffer()); let json; try {json=JSON.parse(bytes.toString());} catch {}
  return {status:r.status,ok:r.ok,bytes,json};
}
async function main() {
  if(withdrawal && (lifecycle || revoked)) throw new Error('Run withdrawal separately');
  if(lifecycle && revoked) throw new Error('Run lifecycle and reviewer-disabled modes separately');
  const values=dotenv.parse(fs.readFileSync(path.join(root,'.env.staging')));
  const env=buildEnvironment(values);
  check(revoked ? values.STAGING_TEST_REVIEWER!=='true' : values.STAGING_TEST_REVIEWER==='true',revoked?'Synthetic reviewer opt-in disabled':'Synthetic reviewer opt-in configured');
  base='http://127.0.0.1:'+env.PORT;
  const health=await http('/health');
  check(health.ok && health.json?.mode==='isolated-staging' && health.json?.supabaseProject==='sopklyxvzmungxwgboqs' && health.json?.backgroundWorkers===false,'Isolated staging target confirmed');
  const input=dotenv.parse(fs.readFileSync(path.join(root,'.env.staging-tests')));
  db=createClient(env.SUPABASE_URL,env.SUPABASE_SERVICE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  const tokens={};
  for(const name of Object.keys(ids)) {
    const password=input[name.toUpperCase()+'_TEST_PASSWORD'];
    if(!password || !input.STAGING_PUBLIC_KEY) throw new Error('Fill local staging '+name+' test credentials');
    const client=createClient(env.SUPABASE_URL,input.STAGING_PUBLIC_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
    const {data,error}=await client.auth.signInWithPassword({email:`passport-${name}@example.invalid`,password});
    check(!error && data.user?.id===ids[name],name+' identity authenticated');
    tokens[name]=data.session.access_token;
  }
  check((await http('/api/trust/review-queue',tokens.reviewer)).status===(revoked?403:200),revoked?'Former reviewer cannot open review queue':'Authorized reviewer can open review queue');
  check((await http('/api/trust/review-queue',tokens.investor)).status===403,'Ordinary investor cannot open review queue');
  if(withdrawal || metadata) {
    const workspace=await http('/api/passport/workspace',tokens.founder);
    check(workspace.status===200 && workspace.json?.data?.reviewFeedbackEnabled===true && workspace.json?.data?.mutationsEnabled===true,'Hosted review metadata and writes enabled');
  }
  if(lifecycle) {
    const summary=await http('/api/passport/me/summary',tokens.founder);
    check(summary.status===200 && Array.isArray(summary.json?.data?.claims),'Founder safe-summary endpoint available');
    baselineClaims=summary.json.data.claims;
    const active=await db.from('profile_verification_checks').select('id').eq('user_id',ids.founder).eq('passport_claim',true).eq('target_key','passport.'+kind).in('passport_state',['submitted','in_review','supported','needs_changes','rejected']);
    check(!active.error && active.data.length===0,'No existing live '+kind+' claim will be superseded');
  }
  attempted=true;
  const uploaded=await db.storage.from('trust-evidence').upload(object,png,{contentType:'image/png',upsert:false});
  check(!uploaded.error,'Synthetic private file uploaded');
  const created=await db.from('trust_evidence').insert({id:eid,owner_id:ids.founder,category:'product',title:'Phase E private synthetic '+eid,claim:'Synthetic fixture only, not authentic product proof.',object_path:object,sha256:crypto.createHash('sha256').update(png).digest('hex'),byte_size:png.length,mime_type:'image/png',passport_private:true});
  check(!created.error,'Private evidence fixture inserted'); inserted=true;
  const route='/api/trust/evidence/'+eid;
  for(const name of (revoked?['founder']:['founder','reviewer'])) {
    const r=await http(route+'/download',tokens[name]);
    check(r.ok && r.bytes.equals(png),name+' can download private evidence');
  }
  if(revoked) check((await http(route+'/download',tokens.reviewer)).status===403,'Former reviewer cannot download live private evidence');
  check((await http(route+'/download',tokens.investor)).status===403,'Connected investor cannot download private evidence');
  check((await http(route+'/download')).status===401,'Anonymous private download denied');
  check((await http(route+'/share',tokens.founder,'POST',{recipientId:ids.investor,days:1})).status===403,'Owner cannot share Passport-private evidence');
  const grants=await db.from('evidence_grants').select('evidence_id').eq('evidence_id',eid);
  check(!grants.error && grants.data.length===0,'Denied sharing created no grant');
  check((await http(route,tokens.founder,'DELETE')).status===409,'Legacy deletion cannot remove Passport-private evidence');
  const intact=await http(route+'/download',tokens.founder);
  check(intact.ok && intact.bytes.equals(png),'Denied deletion preserved private bytes');
  if(lifecycle) {
    const payload={requestId:claimId,kind,statement:'Synthetic fixture only, not authentic product proof.',evidenceIds:[eid],consent:true};
    check((await http('/api/passport/claims',null,'POST',payload)).status===401,'Anonymous claim submission denied');
    check((await http('/api/passport/claims',tokens.founder,'POST',{...payload,user_id:ids.investor})).status===400,'Forged claimant rejected');
    check((await http('/api/passport/claims',tokens.founder,'POST',{...payload,consent:false})).status===400,'Missing consent rejected');
    const submit=await http('/api/passport/claims',tokens.founder,'POST',payload);
    const claim=submit.json?.data;
    check(submit.status===201 && claim?.id===claimId && claim.status==='submitted' && Number.isInteger(claim.version),'Owner submits claim through atomic backend RPC');
    for(const name of ['founder','reviewer']) {
      const context=await http('/api/passport/claims/'+claimId+'/context',tokens[name]);
      check(context.status===200 && context.json?.data?.statement===payload.statement && context.json.data.evidence.some(e=>e.id===eid),name+' sees hash-bound private review context');
      check(context.json.data.evidence.every(e=>Object.keys(e).sort().join(',')==='byteSize,category,id,mimeType,title'),'Context omits storage path and provenance hashes for '+name);
    }
    check((await http('/api/passport/claims/'+claimId+'/context',tokens.investor)).status===404,'Unrelated investor cannot read private claim context');
    const retry=await http('/api/passport/claims',tokens.founder,'POST',payload);
    check(retry.status===201 && retry.json?.data?.id===claimId && retry.json.data.version===claim.version,'Same request retry does not create a new version');
    const pending=await http('/api/passport/me/summary',tokens.founder);
    check(pending.status===200 && JSON.stringify(pending.json?.data?.claims)===JSON.stringify(baselineClaims),'Pending claim is absent from supported summary');
    const decision='/api/passport/claims/'+claimId+'/decision';
    check((await http(decision,tokens.investor,'POST',{version:claim.version,action:'in_review'})).status===403,'Ordinary investor cannot review claim');
    check((await http(decision,tokens.reviewer,'POST',{version:claim.version,action:'supported'})).status===409,'Reviewer cannot skip in-review state');
    const reviewing=await http(decision,tokens.reviewer,'POST',{version:claim.version,action:'in_review'});
    check(reviewing.status===200 && reviewing.json?.data?.status==='in_review','Authorized reviewer starts review');
    check((await http(decision,tokens.reviewer,'POST',{version:claim.version+1,action:'supported'})).status===409,'Stale decision version rejected');
    if(metadata) check((await http(decision,tokens.reviewer,'POST',{version:claim.version,action:'rejected'})).status===400,'Negative review requires feedback');
    const reason='Synthetic staging review only; not proof of authenticity.';
    const supported=await http(decision,tokens.reviewer,'POST',{version:claim.version,action:'supported',...(metadata?{reason}:{})});
    if(supported.status!==200) console.error('Decision HTTP '+supported.status+': '+String(supported.json?.error||'No API error message').slice(0,240));
    check(supported.status===200 && supported.json?.data?.status==='supported','Reviewer supports synthetic claim');
    if(metadata) {
      const context=await http('/api/passport/claims/'+claimId+'/context',tokens.founder);
      check(context.status===200 && context.json?.data?.reason===reason,'Owner receives saved review feedback');
      const c=context.json.data;
      check(Date.parse(c.expiresAt)-Date.parse(c.reviewedAt)===30*86400000,'Database assigns exact 30-day expiry');
    }
    check((await http(decision,tokens.reviewer,'POST',{version:claim.version,action:'supported'})).status===409,'Repeated decision cannot overwrite prior review');
    const summary=await http('/api/passport/me/summary',tokens.founder);
    const claims=summary.json?.data?.claims;
    check(summary.status===200 && claims?.length===baselineClaims.length+1 && claims.some(c=>c.kind===kind&&c.status==='supported'),'Supported claim appears in owner summary');
    check(summary.json.data.publicBadgesEnabled===false && claims.every(c=>Object.keys(c).sort().join(',')==='expiresAt,kind,reviewedAt,status'),'Summary exposes only safe allowlisted fields; public badges stay disabled');
  }
  if(withdrawal) {
    const endpoint='/api/passport/evidence/'+eid+'/withdraw';
    check((await http(endpoint,null,'POST',{confirm:true})).status===401,'Anonymous withdrawal denied');
    check((await http(endpoint,tokens.investor,'POST',{confirm:true})).status===404,'Other-user withdrawal denied');
    check((await http(endpoint,tokens.founder,'POST',{confirm:false})).status===400,'Withdrawal requires explicit confirmation');
    check((await http(route+'/download',tokens.founder)).bytes.equals(png),'Denied withdrawals preserve bytes');
    const withdrawn=await http(endpoint,tokens.founder,'POST',{confirm:true});
    check(withdrawn.status===200 && withdrawn.json?.data?.status==='withdrawn','Owner withdraws via backend');
    check((await http(endpoint,tokens.founder,'POST',{confirm:true})).status===200,'Withdrawal retry is idempotent');
  }
  const tombstone=withdrawal
    ? await db.from('trust_evidence').select('id,deleted_at').eq('id',eid)
    : await db.from('trust_evidence').update({deleted_at:new Date().toISOString()}).eq('id',eid).select('id,deleted_at');
  check(!tombstone.error && tombstone.data?.length===1 && tombstone.data[0].deleted_at,'Synthetic evidence tombstoned');
  if(lifecycle) {
    const summary=await http('/api/passport/me/summary',tokens.founder);
    check(summary.status===200 && JSON.stringify(summary.json?.data?.claims)===JSON.stringify(baselineClaims),'Tombstone removes supported claim from summary');
    const row=await db.from('profile_verification_checks').select('passport_state').eq('id',claimId).single();
    check(!row.error && row.data.passport_state==='stale','Linked claim becomes stale');
    const audit=await db.from('verification_audit_history').select('event,new_state').eq('check_id',claimId);
    check(!audit.error && ['submitted','in_review','supported','stale'].every(state=>audit.data.some(a=>a.new_state===state)) && audit.data.some(a=>a.event==='evidence_linked'),'Lifecycle transitions and evidence link retained in audit');
  }
  for(const name of ['founder','reviewer','investor']) check((await http(route+'/download',tokens[name])).status===404,name+' cannot download tombstoned evidence');
  status='PASS';
}
(async()=>{
  let cleanupSuccessful=true;
  try {await main();} catch(e) {console.error('STOP: '+e.message);}
  finally {
    try {
      if(inserted) {
        const row=await db.from('trust_evidence').select('deleted_at').eq('id',eid).single();
        if(row.error) throw new Error('Cleanup lookup failed');
        if(!row.data.deleted_at) {
          const r=await db.from('trust_evidence').update({deleted_at:new Date().toISOString()}).eq('id',eid);
          if(r.error) throw new Error('Cleanup tombstone failed');
        }
      }
      if(attempted) {
        const r=await db.storage.from('trust-evidence').remove([object]);
        if(r.error) throw new Error('Cleanup removal failed');
        const folder=object.slice(0,object.lastIndexOf('/'));
        const list=await db.storage.from('trust-evidence').list(folder,{search:eid});
        if(list.error || list.data.some(x=>x.name===eid+'.png')) throw new Error('Cleanup verification failed');
      }
    } catch {cleanupSuccessful=false; status='FAIL'; console.error('Cleanup incomplete; inspect this run fixture only.');}
    const target=path.resolve(root,'../audit/phase2b-staging/'+(metadata?'release-patch/metadata-http-results.json':withdrawal?'release-patch/withdrawal-http-results.json':lifecycle?'phase-f/passport-lifecycle-results.json':'phase-e/'+(revoked?'passport-reviewer-disabled-results.json':'passport-http-results.json')));
    fs.mkdirSync(path.dirname(target),{recursive:true});
    fs.writeFileSync(target,JSON.stringify({status,checks,cleanupSuccessful,evidenceId:eid,claimId:lifecycle?claimId:undefined,objectPath:object,retainedSyntheticTombstone:inserted,remaining:lifecycle?['Complete Phase F regression and review-context validation']:['Other bucket configuration comparison','Reviewer permission removal and re-test'],note:lifecycle?'Synthetic claim decision/audit retained. Evidence file removed; account admission may return to pending. No migration or production change.':'No profile approval, claim decision, schema migration or production change.'},null,2)+'\n');
    console.log(`Passport HTTP tests: ${status}; ${checks.length} checks. Cleanup: ${cleanupSuccessful?'PASS':'FAIL'}`);
    process.exitCode=status==='PASS'?0:1;
  }
})();
