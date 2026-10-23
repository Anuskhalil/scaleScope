const test=require('node:test');
const assert=require('node:assert/strict');
const {createPassportSubmission}=require('../src/services/passportSubmission');
const id='91000000-0000-4000-8000-000000000001';
const input={requestId:id,kind:'startup',statement:'Synthetic product claim for staging',evidenceIds:[id],consent:true};
test('submission derives actor and hash server-side and uses one RPC',async()=>{
 let args;
 const q={select(){return this;},in(){return this;},eq(){return this;},is(){return this;},then(resolve){return Promise.resolve({data:[{id,claim:input.statement}]}).then(resolve);}};
 const result=await createPassportSubmission({from:()=>q,rpc:async(name,p)=>{args=p;return {data:{id,version:1,status:'submitted'}};}})('owner',input);
 assert.equal(args.p_user,'owner');assert.match(args.p_hash,/^[a-f0-9]{64}$/);assert.equal(JSON.stringify(args).includes(input.statement),false);assert.equal(result.status,'submitted');
});
test('forged owner, missing consent and duplicate evidence are rejected before RPC',async()=>{
 const submit=createPassportSubmission({rpc:()=>{throw Error('Unexpected write');}});
 for(const change of [{user_id:'other'},{consent:false},{evidenceIds:[id,id]}]) await assert.rejects(submit('owner',{...input,...change}),{status:400});
});
