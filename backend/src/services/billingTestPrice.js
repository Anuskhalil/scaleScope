const founderTestPrice = (testMode) =>
  testMode && process.env.BILLING_TEST_PRICE_150_PKR === 'true'
    ? { price_monthly: 150, price_yearly: 0, currency: 'PKR', pricing_finalized: true }
    : null;

module.exports = { founderTestPrice };
