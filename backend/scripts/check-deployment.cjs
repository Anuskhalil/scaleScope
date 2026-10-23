// Read-only configuration check. Never print credential values.
require('../src/config/environment').loadEnvironment();
const env = process.env;
let failures = 0;
function check(label, ok) {
  console.log(`${ok ? 'PASS' : 'BLOCK'}: ${label}`);
  if (!ok) failures++;
}
function https(value) {
  try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password && !['localhost', '127.0.0.1', '[::1]'].includes(u.hostname); } catch { return false; }
}
check('NODE_ENV production', env.NODE_ENV === 'production');
check('Public HTTPS frontend URL configured', https(env.FRONTEND_URL));
check('Additional origins are HTTPS', (env.FRONTEND_URLS || '').split(',').filter(Boolean).every(x => https(x.trim())));
check('Main Supabase project selected', env.SUPABASE_URL === 'https://gqkjvxcyetesvqmjkuus.supabase.co');
check('Backend service credential configured', Boolean(env.SUPABASE_SERVICE_KEY));
check('Staging mode disabled', env.SCALESCOPE_STAGING !== 'true');
if (env.BILLING_CHECKOUT_ENABLED === 'true') {
  check('Durable checkout enabled', env.BILLING_DURABLE_CHECKOUT_ENABLED === 'true');
  check('Live payment mode explicitly selected', env.LEMONSQUEEZY_TEST_MODE === 'false');
  check('Test price disabled', env.BILLING_TEST_PRICE_150_PKR !== 'true');
  check('Pricing finalized', env.BILLING_PRICING_FINALIZED === 'true');
  for (const key of ['LEMONSQUEEZY_API_KEY', 'LEMONSQUEEZY_STORE_ID', 'LEMONSQUEEZY_WEBHOOK_SECRET', 'LEMONSQUEEZY_FOUNDER_PRO_VARIANT_ID']) check(`${key} configured`, Boolean(env[key]));
} else console.log('INFO: Paid checkout disabled; launch without paid sales only.');
console.log('MANUAL: Verify store activation, live variant/price, reviewer MFA, public webhook deliveries, backup recovery and lifecycle acceptance. This command does not certify those gates.');
process.exitCode = failures ? 1 : 0;
