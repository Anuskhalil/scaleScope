const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const sandbox={exports:{},setTimeout,clearTimeout,process:{env:{}},require:name=>name==='node:crypto'?require(name):{}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/services/growthPlan.service.js'),'utf8'),sandbox);
const factory=sandbox.exports.createGrowthPlanService;
const rules=()=>import(pathToFileURL(path.join(__dirname,'../../shared/growthGuidance.mjs')));
function db(role='early-stage-founder'){
  const calls=[];
  return {calls,from(table){let id;return {select(){return this},eq(key,value){id=value;return this},async maybeSingle(){
    calls.push([table,id]);
    return {data:table==='profiles'?{id,user_type:role,bio:'PRIVATE FREE TEXT',location:'PRIVATE LOCATION'}:{user_id:id,startup_stage:'Idea',looking_for:['Co-Founder'],metadata:{secret:'PRIVATE FILE'}}};
  }}}};
}
test('server-owned rules ignore caller scores and user IDs',async()=>{
  const database=db();
  const service=factory({db:database,loadRules:rules,aiEnabled:()=>false});
  const plan=await service('owner',{trustScore:100,userId:'other'});
  assert.equal(plan.ai_enabled,false);
  assert(database.calls.every(([,id])=>id==='owner'));
  assert.equal(plan.signals.actions[0].id,'clarify');
  assert.equal(JSON.stringify(plan).includes('PRIVATE'),false);
});
test('invalid AI response falls back without echoing output',async()=>{
  const service=factory({db:db(),loadRules:rules,aiEnabled:()=>true,modelFactory:()=>({generateContent:async()=>({response:{text:()=> '{"action_ids":["invented"]}'}})})});
  const plan=await service('owner');
  assert.equal(plan.ai_enabled,false);
  assert.equal(JSON.stringify(plan).includes('invented'),false);
});
test('AI sees only derived flags; in-flight requests deduplicate',async()=>{
  let calls=0;
  const service=factory({db:db(),loadRules:rules,aiEnabled:()=>true,modelFactory:()=>({async generateContent(prompt){
    calls++;assert.equal(prompt.includes('PRIVATE'),false);
    const context=JSON.parse(prompt.split('Context: ')[1]);
    return {response:{text:()=>JSON.stringify({action_ids:context.actions.map(a=>a.id).reverse()})}};
  }})});
  const [a,b]=await Promise.all([service('owner'),service('owner')]);
  assert.equal(calls,1);assert.equal(a.ai_enabled,true);assert.equal(b.ai_enabled,true);
  assert.equal(a.signals.actions[0].id,'clarify');
});
test('AI timeout leaves useful deterministic guidance',async()=>{
  const service=factory({db:db(),loadRules:rules,aiEnabled:()=>true,timeoutMs:5,modelFactory:()=>({generateContent:()=>new Promise(()=>{})})});
  const plan=await service('owner');assert.equal(plan.ai_enabled,false);assert(plan.signals.actions.length>0);
});
test('retired roles rejected before fetching retired role tables',async()=>{
  const database=db('mentor');
  await assert.rejects(factory({db:database,loadRules:rules})('owner'),/founders and investors/);
  assert.equal(database.calls.length,1);
});

