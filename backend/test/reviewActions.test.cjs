const test=require('node:test');
const assert=require('node:assert/strict');
const express=require('express');
let writes=0;
const dbPath=require.resolve('../src/config/supabase');
require.cache[dbPath]={id:dbPath,filename:dbPath,loaded:true,exports:{
 auth:{getUser:async()=>({data:{user:{id:'pending-user'}},error:null})},
 from(){writes++;throw new Error('Database access must not occur for pending messaging');}
}};
const reviewPath=require.resolve('../src/services/profileReview.service');
require.cache[reviewPath]={id:reviewPath,filename:reviewPath,loaded:true,exports:{
 assertApproved:async()=>{throw Object.assign(new Error('Your profile is under review.'),{status:403});}
}};
test('pending user cannot send through shared messaging service',async()=>{
 const {createMessage}=require('../src/services/messaging.service');
 await assert.rejects(createMessage('conversation','pending-user','Hello'),{status:403});
 assert.equal(writes,0);
});
test('pending user cannot read conversations through REST',async()=>{
 const app=express();app.use('/conversations',require('../src/routes/conversation.routes'));
 const server=app.listen(0,'127.0.0.1');
 await new Promise(r=>server.once('listening',r));
 try{
  const response=await fetch('http://127.0.0.1:'+server.address().port+'/conversations',{headers:{Authorization:'Bearer pending'}});
  assert.equal(response.status,403);
  assert.match((await response.json()).error,/under review/);
  assert.equal(writes,0);
 }finally{await new Promise(r=>server.close(r));}
});
