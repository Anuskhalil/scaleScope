const test=require('node:test');
const assert=require('node:assert/strict');
const express=require('express');
process.env.ADMIN_REVIEW_EMAILS='admin@example.com';
const config=require.resolve('../src/config/supabase');
require.cache[config]={id:config,filename:config,loaded:true,exports:{auth:{getUser:async token=>({data:{user:token==='admin'?{id:'admin',email:'admin@example.com',email_confirmed_at:'yes'}:token==='unconfirmed'?{id:'user',email:'admin@example.com'}:token==='normal'?{id:'user',email:'normal@example.com',email_confirmed_at:'yes'}:null},error:null})}}};
const service=require.resolve('../src/services/profileReview.service');
let queueCalls=0;
require.cache[service]={id:service,filename:service,loaded:true,exports:{own:async()=>({status:'pending'}),queue:async()=>{queueCalls++;return[];}}};
test('/admin backend rejects missing, unauthorized and unverified identities',async()=>{
 const app=express();app.use('/api/profile-review',require('../src/routes/profileReview.routes'));
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port+'/api/profile-review';
 try{
  assert.equal((await fetch(base+'/queue')).status,401);
  for(const token of ['normal','unconfirmed'])assert.equal((await fetch(base+'/queue',{headers:{Authorization:'Bearer '+token}})).status,403);
  assert.equal(queueCalls,0);
  assert.equal((await fetch(base+'/queue',{headers:{Authorization:'Bearer admin'}})).status,200);
  assert.equal(queueCalls,1);
  const own=await(await fetch(base+'/me',{headers:{Authorization:'Bearer normal'}})).json();
  assert.equal(own.data.isAdmin,false);assert.equal(own.data.review.status,'pending');
 }finally{await new Promise(r=>server.close(r));}
});
