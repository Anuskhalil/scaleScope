const test=require('node:test');
const assert=require('node:assert/strict');
process.env.SUPABASE_URL='https://unit-test.invalid';
process.env.SUPABASE_SERVICE_KEY='unit-test';
process.env.GEMINI_API_KEY='unit-test';
const {isReviewAdmin}=require('../src/services/adminAccess');
const {sanitize,analyze}=require('../src/services/reviewAI');
test('admin permission requires verified Auth email, exact match and no profile email fallback',()=>{
 assert.equal(isReviewAdmin({email:'admin@example.com',email_confirmed_at:'2026-01-01'},'ADMIN@example.com'),true);
 assert.equal(isReviewAdmin({email:'admin@example.com'},'admin@example.com'),false);
 assert.equal(isReviewAdmin({email:'admin@example.com.evil',email_confirmed_at:'yes'},'admin@example.com'),false);
 assert.equal(isReviewAdmin({email:'other@example.com',email_confirmed_at:'yes',profile:{email:'admin@example.com'}},'admin@example.com'),false);
 assert.equal(isReviewAdmin({email:'admin@example.com',email_confirmed_at:'yes'},''),false);
});
test('AI context omits obvious secrets and storage URLs',()=>{
 const value=sanitize({email:'private@example.com',password:'secret',bio:'Founder',metadata:{file_url:'private',resume_url:'https://test.supabase.co/storage/v1/object/sign/a?token=secret'},website_url:'https://example.com?token=secret'});
 assert.equal(value.email,undefined);assert.equal(value.password,undefined);assert.equal(value.bio,'Founder');
 assert(!JSON.stringify(value).includes('secret'));
});
test('model advisory JSON cannot approve a profile and evidence is actually attached',async()=>{
 let input;
 const output={summary:'Evidence is incomplete',findings:[{field:'traction',assessment:'insufficient_evidence',explanation:'No reporting period',source:'page 1'}],limitations:['Not an authenticity check']};
 const result=await analyze({claim:'25 customers'},{buffer:Buffer.from('%PDF-'),mime:'application/pdf'},()=>({generateContent:async parts=>{input=parts;return {response:{text:()=>JSON.stringify(output)}};}}));
 assert.equal(input[1].inlineData.mimeType,'application/pdf');assert.equal(result.findings[0].assessment,'insufficient_evidence');
 await assert.rejects(analyze({},null,()=>({generateContent:async()=>({response:{text:()=>JSON.stringify({...output,status:'approved'})}})})));
});
test('invalid AI output and provider failures fail analysis, not approve users',async()=>{
 await assert.rejects(analyze({},null,()=>({generateContent:async()=>({response:{text:()=>'<html>bad</html>'}})})));
 await assert.rejects(analyze({},null,()=>({generateContent:async()=>{throw Error('provider unavailable');}})));
});
