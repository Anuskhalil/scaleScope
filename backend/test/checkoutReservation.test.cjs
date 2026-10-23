const { test } = require('node:test');
const assert = require('node:assert/strict');
const { reservedCheckout } = require('../src/services/checkoutReservation');

function fixture(data, error) {
  let calls = 0;
  return {
    db: { rpc: async () => ({ data, error }) },
    create: async () => { calls++; throw new Error('provider timeout'); },
    userId: 'test-user', testMode: true, variantId: '123', interval: 'monthly',
    calls: () => calls,
  };
}

test('durable checkout reuses a saved link without another provider request', async () => {
  const f = fixture({ action: 'reuse', reservation: { checkout_url: 'https://test.lemonsqueezy.com/checkout/x', provider_checkout_id: '123' } });
  assert.equal((await reservedCheckout(f)).checkoutId, '123');
  assert.equal(f.calls(), 0);
});

for (const action of ['reconcile', 'subscription_exists', 'unknown']) {
  test(`durable checkout blocks ${action}`, async () => {
    const f = fixture({ action });
    await assert.rejects(reservedCheckout(f), { status: 409 });
    assert.equal(f.calls(), 0);
  });
}

test('missing migration fails closed before provider call', async () => {
  const f = fixture(null, { code: 'PGRST202' });
  await assert.rejects(reservedCheckout(f), { status: 503 });
  assert.equal(f.calls(), 0);
});

test('ambiguous provider failure leaves reservation locked', async () => {
  const f = fixture({ action: 'create', reservation: { id: 'reserved' } });
  await assert.rejects(reservedCheckout(f), /provider timeout/);
  assert.equal(f.calls(), 1);
});

for (const saved of [true, false]) {
  test(`provider checkout persistence ${saved ? 'succeeds' : 'fails closed'}`, async () => {
    const f = fixture({ action: 'create', reservation: { id: 'reserved' } });
    const checkout = { checkoutId: '123', url: 'https://test.lemonsqueezy.com/checkout/x', expiresAt: '2030-01-01T00:00:00Z' };
    f.create = async id => { assert.equal(id, 'reserved'); return checkout; };
    const chain = {
      eq: () => chain, select: () => chain,
      maybeSingle: async () => ({ data: saved ? { id: 'reserved' } : null }),
    };
    f.db.from = table => {
      assert.equal(table, 'billing_checkout_reservations');
      return { update: values => { assert.equal(values.state, 'ready'); return chain; } };
    };
    if (saved) assert.deepEqual(await reservedCheckout(f), checkout);
    else await assert.rejects(reservedCheckout(f), { status: 503 });
  });
}
