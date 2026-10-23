const {test}=require('node:test');
const assert=require('node:assert/strict');
const {requiresMfa,withValidatedSession,reviewerSessionAllowed}=require('../src/services/reviewerSession');
const enforced={REVIEWER_MFA_REQUIRED:'true'};
const token=claims=>'header.'+Buffer.from(JSON.stringify(claims)).toString('base64url')+'.signature';
test('production cannot disable reviewer MFA',()=>{
 assert.equal(requiresMfa({NODE_ENV:'production',REVIEWER_MFA_REQUIRED:'false'}),true);
 assert.equal(reviewerSessionAllowed('a',enforced),false);
});
test('validated session requires matching subject, unexpired AAL2',()=>{
 for(const claims of [{sub:'a',aal:'aal1',exp:Date.now()/1000+60},{sub:'b',aal:'aal2',exp:Date.now()/1000+60},{sub:'a',aal:'aal2',exp:1}]){
  withValidatedSession(token(claims),{id:'a'},()=>assert.equal(reviewerSessionAllowed('a',enforced),false));
 }
 withValidatedSession('bad',{id:'a'},()=>assert.equal(reviewerSessionAllowed('a',enforced),false));
 withValidatedSession(token({sub:'a',aal:'aal2',exp:Date.now()/1000+60}),{id:'a'},()=>{
  assert.equal(reviewerSessionAllowed('a',enforced),true);
  assert.equal(reviewerSessionAllowed('b',enforced),false);
 });
 assert.equal(reviewerSessionAllowed('a',enforced),false);
});
test('concurrent async requests do not share reviewer assurance',async()=>{
 await Promise.all(['aal1','aal2'].map(aal=>withValidatedSession(token({sub:'a',aal,exp:Date.now()/1000+60}),{id:'a'},async()=>{
  await new Promise(r=>setTimeout(r,5));
  assert.equal(reviewerSessionAllowed('a',enforced),aal==='aal2');
 })));
});
