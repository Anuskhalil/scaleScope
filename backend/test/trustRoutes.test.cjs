const test=require('node:test');
const assert=require('node:assert/strict');
const express=require('express');
const actor='00000000-0000-4000-8000-000000000001';
const configPath=require.resolve('../src/config/supabase');
require.cache[configPath]={id:configPath,filename:configPath,loaded:true,exports:{auth:{getUser:async token=>({data:{user:token==='valid'?{id:actor}:null},error:null})}}};
const servicePath=require.resolve('../src/services/trust.service');
let captured=null;
require.cache[servicePath]={id:servicePath,filename:servicePath,loaded:true,exports:{
 account:async()=>({id:actor}),
 list:async()=>({own:[],shared:[],grants:[]}),
 upload:async(id,meta,buffer,mime)=>{captured={id,meta,bytes:buffer.length,mime};return {id:'new'};}
}};
test('authenticated HTTP upload accepts raw files and rejects malformed metadata without database access',async()=>{
 const app=express();app.use(express.json({limit:'1mb'}));app.use('/api/trust',require('../src/routes/trust.routes'));
 const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
 const base='http://127.0.0.1:'+server.address().port+'/api/trust';
 try{
  assert.equal((await fetch(base+'/evidence')).status,401);
  assert.equal((await fetch(base+'/evidence',{headers:{Authorization:'Bearer invalid'}})).status,401);
  const headers={Authorization:'Bearer valid','Content-Type':'application/pdf','X-Evidence-Metadata':encodeURIComponent(JSON.stringify({category:'product',title:'Example',claim:'A working product prototype'}))};
  let res=await fetch(base+'/evidence',{method:'POST',headers,body:Buffer.from('%PDF-1.7 test')});
  assert.equal(res.status,200);assert.equal(captured.id,actor);assert.equal(captured.bytes,13);assert.equal(captured.mime,'application/pdf');
  res=await fetch(base+'/evidence',{method:'POST',headers:{...headers,'X-Evidence-Metadata':'%invalid'},body:Buffer.from('%PDF-')});
  assert.equal(res.status,400);
  res=await fetch(base+'/evidence',{method:'POST',headers,body:Buffer.alloc(5242881)});
  assert.equal(res.status,413);
 }finally{await new Promise(resolve=>server.close(resolve));}
});
