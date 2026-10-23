const { test } = require('node:test');
const assert = require('node:assert/strict');
const { founderTestPrice } = require('../src/services/billingTestPrice');

test('Rs 150 override is opt-in and never applies to live payments', () => {
  const previous = process.env.BILLING_TEST_PRICE_150_PKR;
  try {
    delete process.env.BILLING_TEST_PRICE_150_PKR;
    assert.equal(founderTestPrice(true), null);
    process.env.BILLING_TEST_PRICE_150_PKR = 'true';
    assert.deepEqual(founderTestPrice(true), {
      price_monthly: 150, price_yearly: 0, currency: 'PKR', pricing_finalized: true,
    });
    assert.equal(founderTestPrice(false), null);
  } finally {
    if (previous === undefined) delete process.env.BILLING_TEST_PRICE_150_PKR;
    else process.env.BILLING_TEST_PRICE_150_PKR = previous;
  }
});
