const test=require('node:test');
const assert=require('node:assert/strict');
const {passportEnabled,passportWritesEnabled}=require('../src/config/passport');
test('production Passport requires separate explicit route and mutation opt-ins',()=>{
 for(const value of [undefined,'false','TRUE','','yes']){
  assert.equal(passportEnabled({PASSPORT_ENABLED:value}),false);
  assert.equal(passportWritesEnabled({PASSPORT_ENABLED:value,PASSPORT_WRITES_ENABLED:'true'}),false);
 }
 assert.equal(passportEnabled({PASSPORT_ENABLED:'true'}),true);
 assert.equal(passportWritesEnabled({PASSPORT_ENABLED:'true'}),false);
 assert.equal(passportWritesEnabled({PASSPORT_ENABLED:'true',PASSPORT_WRITES_ENABLED:'true'}),true);
 assert.equal(passportWritesEnabled({PASSPORT_ENABLED:'true',PASSPORT_WRITES_ENABLED:'false'}),false);
});
test('staging keeps its established default without inheriting production flags',()=>{
 assert.equal(passportEnabled({SCALESCOPE_STAGING:'true'}),true);
 assert.equal(passportWritesEnabled({SCALESCOPE_STAGING:'true'}),true);
 assert.equal(passportWritesEnabled({SCALESCOPE_STAGING:'true',PASSPORT_WRITES_ENABLED:'false'}),false);
});
