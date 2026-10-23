const test=require('node:test');
const assert=require('node:assert/strict');
const {safeClaim,createPassportSummary}=require('../src/services/passportSummary');
const now=Date.parse('2026-10-08T12:00:00Z');
const row={id:'private-id',passport_claim:true,passport_state:'supported',claim_kind:'startup',decided_at:'2026-10-07T12:00:00Z',expires_at:'2026-11-08T12:00:00Z',object_path:'private',claim_value_hash:'secret',decision_actor:'reviewer',ai_report:{secret:true}};
test('safe claim uses an exact allowlist, no raw evidence or overall score',()=>{
 assert.deepEqual(Object.keys(safeClaim(row,true,now)),['kind','status','reviewedAt','expiresAt']);
});
test('legacy flags, expired, invalidated and unknown claims do not become badges',()=>{
 for(const change of [{passport_claim:false,is_verified:true},{passport_state:'stale'},{expires_at:'2020-01-01'},{claim_kind:'invented'},{decided_at:'2099-01-01'}]) assert.equal(safeClaim({...row,...change},true,now),null);
 assert.equal(safeClaim(row,false,now),null);
 assert.equal(safeClaim(row,'true',now),null);
});
function fake(rpcResult) {
 const calls=[];
 const q={};
 for(const method of ['select','eq','order','limit']) q[method]=(...args)=>{calls.push([method,...args]);return q;};
 q.then=resolve=>Promise.resolve({data:[row]}).then(resolve);
 return {calls,from:()=>q,rpc:async()=>rpcResult};
}
test('owner summary scopes query and fails closed on predicate errors',async()=>{
 const db=fake({error:new Error('unavailable')});
 await assert.rejects(createPassportSummary(db)('owner'),/unavailable/);
 assert(db.calls.some(c=>c[0]==='eq'&&c[1]==='user_id'&&c[2]==='owner'));
 assert(!db.calls.find(c=>c[0]==='select')[1].includes('*'));
});
test('non-current evidence never appears in owner summary',async()=>{
 const summary=await createPassportSummary(fake({data:false}))('owner');
 assert.deepEqual(summary,{claims:[],scope:'claim-specific',publicBadgesEnabled:false});
});
