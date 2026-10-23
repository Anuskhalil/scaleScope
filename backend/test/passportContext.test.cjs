const test=require('node:test');
const assert=require('node:assert/strict');
const {createPassportContext,hashStatement}=require('../src/services/passportContext');
const {createPassportReview}=require('../src/services/passportReview');
const id='91000000-0000-4000-8000-000000000001';
const statement='Synthetic fixture only, not authentic product proof.';
function db(overrides={}) {
 const tables={profile_verification_checks:{id,user_id:'owner',claim_kind:'startup',claim_version:1,passport_state:'in_review',claim_value_hash:hashStatement('startup',statement)},profile_verification_evidence:[{evidence_id:id}],trust_evidence:[{id,owner_id:'owner',passport_private:true,deleted_at:null,claim:statement,title:'Synthetic',category:'product',mime_type:'image/png',byte_size:12}],profiles:{id:'reviewer'},...overrides};
 return {from(table){const q={};for(const m of ['select','eq','in','is','maybeSingle'])q[m]=()=>q;q.then=resolve=>Promise.resolve({data:tables[table]}).then(resolve);return q;}};
}
test('owner and reviewer obtain bound statement without storage provenance',async()=>{
 for(const actor of ['owner','reviewer']) {
  const result=await createPassportContext(db(),async()=>true)(actor,id);
  assert.equal(result.statement,statement);
  assert.deepEqual(Object.keys(result.evidence[0]).sort(),['byteSize','category','id','mimeType','title']);
  assert(!JSON.stringify(result).includes('claim_value_hash'));
 }
});
test('unrelated account cannot access claim context',async()=>{
 await assert.rejects(createPassportContext(db(),async()=>false)('outsider',id),{status:404});
});
test('mismatched statement and tombstones fail closed',async()=>{
 for(const change of [{claim:'Different statement'},{deleted_at:'2026-10-09'}]) {
  const evidence={id,owner_id:'owner',passport_private:true,claim:statement,...change};
  await assert.rejects(createPassportContext(db({trust_evidence:[evidence]}),async()=>true)('reviewer',id),{status:409});
 }
});
test('review service refuses decisions without reconstructible context',async()=>{
 await assert.rejects(createPassportReview(db({trust_evidence:[]}),async()=>true)('reviewer',id,{version:1,action:'supported'}),{status:409});
});
