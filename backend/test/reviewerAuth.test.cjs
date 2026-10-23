const {test}=require('node:test');
const assert=require('node:assert/strict');
const express=require('express');
test('reviewer magic links hide membership, restrict delivery and limit retries',async()=>{
 process.env.ADMIN_REVIEW_EMAILS='reviewer@example.invalid';
 process.env.FRONTEND_URL='http://localhost:5173';
 const sent=[];
 const dbPath=require.resolve('../src/config/supabase');
 require.cache[dbPath]={id:dbPath,filename:dbPath,loaded:true,exports:{auth:{signInWithOtp:async v=>{sent.push(v);return {error:null};}}}};
 const app=express();app.use(express.json());app.use(require('../src/routes/reviewerAuth.routes'));
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
 try{
 const post=email=>fetch('http://127.0.0.1:'+server.address().port+'/link',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,redirect:'https://evil.invalid'})});
 const denied=await post('other@example.invalid');const accepted=await post(' REVIEWER@example.invalid ');
 assert.equal(denied.status,202);assert.equal(accepted.status,202);assert.deepEqual(await denied.json(),await accepted.json());
 assert.equal(sent.length,1);assert.equal(sent[0].options.shouldCreateUser,false);assert.equal(sent[0].options.emailRedirectTo,'http://localhost:5173/admin');
 await post('other@example.invalid');assert.equal((await post('reviewer@example.invalid')).status,429);
 assert.equal((await post('not-email')).status,400);
 }finally{await new Promise(r=>server.close(r));}
});
