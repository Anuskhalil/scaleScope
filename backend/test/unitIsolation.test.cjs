const test=require('node:test');
const assert=require('node:assert/strict');
test('isolated runner skips dotenv and uses synthetic credentials', {skip:process.env.NODE_ENV!=='test'},()=>{
 const result=require('dotenv').config();
 assert.deepEqual(result,{parsed:{}});
 assert.equal(process.env.SUPABASE_URL,'https://unit-test.invalid');
 assert.equal(process.env.SUPABASE_SERVICE_KEY,'unit-test');
 assert.equal(process.env.SCALESCOPE_STAGING,undefined);
 assert.equal(process.env.ADMIN_REVIEW_EMAILS,undefined);
});

