const crypto = require('crypto');
const supabase = require('../config/supabase');
const { hasPaidAccess, safePaymentUrl } = require('./billingPolicy');
const { reservedCheckout } = require('./checkoutReservation');
const durableCheckoutEnabled = () => process.env.BILLING_DURABLE_CHECKOUT_ENABLED === 'true';

const MONTHLY_PERIOD = () => new Date().toISOString().slice(0, 7);

const DEFAULT_PLANS = [
  {
    code: 'free',
    name: 'Free',
    role_scope: ['early-stage-founder', 'investor'],
    price_monthly: 0,
    price_yearly: 0,
    currency: 'USD',
    description: 'Start building trusted startup connections.',
    features: {
      included: [
        'Role profile creation',
        'Basic matching scores',
        'View public profiles',
        'Messaging after accepted connection',
        'Dashboard recommendations',
      ],
    },
    limits: {
      connection_requests: 5,
      ai_match_reports: 1,
      saved_profiles: 5,
      profile_boosts: 0,
    },
    is_active: true,
  },
  {
    code: 'founder_pro',
    name: 'Founder Pro',
    role_scope: ['early-stage-founder'],
    price_monthly: 15,
    price_yearly: 144,
    currency: 'USD',
    description: 'For founders raising trust, finding team, and preparing for investors.',
    features: {
      included: [
        '50 connection requests per month',
        'Investor readiness report',
        'Pitch/profile AI review',
        'Advanced investor filters',
        'Team gap analysis',
        'Priority investor visibility',
      ],
    },
    limits: {
      connection_requests: 50,
      ai_match_reports: 50,
      saved_profiles: 100,
      profile_boosts: 3,
    },
    is_active: true,
  },
];

const ECOSYSTEM_ACCESS_BY_ROLE = {
  investor: {
    name: 'Investor Ecosystem Access',
    description: 'Free full access for investors to strengthen startup deal-flow and platform trust.',
    features: {
      included: [
        'Free investor profile and thesis visibility',
        'High-quality 60%+ startup matches on dashboard',
        'Full founder and student-startup discovery access',
        'Advanced deal-flow filters',
        'Messaging and meetings after accepted connection',
      ],
    },
    limits: {
      connection_requests: 9999,
      ai_match_reports: 250,
      saved_profiles: 1000,
      profile_boosts: 0,
    },
  },
};

const tableMissing = (error) => {
  const message = String(error?.message || '').toLowerCase();
  return (
    error?.code === '42P01' ||
    error?.code === 'PGRST205' ||
    message.includes('does not exist') ||
    message.includes('schema cache')
  );
};

const LEMON_API_BASE = 'https://api.lemonsqueezy.com/v1';
const PAID_PLAN_CODES = ['founder_pro'];

const planVariantEnvKey = (planCode) =>
  `LEMONSQUEEZY_${String(planCode || '').toUpperCase()}_VARIANT_ID`;

const lemonConfigured = () =>
  Boolean(
    process.env.BILLING_CHECKOUT_ENABLED === 'true' &&
    process.env.BILLING_PRICING_FINALIZED === 'true' &&
    process.env.LEMONSQUEEZY_API_KEY &&
    process.env.LEMONSQUEEZY_STORE_ID &&
    process.env.LEMONSQUEEZY_WEBHOOK_SECRET
  );

const lemonTestMode = () => String(process.env.LEMONSQUEEZY_TEST_MODE || 'true') !== 'false';

const getPlanVariantId = (planCode, interval = 'monthly') => {
  const value = interval === 'yearly'
    ? process.env[`LEMONSQUEEZY_${planCode.toUpperCase()}_YEARLY_VARIANT_ID`]
    : process.env[planVariantEnvKey(planCode)];
  return value ? String(value) : null;
};

const getPlanCodeByVariantId = (variantId) => {
  const found = PAID_PLAN_CODES.find((planCode) => {
    return ['monthly', 'yearly'].some(interval => getPlanVariantId(planCode, interval) === String(variantId || ''));
  });

  const legacyTestVariants = (process.env.LEMONSQUEEZY_LEGACY_TEST_FOUNDER_VARIANT_IDS || '').split(',').map(value => value.trim()).filter(Boolean);
  return found || (lemonTestMode() && legacyTestVariants.includes(String(variantId)) ? 'founder_pro' : null);
};

