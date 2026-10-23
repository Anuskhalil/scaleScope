const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const founder = '42fce0f8-b0d3-41a9-b246-2d4a5def266e';
const investor = '3ec91991-f475-4f07-a038-e2a7e1c8b24d';
let connected = true;
let rpcCalls = [];
let writes = [];
function stub(modulePath, exports) {
  const id = require.resolve(modulePath);
  require.cache[id] = { id, filename: id, loaded: true, exports };
}
stub('../src/config/supabase', {
  auth: { getUser: async token => ({ data: { user: { id: token === 'investor' ? investor : founder } }, error: null }) },
  from(table) {
    const filters = {};
    const result = () => ({ data: table === 'connections' ? (connected ? { id: 'connection' } : null)
      : filters.receiver_id === investor ? { id: 'request', sender_id: founder, receiver_id: investor, type: 'investor_contact', status: 'pending' } : null, error: null });
    const q = {
      select() { return q; }, or() { return q; }, eq(k, v) { filters[k] = v; return q; },
      update(value) { writes.push({ table, value }); return q; },
      insert(value) { writes.push({ table, value }); return q; },
      maybeSingle: async () => result(),
      then(resolve, reject) { return Promise.resolve(result()).then(resolve, reject); },
    };
    return q;
  },
  async rpc(name, args) { rpcCalls.push({ name, args }); return { data: 'conversation-id', error: null }; },
});
stub('../src/services/profileReview.service', { assertApproved: async () => {} });
stub('../src/config/socket', { getIO: () => null, isUserOnline: () => false });
stub('../src/services/messaging.service', { createMessage: async () => { throw Error('Not used in this route test'); } });

test('conversation HTTP route enforces authentication, connection and server-owned actor', async () => {
  const app = express(); app.use(express.json());
  app.use('/conversations', require('../src/routes/conversation.routes'));
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const url = `http://127.0.0.1:${server.address().port}/conversations/with/${investor}`;
  try {
    assert.equal((await fetch(url, { method: 'POST' })).status, 401);
    connected = false;
    assert.equal((await fetch(url, { method: 'POST', headers: { Authorization: 'Bearer founder' } })).status, 403);
    assert.equal(rpcCalls.length, 0);
    connected = true;
    const response = await fetch(url, { method: 'POST', headers: { Authorization: 'Bearer founder', 'Content-Type': 'application/json' }, body: JSON.stringify({ p_created_by: investor }) });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).conversationId, 'conversation-id');
    assert.deepEqual(rpcCalls[0], { name: 'create_conversation_with_participants', args: { p_created_by: founder, p_other_user: investor, p_type: 'direct' } });
  } finally { await new Promise(resolve => server.close(resolve)); }
});

test('accepted connection continues to use service-mediated conversation RPC', async () => {
  rpcCalls = []; writes = []; connected = false;
  const { respondRequest } = require('../src/services/connection.service');
  const result = await respondRequest('request', 'accept', investor);
  assert.equal(result.conversationId, 'conversation-id');
  assert(writes.some(w => w.table === 'connections'));
  assert.deepEqual(rpcCalls[0].args, { p_created_by: investor, p_other_user: founder, p_type: 'direct' });
  await assert.rejects(respondRequest('request', 'accept', founder), /Invalid or expired request/);
});
