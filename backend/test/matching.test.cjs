const test=require('node:test');
const assert=require('node:assert/strict');
process.env.SUPABASE_URL='https://unit-test.invalid';
process.env.SUPABASE_SERVICE_KEY='unit-test';
const {createMatchingService,validateIds}=require('../src/services/matching.service');
const a='00000000-0000-4000-8000-000000000001',b='00000000-0000-4000-8000-000000000002';
function mock(privateProfile=false,missingEvents=false,reviewStatus='approved'){
 const events=[];
 const tables={
 profile_reviews:[{user_id:a,status:reviewStatus},{user_id:b,status:'approved'}],
 profiles:[{id:a,user_type:'early-stage-founder'},{id:b,user_type:'investor'}],
 founder_profiles:[{user_id:a,industry:'SaaS',metadata:{private_note:'SECRET'}}],
 investor_profiles:[{user_id:b,is_public:!privateProfile,is_active:true,preferred_industries:['SaaS'],metadata:{due_diligence_file_url:'SECRET'}}]};
 return {events,from(name){
  if(name==='matching_events')return {upsert:async rows=>{events.push(...rows);return {error:missingEvents?{code:'42P01'}:null}}};
  let data=tables[name];
  const q={select(){return q},in(key,ids){data=data.filter(x=>ids.includes(x[key]));return q},is(){return q},then(resolve){return Promise.resolve({data}).then(resolve)}};
  return q;
 }};
}
test('bounded IDs, no injection and duplicates removed',()=>{
 assert.throws(()=>validateIds(['bad'],a));assert.throws(()=>validateIds(Array(101).fill(b),a));assert.deepEqual(validateIds([a,b,b],a),[b]);
});
test('server derives fit, returns no raw private fields and records generation not impression',async()=>{
 const db=mock(),rows=await createMatchingService(db).evaluate(a,[b]);
 assert.equal(rows.length,1);assert.equal(rows[0].matchScore,25);
 assert(!JSON.stringify(rows).includes('SECRET'));
 assert.equal(db.events[0].event_type,'recommendation_generated');
});
test('private target profile never returned or logged',async()=>{
 const db=mock(true);assert.deepEqual(await createMatchingService(db).evaluate(a,[b]),[]);assert.equal(db.events.length,0);
});
test('missing event migration does not fabricate data or stop discovery',async()=>{
 assert.equal((await createMatchingService(mock(false,true)).evaluate(a,[b])).length,1);
});
test('pending profile receives the same suggestions and fit as an approved profile',async()=>{
 const db=mock(false,false,'pending'),rows=await createMatchingService(db).evaluate(a,[b]);
 const approved=await createMatchingService(mock()).evaluate(a,[b]);
 assert.deepEqual(rows,approved);assert.equal(rows[0].matchScore,25);assert.equal(db.events.length,1);
});
