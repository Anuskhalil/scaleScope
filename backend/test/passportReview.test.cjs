const test=require('node:test');
const assert=require('node:assert/strict');
const {createPassportReview:factory}=require('../src/services/passportReview');
const createPassportReview=(db,admin,clock)=>factory(db,admin,clock,async()=>({statement:'Synthetic context'}));
const actor='00000000-0000-4000-8000-000000000001';
const owner='00000000-0000-4000-8000-000000000002';
test('review feedback mode requires correction reasons and delegates both timestamps to database',async()=>{
 const previous=process.env.PASSPORT_REVIEW_METADATA_ENABLED;process.env.PASSPORT_REVIEW_METADATA_ENABLED='true';
 try{
  await assert.rejects(createPassportReview(mock(),async()=>true)(actor,id,{version:1,action:'rejected'}),{status:400});
  const db=mock();
  await createPassportReview(db,async()=>true)(actor,id,{version:1,action:'needs_changes',reason:'Please supply a dated document.'});
  const patch=db.calls.find(q=>q.ops.some(o=>o[0]==='update')).ops.find(o=>o[0]==='update')[1];
  assert.equal(patch.decision_reason,'Please supply a dated document.');
  assert.equal(patch.decided_at,null);assert.equal(patch.expires_at,null);
 }finally{if(previous===undefined)delete process.env.PASSPORT_REVIEW_METADATA_ENABLED;else process.env.PASSPORT_REVIEW_METADATA_ENABLED=previous;}
});

const id='00000000-0000-4000-8000-000000000003';
function mock(row={id,user_id:owner,claim_version:1,passport_state:'in_review',passport_claim:true},write={data:{id,claim_version:1,passport_state:'supported'}}) {
 const calls=[];
 return {calls,from(table){const q={table,ops:[]};for(const method of ['select','eq','is','maybeSingle','update'])q[method]=(...a)=>{q.ops.push([method,...a]);return q;};q.then=(resolve,reject)=>{calls.push(q);return Promise.resolve(table==='profiles'?{data:{id:actor}}:q.ops.some(x=>x[0]==='update')?write:{data:row}).then(resolve,reject);};return q;}};
}
test('ordinary accounts cannot review or issue writes',async()=>{
 const db=mock();await assert.rejects(createPassportReview(db,async()=>false)(actor,id,{version:1,action:'supported'}),{status:403});assert.equal(db.calls.length,0);
});
test('self review and stale versions are denied',async()=>{
 for(const [row,status] of [[{user_id:actor,claim_version:1,passport_state:'in_review'},403],[{user_id:owner,claim_version:2,passport_state:'in_review'},409]]) {
  const db=mock(row);await assert.rejects(createPassportReview(db,async()=>true)(actor,id,{version:1,action:'supported'}),{status});assert(!db.calls.some(q=>q.ops.some(o=>o[0]==='update')));
 }
});
test('caller cannot forge reviewer, expiry or authoritative source',async()=>{
 for(const extra of [{decision_actor:owner},{source_kind:'oauth_control'},{expires_at:'2099-01-01'}]) await assert.rejects(createPassportReview(mock(),async()=>true)(actor,id,{version:1,action:'supported',...extra}),{status:400});
});
test('decision is a conditional single update with server-derived actor and expiry',async()=>{
 const db=mock();const result=await createPassportReview(db,async()=>true,()=>new Date('2026-10-09T12:00:00Z'))(actor,id,{version:1,action:'supported'});
 const q=db.calls.find(q=>q.ops.some(o=>o[0]==='update'));const patch=q.ops.find(o=>o[0]==='update')[1];
 assert.equal(patch.decision_actor,actor);assert.equal(patch.source_kind,'manual_evidence');assert.equal(patch.decided_at,'now');assert.equal(patch.expires_at,'2026-11-08T12:00:00.000Z');
 assert(q.ops.some(o=>o[0]==='eq'&&o[1]==='passport_state'&&o[2]==='in_review'));assert.deepEqual(result,{id,version:1,status:'supported'});
});
test('concurrent decisions and trigger failures do not report success or leak SQL errors',async()=>{
 for(const write of [{data:null},{error:{code:'P0001',message:'private database details'}}]) await assert.rejects(createPassportReview(mock(undefined,write),async()=>true)(actor,id,{version:1,action:'supported'}),e=>e.status===409&&!e.message.includes('private database'));
});
test('starting review does not fabricate decision metadata',async()=>{
 const db=mock({user_id:owner,claim_version:1,passport_state:'submitted'});
 await createPassportReview(db,async()=>true)(actor,id,{version:1,action:'in_review'});
 assert.deepEqual(db.calls.find(q=>q.ops.some(o=>o[0]==='update')).ops.find(o=>o[0]==='update')[1],{passport_state:'in_review'});
});
