import test from 'node:test';
import assert from 'node:assert/strict';
import {passportVisible} from './passportFlags.mjs';
test('Passport visibility is default-off and accepts only explicit true flags',()=>{
 assert.equal(passportVisible({}),false);
 for(const value of ['false','TRUE','yes',''])assert.equal(passportVisible({VITE_PASSPORT_ENABLED:value}),false);
 assert.equal(passportVisible({VITE_PASSPORT_ENABLED:'true'}),true);
 assert.equal(passportVisible({VITE_PASSPORT_STAGING:'true'}),true);
});
