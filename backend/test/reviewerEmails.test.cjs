const{test}=require('node:test');
const assert=require('node:assert/strict');
const{reviewerEmails}=require('../src/config/reviewerEmails');
test('local reviewer removal takes effect without session logout or process restart',()=>{
 const env={ADMIN_REVIEW_EMAILS:'old@example.invalid'};
 let text='ADMIN_REVIEW_EMAILS=new@example.invalid';
 assert.equal(reviewerEmails(env,()=>text),'new@example.invalid');
 text='ADMIN_REVIEW_EMAILS=';assert.equal(reviewerEmails(env,()=>text),'');
 assert.equal(reviewerEmails(env,()=>{throw Error('missing')}),'');
});
test('production and staging only use injected configuration',()=>{
 for(const env of [{NODE_ENV:'production'},{SCALESCOPE_STAGING:'true'}])assert.equal(reviewerEmails({...env,ADMIN_REVIEW_EMAILS:'hosted@example.invalid'},()=>{throw Error('must not read')}),'hosted@example.invalid');
});
