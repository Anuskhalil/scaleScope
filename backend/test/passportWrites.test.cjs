const test=require('node:test');
const assert=require('node:assert/strict');
const express=require('express');
const {passportWritesEnabled,createPassportWriteGate}=require('../src/middlewares/passportWrites');
test('write control defaults to staging only and fails closed for malformed values',()=>{
 assert.equal(passportWritesEnabled({}),false);
 assert.equal(passportWritesEnabled({PASSPORT_WRITES_ENABLED:'true'}),false);
 assert.equal(passportWritesEnabled({SCALESCOPE_STAGING:'true'}),true);
 for(const value of ['false','TRUE','','yes'])assert.equal(passportWritesEnabled({SCALESCOPE_STAGING:'true',PASSPORT_WRITES_ENABLED:value}),false);
});
test('pause blocks mutations, preserves reads, and resumes without deleting state',async()=>{
 const env={SCALESCOPE_STAGING:'true',PASSPORT_WRITES_ENABLED:'false'};
 const app=express();let writes=0;
 app.use(createPassportWriteGate(env));
 app.get('/claims',(_req,res)=>res.json({existing:'preserved'}));
 app.all('/mutation',(_req,res)=>{writes++;res.json({ok:true});});
 const server=app.listen(0,'127.0.0.1');
 await new Promise(resolve=>server.once('listening',resolve));
 const base='http://127.0.0.1:'+server.address().port;
 try{
  for(const method of ['POST','PUT','PATCH','DELETE']){
   const response=await fetch(base+'/mutation',{method});
   assert.equal(response.status,503);
   assert.equal((await response.json()).code,'PASSPORT_READ_ONLY');
   assert.match(response.headers.get('cache-control'),/no-store/);
  }
  assert.equal(writes,0);
  assert.deepEqual(await (await fetch(base+'/claims')).json(),{existing:'preserved'});
  env.PASSPORT_WRITES_ENABLED='true';
  assert.equal((await fetch(base+'/mutation',{method:'POST'})).status,200);
  assert.equal(writes,1);
 }finally{await new Promise(resolve=>server.close(resolve));}
});

