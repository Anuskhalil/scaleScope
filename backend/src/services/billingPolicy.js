const paidStatuses = new Set(['active', 'on_trial', 'cancelled']);

function hasPaidAccess(subscription, testMode, now = Date.now()) {
  if (!subscription || !paidStatuses.has(subscription.status)) return false;
  if (subscription.provider !== 'lemonsqueezy' || !subscription.provider_subscription_id) return false;
  if (subscription.metadata?.test_mode !== testMode) return false;
  const end = Date.parse(subscription.current_period_end);
  return Number.isFinite(end) && end > now;
}

function safePaymentUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol === 'https:' && !url.username && !url.password &&
        (url.hostname === 'lemonsqueezy.com' || url.hostname.endsWith('.lemonsqueezy.com'))) return url.href;
  } catch { /* Invalid provider URL. */ }
  return null;
}

module.exports = { hasPaidAccess, safePaymentUrl };