async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, user_type')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  return data || {};
}

async function lemonRequest(path, { method = 'GET', body } = {}) {
  const response = await fetch(`${LEMON_API_BASE}${path}`, {
    method,
    headers: {
      Accept: 'application/vnd.api+json',
      'Content-Type': 'application/vnd.api+json',
      Authorization: `Bearer ${process.env.LEMONSQUEEZY_API_KEY}`,
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const detail =
      payload?.errors?.[0]?.detail ||
      payload?.errors?.[0]?.title ||
      payload?.message ||
      'Lemon Squeezy request failed';
    const error = new Error(detail);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

const { founderTestPrice } = require('./billingTestPrice');

const normalizePlan = (plan = {}) => ({
  ...plan,
  role_scope: Array.isArray(plan.role_scope) ? plan.role_scope.filter(role => ['early-stage-founder', 'investor'].includes(role)) : [],
  features: { included: plan.code === 'founder_pro'
    ? ['Higher monthly connection request allowance', 'Profile-based matching', 'Messaging after accepted connections', 'Trust review remains separate from payment']
    : ['Profile-based matching', 'Public profile discovery', 'Messaging after accepted connections'] },
  checkout_intervals: plan.code === 'founder_pro' && lemonConfigured()
    ? ['monthly', 'yearly'].filter(interval => getPlanVariantId(plan.code, interval)) : [],
  test_mode: lemonTestMode(),
  pricing_finalized: process.env.BILLING_PRICING_FINALIZED === 'true',
  limits: { connection_requests: plan.metadata?.ecosystem_access ? 9999 : plan.code === 'founder_pro' ? 50 : 5 },
  price_monthly: Number(plan.price_monthly || 0),
  price_yearly: Number(plan.price_yearly || 0),
  currency: plan.currency || 'USD',
  ...(plan.code === 'founder_pro' ? founderTestPrice(lemonTestMode()) : null),
});

const applyRoleFreeAccess = (plan, role) => {
  const access = ECOSYSTEM_ACCESS_BY_ROLE[role];

  if (!access || plan?.code !== 'free') return plan;

  return normalizePlan({
    ...plan,
    ...access,
    code: 'free',
    role_scope: [role],
    price_monthly: 0,
    price_yearly: 0,
    currency: plan.currency || 'USD',
    is_active: true,
    metadata: {
      ...(plan.metadata || {}),
      ecosystem_access: true,
      paid_upgrade_required: false,
    },
  });
};

function getFallbackPlans(role) {
  return DEFAULT_PLANS
    .filter((plan) => {
      return ['free', 'founder_pro'].includes(plan.code) && (plan.code === 'free' || !role || plan.role_scope.includes(role));
    })
    .map((plan) => applyRoleFreeAccess(normalizePlan(plan), role));
}

exports.getDefaultPlans = () => DEFAULT_PLANS.map(normalizePlan);

exports.getPlans = async ({ role } = {}) => {
  try {
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('price_monthly', { ascending: true });

    if (error) throw error;

    const plans = (data || [])
      .map((plan) => applyRoleFreeAccess(normalizePlan(plan), role))
      .filter((plan) => {
        if (plan.code !== 'free' && !PAID_PLAN_CODES.includes(plan.code)) return false;
        return plan.code === 'free' || !role || plan.role_scope.includes(role);
      });

    return plans.length ? plans : getFallbackPlans(role);
  } catch (error) {
    if (!tableMissing(error)) {
      console.warn('Billing plans fallback:', error.message);
    }

    return getFallbackPlans(role);
  }
};

async function getUserRole(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('user_type')
    .eq('id', userId)
    .maybeSingle();

  if (error) throw error;
  return data?.user_type === 'student' ? 'early-stage-founder' : data?.user_type || null;
}

exports.getUserSubscription = async (userId) => {
  const role = await getUserRole(userId);
  const plans = await exports.getPlans({ role });
  const freePlan = plans.find((plan) => plan.code === 'free') || getFallbackPlans(role)[0];

  try {
    const { data, error } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;

    const subscription = data || {
      user_id: userId,
      plan_code: 'free',
      status: 'free',
      provider: 'manual',
      current_period_start: null,
      current_period_end: null,
      cancel_at_period_end: false,
    };

    const paid = hasPaidAccess(subscription, lemonTestMode());
    const plan = (paid && plans.find((item) => item.code === subscription.plan_code)) || freePlan;

    return {
      role,
      subscription,
      plan,
      entitlements: plan?.limits || freePlan.limits,
      plans,
    };
  } catch (error) {
    if (!tableMissing(error)) {
      console.warn('Billing subscription fallback:', error.message);
    }

    return {
      role,
      subscription: {
        user_id: userId,
        plan_code: 'free',
        status: 'free',
        provider: 'fallback',
      },
      plan: freePlan,
      entitlements: freePlan.limits,
      plans,
    };
  }
};

exports.getUsage = async (userId, featureKey, periodKey = MONTHLY_PERIOD()) => {
  try {
    const { data, error } = await supabase
      .from('usage_counters')
      .select('*')
      .eq('user_id', userId)
      .eq('feature_key', featureKey)
      .eq('period_key', periodKey)
      .maybeSingle();

    if (error) throw error;
    return data || {
      user_id: userId,
      feature_key: featureKey,
      period_key: periodKey,
      used_count: 0,
      limit_count: null,
    };
  } catch (error) {
    if (!tableMissing(error)) {
      console.warn('Billing usage fallback:', error.message);
    }

    return {
      user_id: userId,
      feature_key: featureKey,
      period_key: periodKey,
      used_count: 0,
      limit_count: null,
      fallback: true,
    };
  }
};

exports.checkUsageLimit = async (userId, featureKey) => {
  const billing = await exports.getUserSubscription(userId);
  const limit = billing.entitlements?.[featureKey];
  const usage = await exports.getUsage(userId, featureKey);

  if (usage.fallback) throw Object.assign(new Error('Usage limits are temporarily unavailable. Please retry.'), {status:503});
  if (limit === undefined || limit === null) {
    return {
      allowed: true,
      featureKey,
      limit,
      used: usage.used_count || 0,
      remaining: null,
      billing,
    };
  }

  const used = Number(usage.used_count || 0);
  const allowed = used < Number(limit);

  return {
    allowed,
    featureKey,
    limit: Number(limit),
    used,
    remaining: Math.max(0, Number(limit) - used),
    billing,
  };
};

const checkoutSingleFlight = require('./checkoutSingleFlight').createCheckoutSingleFlight();
exports.createCheckout = ({ userId, planCode, interval = 'monthly' }) =>
  checkoutSingleFlight(userId, JSON.stringify([planCode, interval]), () => createCheckout({ userId, planCode, interval }));

const createCheckout = async ({ userId, planCode, interval = 'monthly' }) => {
  if (!['monthly', 'yearly'].includes(interval)) throw Object.assign(new Error('Invalid billing interval'), {status:400});
  const testPrice = founderTestPrice(lemonTestMode());
  if (testPrice && interval !== 'monthly') throw Object.assign(new Error('Test pricing supports monthly billing only.'), {status:400});
  const billing = await exports.getUserSubscription(userId);
  if (planCode !== 'free' && billing.role !== 'early-stage-founder') throw Object.assign(new Error('Investors have free access; Founder Pro requires a founder account.'), {status:403});
  const targetPlan = billing.plans.find((plan) => plan.code === planCode);

  if (!targetPlan) {
    throw new Error('Invalid plan selected');
  }

  if (targetPlan.code === 'free') {
    return {
      mode: 'manual',
      url: null,
      message: 'Free plan is already available.',
    };
  }

  if (targetPlan.code !== 'founder_pro') {
    return {
      mode: 'manual',
      url: null,
      message: 'This role has free ecosystem access. No paid upgrade is required.',
      plan: targetPlan,
    };
  }

  if (lemonConfigured()) {
    if (billing.subscription.provider_subscription_id && billing.subscription.status !== 'expired') {
      throw Object.assign(new Error('A subscription already exists. Use Manage Billing to change or resume it.'), {status:409});
    }
    const variantId = getPlanVariantId(targetPlan.code, interval);

    if (!variantId) {
      throw new Error(`Lemon Squeezy variant ID missing for ${targetPlan.code}. Set ${planVariantEnvKey(targetPlan.code)}.`);
    }

    const profile = await getProfile(userId);
    const variant = (await lemonRequest(`/variants/${encodeURIComponent(variantId)}`))?.data?.attributes;
    if (variant?.test_mode !== lemonTestMode() || !variant?.is_subscription || variant.interval !== (interval === 'yearly' ? 'year' : 'month') || variant.interval_count !== 1) {
      throw Object.assign(new Error('The configured payment interval is unavailable. Please contact support.'), {status:503});
    }
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    if (testPrice) {
      const store = (await lemonRequest(`/stores/${encodeURIComponent(process.env.LEMONSQUEEZY_STORE_ID)}`))?.data?.attributes;
      if (store?.currency !== 'PKR') throw Object.assign(new Error('Test checkout requires a PKR store.'), {status:503});
      if (Number(variant.price) !== testPrice.price_monthly * 100) throw Object.assign(new Error('Test variant price must match the displayed monthly price.'), {status:503});
    }
    if (!lemonTestMode() && !durableCheckoutEnabled()) {
      throw Object.assign(new Error('Live checkout protection must be enabled before accepting payments.'), {status:503});
    }
    const createProviderCheckout = async (reservationId) => {
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const checkout = await lemonRequest('/checkouts', {
      method: 'POST',
      body: {
        data: {
          type: 'checkouts',
          attributes: {
            test_mode: lemonTestMode(),
            expires_at: expiresAt,
            product_options: {
              enabled_variants: [Number(variantId)],
              redirect_url: `${frontendUrl.replace(/\/$/, '')}/billing?checkout=success`,
              receipt_button_text: 'Open ScaleScope billing',
              receipt_link_url: `${frontendUrl.replace(/\/$/, '')}/billing`,
            },
            checkout_data: {
              email: profile.email,
              name: profile.full_name,
              custom: {
                user_id: userId,
                ...(reservationId ? { checkout_reservation_id: reservationId } : {}),
                plan_code: targetPlan.code,
                role: billing.role,
                interval,
              },
            },
          },
          relationships: {
            store: {
              data: {
                type: 'stores',
                id: String(process.env.LEMONSQUEEZY_STORE_ID),
              },
            },
            variant: {
              data: {
                type: 'variants',
                id: String(variantId),
              },
            },
          },
        },
      },
    });

    return {
      url: safePaymentUrl(checkout?.data?.attributes?.url),
      checkoutId: checkout?.data?.id || null,
      expiresAt,
    };
    };
    const checkout = durableCheckoutEnabled()
      ? await reservedCheckout({ db: supabase, userId, testMode: lemonTestMode(), variantId, interval, create: createProviderCheckout })
      : await createProviderCheckout();
    return {
      mode: 'lemonsqueezy',
      url: safePaymentUrl(checkout.url),
      checkoutId: checkout.checkoutId,
      plan: targetPlan,
      testMode: lemonTestMode(),
    };
  }

  return {
    mode: 'manual',
    url: null,
    message: 'Paid upgrades are temporarily unavailable. Your current access is unchanged.',
    plan: targetPlan,
  };
};

exports.getBillingPortal = async (userId) => {
  const billing = await exports.getUserSubscription(userId);
  if (billing.subscription?.provider !== 'lemonsqueezy' || !billing.subscription.provider_subscription_id) {
    return {url:null,message:'No paid subscription exists for this account.'};
  }
  const record = (await lemonRequest(`/subscriptions/${encodeURIComponent(billing.subscription.provider_subscription_id)}`))?.data?.attributes;
  if (String(record?.store_id) !== String(process.env.LEMONSQUEEZY_STORE_ID) || record?.test_mode !== lemonTestMode() || String(record.customer_id) !== String(billing.subscription.provider_customer_id)) {
    throw Object.assign(new Error('Billing account could not be verified.'), {status:403});
  }
  const urls = record.urls || {};
  const portalUrl =
    urls.customer_portal ||
    urls.customer_portal_update_subscription ||
    urls.update_payment_method ||
    null;

  return {
    mode: billing.subscription?.provider || 'manual',
    url: safePaymentUrl(portalUrl),
    message: portalUrl
      ? 'Opening Lemon Squeezy billing portal.'
      : 'Billing portal becomes available after a Lemon Squeezy subscription is created.',
  };
};

function verifyLemonSignature(rawBody, signature) {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;

  if (!secret) {
    throw new Error('LEMONSQUEEZY_WEBHOOK_SECRET is not configured');
  }

  if (!rawBody || !/^[a-f0-9]{64}$/i.test(String(signature || ''))) {
    const error = new Error('Invalid Lemon Squeezy webhook signature');
    error.status = 400;
    throw error;
  }

  const expected = Buffer.from(
    crypto.createHmac('sha256', secret).update(rawBody).digest('hex'),
    'hex'
  );
  const received = Buffer.from(String(signature), 'hex');

  if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) {
    const error = new Error('Invalid Lemon Squeezy webhook signature');
    error.status = 400;
    throw error;
  }
}

const subscriptionEvents = new Set([
  'subscription_created', 'subscription_updated', 'subscription_cancelled',
  'subscription_resumed', 'subscription_expired', 'subscription_paused',
  'subscription_unpaused', 'subscription_plan_changed',
  'subscription_payment_success', 'subscription_payment_failed', 'subscription_payment_recovered',
]);

exports.handleLemonWebhook = async ({ rawBody, signature }) => {
  verifyLemonSignature(rawBody, signature);
  // Only the signed bytes are authoritative, never a separately supplied object.
  const payload = JSON.parse(rawBody.toString('utf8'));
  const eventName = payload?.meta?.event_name;
  if (!subscriptionEvents.has(eventName)) return {ignored:true, reason:'unsupported_event'};
  const resource = payload.data || {};
  const incoming = resource.attributes || {};
  const subscriptionId = resource.type === 'subscriptions' ? resource.id : incoming.subscription_id;
  if (!/^\d+$/.test(String(subscriptionId || ''))) throw Object.assign(new Error('Invalid subscription ID'), {status:400});
  const incomingMode = incoming.test_mode ?? payload.meta?.test_mode;
  if (incomingMode !== lemonTestMode()) return {ignored:true,reason:'wrong_mode'};
  // Re-read the provider's latest state so delayed invoice events cannot restore old access.
  const remote = (await lemonRequest('/subscriptions/' + subscriptionId))?.data;
  const attributes = remote?.attributes;
  if (!attributes || remote.type !== 'subscriptions' || String(remote.id) !== String(subscriptionId)) throw new Error('Subscription lookup failed');
  if (String(attributes.store_id) !== String(process.env.LEMONSQUEEZY_STORE_ID) || attributes.test_mode !== lemonTestMode()) return {ignored:true,reason:'wrong_store_or_mode'};
  const planCode = getPlanCodeByVariantId(attributes.variant_id);
  if (!planCode) throw Object.assign(new Error('Subscription variant is not configured'), {status:409});
  const {data:existing,error:lookupError} = await supabase.from('user_subscriptions').select('user_id').eq('provider_subscription_id',String(subscriptionId)).maybeSingle();
  if (lookupError) throw lookupError;
  const customUser = payload.meta?.custom_data?.user_id;
  if (existing && customUser && existing.user_id !== customUser) throw Object.assign(new Error('Subscription owner mismatch'),{status:409});
  const userId = existing?.user_id || customUser;
  if (!/^[0-9a-f-]{36}$/i.test(String(userId || ''))) throw Object.assign(new Error('Subscription account mapping missing'),{status:409});
  if (await getUserRole(userId) !== 'early-stage-founder') throw Object.assign(new Error('Paid plan requires founder role'),{status:409});
  const snapshot = {
    user_id:userId, plan_code:planCode, status:attributes.status, provider:'lemonsqueezy',
    provider_customer_id:String(attributes.customer_id), provider_subscription_id:String(subscriptionId),
    current_period_start:attributes.created_at,
    current_period_end:attributes.ends_at || (attributes.status === 'on_trial' ? attributes.trial_ends_at : attributes.renews_at),
    cancel_at_period_end:Boolean(attributes.cancelled),
    metadata:{lemon_event:eventName,variant_id:String(attributes.variant_id),test_mode:attributes.test_mode,provider_updated_at:attributes.updated_at},
  };
  if (!Number.isFinite(Date.parse(attributes.updated_at))) throw new Error('Subscription revision missing');
  const {data,error} = durableCheckoutEnabled()
    ? await supabase.rpc('complete_billing_checkout', {
      p_snapshot: snapshot,
      p_reservation_id: payload.meta?.custom_data?.checkout_reservation_id || null,
    })
    : await supabase.rpc('apply_lemon_subscription_snapshot',{p_snapshot:snapshot});
  if (error) throw error;
  return {eventName,result:data};
};
