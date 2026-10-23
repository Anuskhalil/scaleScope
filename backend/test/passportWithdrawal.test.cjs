const test=require('node:test'),assert=require('node:assert/strict');
const {createPassportWithdrawal}=require('../src/services/passportWithdrawal');
const id='93000000-0000-4000-8000-000000000001';
function mock(row,error){const calls=[];return {calls,from(){const q={ops:[]};for(const m of ['select','eq','is','update','maybeSingle'])q[m]=(...a)=>{q.ops.push([m,...a]);return q;};q.then=(resolve,reject)=>{calls.push(q.ops);return Promise.resolve(q.ops.some(o=>o[0]==='update')?{data:error?null:{id},error}:{data:row}).then(resolve,reject);};return q;}};}
test('withdrawal requires strict consent, owner and private evidence',async()=>{
 const db=mock({id,owner_id:'owner',passport_private:true});
 for(const body of [{},{confirm:false},{confirm:true,owner_id:'owner'}])await assert.rejects(createPassportWithdrawal(db)('owner',id,body),{status:400});
 assert.equal(db.calls.length,0);
 for(const row of [null,{owner_id:'other',passport_private:true},{owner_id:'owner',passport_private:false}]){
  const d=mock(row);await assert.rejects(createPassportWithdrawal(d)('owner',id,{confirm:true}),{status:404});
  assert.equal(d.calls.length,1);
 }
});
test('withdrawal is a scoped tombstone, not storage deletion',async()=>{
 const db=mock({id,owner_id:'owner',passport_private:true,deleted_at:null});
 assert.deepEqual(await createPassportWithdrawal(db)('owner',id,{confirm:true}),{id,status:'withdrawn'});
 const ops=db.calls[1];
 assert.deepEqual(ops.find(o=>o[0]==='update'),['update',{deleted_at:'now'}]);
 for(const op of [['eq','owner_id','owner'],['eq','passport_private',true],['is','deleted_at',null]])assert(ops.some(o=>JSON.stringify(o)===JSON.stringify(op)));
});
test('repeat withdrawal returns success without another write; database errors propagate',async()=>{
 const db=mock({id,owner_id:'owner',passport_private:true,deleted_at:'2026-01-01'});
 await createPassportWithdrawal(db)('owner',id,{confirm:true});assert.equal(db.calls.length,1);
 const err={code:'P0001'};await assert.rejects(createPassportWithdrawal(mock({id,owner_id:'owner',passport_private:true},err))('owner',id,{confirm:true}),e=>e===err);
});

