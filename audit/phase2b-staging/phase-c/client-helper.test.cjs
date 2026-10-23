const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

test('legacy conversation helper uses authenticated backend and preserves returned ID', async () => {
  const calls = [];
  const context = vm.createContext({ console });
  const source = fs.readFileSync(path.resolve(__dirname, '../../../client/src/services/studentService.js'), 'utf8');
  const module = new vm.SourceTextModule(source, { context, initializeImportMeta(meta) { meta.env = {}; } });
  await module.link(async (specifier) => {
    const exports = specifier.includes('supabaseClient')
      ? { supabase: { rpc() { throw new Error('Direct RPC forbidden'); } } }
      : specifier.includes('backendApi')
        ? { backendApi: { async getOrCreateConversation(other) { calls.push(other); return { conversationId: 'room-id' }; } } }
        : { attachMatchIntelligence() {} };
    return new vm.SyntheticModule(Object.keys(exports), function () {
      for (const [key, value] of Object.entries(exports)) this.setExport(key, value);
    }, { context });
  });
  await module.evaluate();
  assert.equal(await module.namespace.getOrCreateConversation('caller-id', 'other-id'), 'room-id');
  assert.deepEqual(calls, ['other-id']);
  await assert.rejects(module.namespace.getOrCreateConversation('', 'other-id'), /userId is required/);
  await assert.rejects(module.namespace.getOrCreateConversation('caller-id', ''), /otherUserId is required/);
});
