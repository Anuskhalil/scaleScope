const crypto = require('crypto');
const supabase = require('../config/supabase');

const MONTHLY_PERIOD = () => new Date().toISOString().slice(0, 7);

const DEFAULT_PLANS = [
  {
    code: 'free',
    name: 'Free',
    role_scope: ['student', 'early-stage-founder', 'mentor', 'investor'],
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
    code: 'student_pro',
    name: 'Student Pro',
    role_scope: ['student'],
    price_monthly: 5,
    price_yearly: 48,
    currency: 'USD',
    description: 'For students who want better co-founder, mentor, and startup guidance.',
    features: {
      included: [
        '30 connection requests per month',
        'AI profile quality deep report',
        'Startup idea readiness score',
        'Portfolio/resume verification context',
        'Priority mentor and co-founder suggestions',
      ],
    },
    limits: {
      connection_requests: 30,
      ai_match_reports: 20,
      saved_profiles: 50,
      profile_boosts: 1,
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
  mentor: {
    name: 'Mentor Ecosystem Access',
    description: 'Free full access for mentors so the ecosystem has high-quality guidance supply.',
    features: {
      included: [
        'Free mentor profile and credibility signals',
        'High-quality 60%+ mentee matches on dashboard',
        'Full founder/student discovery access',
        'Advanced mentor-relevant filters',
        'Messaging and meetings after accepted connection',
      ],
    },
    limits: {
      connection_requests: 9999,
      ai_match_reports: 100,
      saved_profiles: 500,
      profile_boosts: 0,
    },
  },
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
const PAID_PLAN_CODES = ['student_pro', 'founder_pro'];

const planVariantEnvKey = (planCode) =>
  `LEMONSQUEEZY_${String(planCode || '').toUpperCase()}_VARIANT_ID`;

const lemonConfigured = () =>
  Boolean(
    process.env.LEMONSQUEEZY_API_KEY &&
    process.env.LEMONSQUEEZY_STORE_ID
  );

const lemonTestMode = () => String(process.env.LEMONSQUEEZY_TEST_MODE || 'true') !== 'false';

const getPlanVariantId = (planCode) => {
  const value = process.env[planVariantEnvKey(planCode)];
  return value ? String(value) : null;
};

const getPlanCodeByVariantId = (variantId) => {
  const found = PAID_PLAN_CODES.find((planCode) => {
    return getPlanVariantId(planCode) === String(variantId || '');
  });

  return found || null;
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

const normalizePlan = (plan = {}) => ({
  ...plan,
  role_scope: Array.isArray(plan.role_scope) ? plan.role_scope : [],
  features: plan.features && typeof plan.features === 'object' ? plan.features : { included: [] },
  limits: plan.limits && typeof plan.limits === 'object' ? plan.limits : {},
  price_monthly: Number(plan.price_monthly || 0),
  price_yearly: Number(plan.price_yearly || 0),
  currency: plan.currency || 'USD',
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
      return plan.code === 'free' || !role || plan.role_scope.includes(role);
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
  return data?.user_type || 'student';
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

    const plan = plans.find((item) => item.code === subscription.plan_code) || freePlan;

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

  if (usage.fallback || limit === undefined || limit === null) {
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

exports.incrementUsage = async (userId, featureKey, amount = 1) => {
  const periodKey = MONTHLY_PERIOD();
  const billing = await exports.getUserSubscription(userId);
  const limit = billing.entitlements?.[featureKey] ?? null;
  const current = await exports.getUsage(userId, featureKey, periodKey);

  if (current.fallback) {
    return current;
  }

  const nextCount = Number(current.used_count || 0) + Number(amount || 1);

  try {
    const { data, error } = await supabase
      .from('usage_counters')
      .upsert({
        user_id: userId,
        feature_key: featureKey,
        period_key: periodKey,
        used_count: nextCount,
        limit_count: limit,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,feature_key,period_key',
      })
      .select('*')
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    if (!tableMissing(error)) {
      console.warn('Billing increment skipped:', error.message);
    }

    return {
      user_id: userId,
      feature_key: featureKey,
      period_key: periodKey,
      used_count: nextCount,
      limit_count: limit,
      fallback: true,
    };
  }
};

exports.createCheckout = async ({ userId, planCode }) => {
  const billing = await exports.getUserSubscription(userId);
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

  if (!PAID_PLAN_CODES.includes(targetPlan.code)) {
    return {
      mode: 'manual',
      url: null,
      message: 'This role has free ecosystem access. No paid upgrade is required.',
      plan: targetPlan,
    };
  }

  if (lemonConfigured()) {
    const variantId = getPlanVariantId(targetPlan.code);

    if (!variantId) {
      throw new Error(`Lemon Squeezy variant ID missing for ${targetPlan.code}. Set ${planVariantEnvKey(targetPlan.code)}.`);
    }

    const profile = await getProfile(userId);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const checkout = await lemonRequest('/checkouts', {
      method: 'POST',
      body: {
        data: {
          type: 'checkouts',
          attributes: {
            test_mode: lemonTestMode(),
            product_options: {
              redirect_url: `${frontendUrl.replace(/\/$/, '')}/billing?checkout=success`,
              receipt_button_text: 'Open ScaleScope billing',
              receipt_link_url: `${frontendUrl.replace(/\/$/, '')}/billing`,
            },
            checkout_data: {
              email: profile.email,
              name: profile.full_name,
              custom: {
                user_id: userId,
                plan_code: targetPlan.code,
                role: billing.role,
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
      mode: 'lemonsqueezy',
      url: checkout?.data?.attributes?.url || null,
      checkoutId: checkout?.data?.id || null,
      plan: targetPlan,
      testMode: lemonTestMode(),
    };
  }

  return {
    mode: 'manual',
    url: null,
    message: 'Payment provider is not configured yet. Add Lemon Squeezy test API keys and variant IDs before live payments.',
    plan: targetPlan,
  };
};

exports.getBillingPortal = async (userId) => {
  const billing = await exports.getUserSubscription(userId);
  const urls = billing.subscription?.metadata?.urls || {};
  const portalUrl =
    urls.customer_portal ||
    urls.customer_portal_update_subscription ||
    urls.update_payment_method ||
    null;

  return {
    mode: billing.subscription?.provider || 'manual',
    url: portalUrl,
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

  if (!rawBody || !signature) {
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

const subscriptionStatusForEvent = (eventName, attributes = {}) => {
  if (eventName === 'subscription_cancelled') return 'cancelled';
  if (eventName === 'subscription_expired') return 'expired';
  if (eventName === 'subscription_paused') return 'paused';
  if (eventName === 'subscription_unpaused') return 'active';
  if (eventName === 'subscription_payment_failed') return 'past_due';

  return attributes.status || 'active';
};

const isPaidOrderEvent = (eventName, attributes = {}) => {
  if (eventName !== 'order_created') return false;
  return ['paid', 'success', 'complete', 'completed'].includes(
    String(attributes.status || '').toLowerCase()
  );
};

const getWebhookVariantId = (attributes = {}) => {
  return (
    attributes.variant_id ||
    attributes.first_subscription_item?.variant_id ||
    attributes.first_order_item?.variant_id ||
    attributes.order_item?.variant_id ||
    null
  );
};

async function getUserIdFromWebhook({ customData = {}, attributes = {} }) {
  if (customData.user_id) return customData.user_id;

  const email = attributes.user_email || attributes.email || attributes.customer_email;
  if (!email) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .ilike('email', String(email).trim())
    .maybeSingle();

  if (error) throw error;
  return data?.id || null;
}

exports.handleLemonWebhook = async ({ rawBody, signature, payload }) => {
  verifyLemonSignature(rawBody, signature);

  const eventName = payload?.meta?.event_name;
  const data = payload?.data || {};
  const attributes = data.attributes || {};
  const customData = payload?.meta?.custom_data || {};
  const variantId = getWebhookVariantId(attributes);
  const planCode = customData.plan_code || getPlanCodeByVariantId(variantId);
  const userId = await getUserIdFromWebhook({ customData, attributes });

  if (!eventName) {
    throw new Error('Lemon Squeezy webhook event_name missing');
  }

  if (!eventName.startsWith('subscription_') && !isPaidOrderEvent(eventName, attributes)) {
    return {
      ignored: true,
      eventName,
    };
  }

  if (!userId || !planCode) {
    console.warn('Lemon webhook missing user/plan mapping:', {
      eventName,
      userId,
      planCode,
      variantId,
    });

    return {
      ignored: true,
      eventName,
      reason: 'missing_user_or_plan',
    };
  }

  const status = eventName === 'order_created'
    ? 'active'
    : subscriptionStatusForEvent(eventName, attributes);
  const activePlanCode = ['cancelled', 'expired'].includes(status) ? 'free' : planCode;
  const providerSubscriptionId = data.type === 'subscriptions' && data.id
    ? String(data.id)
    : null;

  const { data: subscription, error } = await supabase
    .from('user_subscriptions')
    .upsert(
      {
        user_id: userId,
        plan_code: activePlanCode,
        status,
        provider: 'lemonsqueezy',
        provider_customer_id: attributes.customer_id ? String(attributes.customer_id) : null,
        provider_subscription_id: providerSubscriptionId,
        current_period_start: attributes.created_at || null,
        current_period_end: attributes.renews_at || attributes.ends_at || null,
        cancel_at_period_end: Boolean(attributes.cancelled || attributes.ends_at),
        metadata: {
          lemon_event: eventName,
          variant_id: variantId ? String(variantId) : null,
          product_id: attributes.product_id ? String(attributes.product_id) : null,
          order_id: attributes.order_id ? String(attributes.order_id) : data.id ? String(data.id) : null,
          order_number: attributes.order_number || null,
          order_identifier: attributes.identifier || null,
          user_email: attributes.user_email || null,
          test_mode: Boolean(attributes.test_mode),
          urls: attributes.urls || {},
          updated_at: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    )
    .select('*')
    .single();

  if (error) throw error;

  return {
    eventName,
    subscription,
  };
};
