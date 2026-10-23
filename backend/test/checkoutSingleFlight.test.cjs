const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createCheckoutSingleFlight } = require('../src/services/checkoutSingleFlight');

test('concurrent same-account checkouts share a single operation', async () => {
  const run = createCheckoutSingleFlight();
  let finish;
  let calls = 0;
  const create = () => { calls++; return new Promise(resolve => { finish = resolve; }); };
  const a = run('founder', 'monthly', create);
  const b = run('founder', 'monthly', create);
  await Promise.resolve();
  assert.equal(calls, 1);
  await assert.rejects(run('founder', 'yearly', create), { status: 409 });
  assert.equal(await run('other', 'monthly', () => 'other-checkout'), 'other-checkout');
  finish('checkout');
  assert.deepEqual(await Promise.all([a, b]), ['checkout', 'checkout']);
});

test('failed operation releases the pending entry', async () => {
  const run = createCheckoutSingleFlight();
  await assert.rejects(run('founder', 'monthly', () => { throw new Error('Provider unavailable'); }));
  assert.equal(await run('founder', 'monthly', () => 'retry'), 'retry');
});
