// Read-only provider diagnostics. Never creates a checkout or changes provider settings.
const fs = require('node:fs');
const path = require('node:path');
const env = require('dotenv').parse(fs.readFileSync(path.resolve(__dirname, '../.env')));
const report = { checkedAt: new Date().toISOString(), readOnly: true, checks: [] };
const mode = env.LEMONSQUEEZY_TEST_MODE !== 'false';
function record(check, status, details = {}) {
  const entry = { check, status, ...details };
  report.checks.push(entry);
  console.log(JSON.stringify(entry));
}
async function get(endpoint) {
  try {
    const response = await fetch('https://api.lemonsqueezy.com/v1' + endpoint, {
      method: 'GET', redirect: 'error', signal: AbortSignal.timeout(20000),
      headers: { Accept: 'application/vnd.api+json', Authorization: `Bearer ${env.LEMONSQUEEZY_API_KEY}` },
    });
    if (!response.ok) return { status: response.status };
    return { status: response.status, body: await response.json() };
  } catch (error) {
    return { status: 'network_error', reason: error.cause?.code || error.name };
  }
}
async function main() {
  record('Local configuration', 'INFO', {
    apiKeyConfigured: Boolean(env.LEMONSQUEEZY_API_KEY),
    webhookSecretConfigured: Boolean(env.LEMONSQUEEZY_WEBHOOK_SECRET),
    expectedTestMode: mode, checkoutEnabled: env.BILLING_CHECKOUT_ENABLED === 'true',
    pricingFinalized: env.BILLING_PRICING_FINALIZED === 'true',
  });
  if (!env.LEMONSQUEEZY_API_KEY) { record('API authentication', 'FAIL', { reason: 'Missing key' }); return; }
  const user = await get('/users/me');
  if (user.status !== 200) { record('API authentication', 'FAIL', { httpStatus: user.status, reason: user.reason }); return; }
  record('API authentication', 'PASS', { httpStatus: 200 });
  record('API key mode', typeof user.body.meta?.test_mode === 'boolean' ? (user.body.meta.test_mode === mode ? 'PASS' : 'FAIL') : 'UNKNOWN', { providerTestMode: user.body.meta?.test_mode, expectedTestMode: mode });
  const storeId = env.LEMONSQUEEZY_STORE_ID;
  if (!/^\d+$/.test(storeId || '')) { record('Store', 'FAIL', { reason: 'Missing or invalid store ID' }); return; }
  const store = await get('/stores/' + storeId);
  record('Store', store.status === 200 && String(store.body.data?.id) === storeId ? 'PASS' : 'FAIL', { httpStatus: store.status, name: store.body?.data?.attributes?.name, currency: store.body?.data?.attributes?.currency });
  for (const interval of ['monthly', 'yearly']) {
    const variantId = env[interval === 'monthly' ? 'LEMONSQUEEZY_FOUNDER_PRO_VARIANT_ID' : 'LEMONSQUEEZY_FOUNDER_PRO_YEARLY_VARIANT_ID'];
    if (!variantId) { record(interval + ' variant', 'MISSING'); continue; }
    if (!/^\d+$/.test(variantId)) { record(interval + ' variant', 'FAIL', { reason: 'Invalid variant ID' }); continue; }
    const variant = await get('/variants/' + variantId);
    if (variant.status !== 200) { record(interval + ' variant', 'FAIL', { httpStatus: variant.status }); continue; }
    const a = variant.body.data.attributes;
    record(interval + ' variant', 'PASS', { httpStatus: 200, name: a.name, variantStatus: a.status });
    record(interval + ' recurrence', a.is_subscription === true && a.interval === (interval === 'monthly' ? 'month' : 'year') && a.interval_count === 1 ? 'PASS' : 'FAIL', { isSubscription: a.is_subscription, interval: a.interval, intervalCount: a.interval_count, priceMinorUnits: a.price });
    record(interval + ' mode', a.test_mode === mode ? 'PASS' : 'FAIL', { providerTestMode: a.test_mode });
    if (!/^\d+$/.test(String(a.product_id))) { record(interval + ' product ownership', 'FAIL'); continue; }
    const product = await get('/products/' + a.product_id);
    record(interval + ' product ownership', product.status === 200 && String(product.body?.data?.attributes?.store_id) === storeId ? 'PASS' : 'FAIL', { httpStatus: product.status, productName: product.body?.data?.attributes?.name, productStatus: product.body?.data?.attributes?.status });
  }
  const hooks = await get('/webhooks?filter[store_id]=' + storeId + '&page[size]=100');
  if (hooks.status !== 200) { record('Webhook configuration', 'UNKNOWN', { httpStatus: hooks.status }); return; }
  const rows = (hooks.body.data || []).filter(row => String(row.attributes.store_id) === storeId);
  record('Webhook configuration', rows.length ? 'INFO' : 'MISSING', { count: rows.length, morePages: Boolean(hooks.body.links?.next) });
  for (const row of rows) {
    const a = row.attributes;
    let url; try { url = new URL(a.url); } catch { /* Invalid provider setting is reported without printing raw URL. */ }
    record('Webhook endpoint', 'INFO', {
      host: url?.hostname, https: url?.protocol === 'https:',
      expectedPath: url?.pathname === '/api/billing/webhook',
      modeMatches: a.test_mode === mode, events: a.events,
      secretMatches: typeof a.secret === 'string' ? a.secret === env.LEMONSQUEEZY_WEBHOOK_SECRET : 'not_exposed',
    });
  }
  record('End-to-end payment and webhook delivery', 'NOT_TESTED');
}
main().catch(() => { record('Diagnostic execution', 'FAIL', { reason: 'Unexpected diagnostic error; raw response omitted' }); process.exitCode = 1; })
  .finally(() => {
    const directory = path.resolve(__dirname, '../../audit/billing');
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(path.join(directory, 'lemon-readonly-connection.json'), JSON.stringify(report, null, 2));
  });
