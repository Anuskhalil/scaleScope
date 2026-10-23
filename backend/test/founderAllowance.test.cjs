const {test}=require('node:test');
const assert=require('node:assert/strict');
const db=require('../src/config/supabase');
const billing=require('../src/services/billing.service');
const review=require('../src/services/profileReview.service');
const connection=require('../src/services/connection.service');
test('connection allowance uses atomic RPC and never charges retries in application code',async t=>{
 const previous={from:db.from,rpc:db.rpc,billing:billing.getUserSubscription,review:review.assertApproved};
 let existing=null,result={id:'request',status:'pending',sender_id:'founder',receiver_id:'investor'},rpcError=null,calls=[];
 db.from=table=>({select(){return this;},in:async()=>({data:[{id:'founder',user_type:'early-stage-founder'},{id:'investor',user_type:'investor'}]}),or(){return this;},order(){return this;},limit(){return this;},maybeSingle:async()=>({data:existing})});
 db.rpc=async(name,args)=>{calls.push({name,args});return {data:result,error:rpcError};};
 billing.getUserSubscription=async()=>({role:'early-stage-founder',plan:{code:'free'},entitlements:{connection_requests:5}});
 review.assertApproved=async()=>{};
 try{
  await t.test('new request uses one atomic operation with shared free limit',async()=>{
   assert.equal((await connection.sendRequest('founder','investor','investor_contact','hello')).id,'request');
   assert.equal(calls.at(-1).name,'send_connection_with_allowance');assert.equal(calls.at(-1).args.p_limit,5);
  });
  await t.test('existing pending and accepted requests do not check or consume allowance',async()=>{
   for(const status of ['pending','accepted']){existing={id:'old',status};const before=calls.length;assert.equal((await connection.sendRequest('founder','investor')).id,'old');assert.equal(calls.length,before);}existing=null;
  });
  await t.test('limit returns actionable 402 without sending',async()=>{
   result={limited:true,used:5,limit:5};await assert.rejects(connection.sendRequest('founder','investor'),{status:402,code:'USAGE_LIMIT_REACHED',upgradePath:'/pricing'});
  });
  await t.test('missing migration fails closed instead of unmetered insertion',async()=>{
   rpcError={code:'PGRST202'};await assert.rejects(connection.sendRequest('founder','investor'),{status:503});rpcError=null;
  });
  await t.test('unapproved recipient cannot receive a new request',async()=>{
   review.assertApproved=async()=>{throw Object.assign(new Error('Under review'),{status:403});};const before=calls.length;
   await assert.rejects(connection.sendRequest('founder','investor'),{status:403});assert.equal(calls.length,before);
  });
 }finally{db.from=previous.from;db.rpc=previous.rpc;billing.getUserSubscription=previous.billing;review.assertApproved=previous.review;}
});
