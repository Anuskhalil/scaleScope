import test from 'node:test';
import assert from 'node:assert/strict';
import { fetchDiscoverSources } from './discoverSources.js';

function fixture(failTable) {
  const calls = [];
  const db = {
    from(table) {
      const call = { table, exclude: false };
      calls.push(call);
      const query = {
        select() { return query; },
        eq(key, value) { if (key === 'user_id' || key === 'id') call.owner = value; return query; },
        neq(key, value) { call.exclude = true; call.excluded = value; return query; },
        maybeSingle() { return query; },
        limit() { return query; },
        then(resolve, reject) {
          const key = table === 'founder_profiles' ? (call.exclude ? 'founders' : 'own-founder') : table;
          const data = call.exclude ? [{ marker: key }] : { marker: key };
          return Promise.resolve(table === failTable ? { error: new Error(table + ' unavailable') } : { data }).then(resolve, reject);
        },
      };
      return query;
    },
  };
  return { db, calls, api: { getMyConnections: async () => ({ data: [{ otherUser: { id: 'connected-user' } }] }) } };
}

test('two-role Discover keeps founder, investor and connection results separate', async () => {
  const { db, api, calls } = fixture();
  const result = await fetchDiscoverSources(db, api, 'viewer');
  assert.equal(result.founderRes.value.data.marker, 'own-founder');
  assert.equal(result.foundersRes.value.data[0].marker, 'founders');
  assert.equal(result.investorsRes.value.data[0].marker, 'investor_profiles');
  assert.equal(result.connectionsRes.value.data[0].otherUser.id, 'connected-user');
  assert.equal(result.prefsRes.value.data.marker, 'matching_preferences');
  assert.equal(calls.find(call => call.table === 'founder_profiles' && !call.exclude).owner, 'viewer');
  assert.equal(calls.find(call => call.table === 'founder_profiles' && call.exclude).excluded, 'viewer');
  assert.ok(calls.every(call => !['student_profiles', 'mentor_profiles'].includes(call.table)));
});

test('optional preferences failure does not shift or discard people results', async () => {
  const { db, api } = fixture('matching_preferences');
  const result = await fetchDiscoverSources(db, api, 'viewer');
  assert.equal(result.prefsRes.status, 'rejected');
  assert.equal(result.investorsRes.value.data[0].marker, 'investor_profiles');
});

test('Supabase query errors are reported instead of appearing as an empty feed', async () => {
  const { db, api } = fixture('founder_profiles');
  await assert.rejects(fetchDiscoverSources(db, api, 'viewer'), /founder_profiles unavailable/);
});
