import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle,
  Loader,
  Rocket,
  Shield,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { backendApi } from '../lib/backendApi';
import { useAuth } from '../auth/AuthContext';

const CSS = `
  :root {
    --primary: #98DE38;
    --primary-dark: #7EC42E;
    --secondary: #1B2D7F;
    --secondary-light: #2A3F8F;
    --gray-50: #F9FAFB;
    --gray-100: #F3F4F6;
    --gray-200: #E5E7EB;
  }
  .page-bg { background: var(--gray-50); background-image: radial-gradient(circle, rgba(152,222,56,.06) 1px, transparent 1px); background-size: 28px 28px; }
  .g-brand { background: linear-gradient(135deg, var(--primary), var(--primary-dark)); }
  .g-sec { background: linear-gradient(135deg, var(--secondary), var(--secondary-light)); }
  .lift { transition: transform .2s cubic-bezier(.22,.68,0,1.2), box-shadow .2s ease; }
  .lift:hover { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(27,45,127,.12); }
`;

const roleFilters = [
  { label: 'All', value: '', Icon: Sparkles },
  { label: 'Founders', value: 'early-stage-founder', Icon: Rocket },
  { label: 'Investors', value: 'investor', Icon: TrendingUp },
];

const formatPrice = (plan, yearly) => {
  if (plan.code === 'founder_pro' && !plan.pricing_finalized) return 'Price to be confirmed';
  if (plan.metadata?.ecosystem_access) return 'Free';

  const value = yearly ? plan.price_yearly : plan.price_monthly;
  if (!Number(value)) return 'Free';

  const price = new Intl.NumberFormat('en-US', { style: 'currency', currency: plan.currency || 'USD' }).format(Number(value));
  return `${price}/${yearly ? 'yr' : 'mo'}`;
};

const included = (plan) => {
  const features = plan.features || {};
  return Array.isArray(features.included) ? features.included : [];
};

const limitRows = (plan) => {
  const limits = plan.limits || {};
  return [['Connection requests / month', limits.connection_requests]]
    .filter(([, value]) => value !== undefined && value !== null);
};

const formatLimit = (value) => {
  const number = Number(value);

  if (!Number.isFinite(number)) return value;
  if (number >= 9999) return 'Full access';

  return number.toLocaleString();
};

export default function PricingPage() {
  const { session, profile } = useAuth();
  const [plans, setPlans] = useState([]);
  const [role, setRole] = useState(profile?.user_type || '');
  const [yearly, setYearly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [checkoutPlan, setCheckoutPlan] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function loadPlans() {
      try {
        setLoading(true);
        const data = await backendApi.getBillingPlans(role || undefined);
        if (!cancelled) setPlans(data || []);
      } catch (error) {
        if (!cancelled) {
          toast.error(error.message || 'Could not load pricing');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadPlans();

    return () => {
      cancelled = true;
    };
  }, [role]);

  const visiblePlans = useMemo(() => {
    if (!role) return plans;
    return plans.filter((plan) => {
      return plan.code === 'free' || (plan.role_scope || []).includes(role);
    });
  }, [plans, role]);

  const handleSelectPlan = async (plan) => {
    if (checkoutPlan) return;
    if (!session) {
      window.location.href = '/register';
      return;
    }

    if (plan.code === 'free') {
      window.location.href = '/billing';
      return;
    }

    try {
      setCheckoutPlan(plan.code);
      const checkout = await backendApi.createBillingCheckout(plan.code, yearly ? 'yearly' : 'monthly');

      if (checkout.url) {
        window.location.href = checkout.url;
        return;
      }

      toast(checkout.message || 'Payment provider is not configured yet.', {
        style: { background: '#1B2D7F', color: '#fff' },
      });
    } catch (error) {
      toast.error(error.message || 'Could not start checkout');
    } finally {
      setCheckoutPlan(null);
    }
  };

  const recommendedRole = profile?.user_type || role;
  const ecosystemRole = ['investor'].includes(role || profile?.user_type);

  return (
    <>
      <style>{CSS}</style>
      <div className="min-h-screen page-bg py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <header className="text-center max-w-3xl mx-auto mb-10">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-50 text-green-700 border border-green-200 text-xs font-black uppercase">
              <Shield className="w-3.5" />
              Plans and pricing
            </span>
            <h1 className="text-3xl sm:text-5xl font-black text-gray-900 mt-4">
              ScaleScope plans
            </h1>
            <p className="text-sm sm:text-base text-gray-500 mt-4">
              Early Founders can upgrade for more connection requests. Investors have free ecosystem access.
              Paid plans do not buy verification, approval, or a better match score.
            </p>
          </header>

          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
            <div className="flex flex-wrap gap-2">
              {roleFilters.map((item) => {
                const active = role === item.value;
                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => setRole(item.value)}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-bold transition ${
                      active
                        ? 'g-brand text-black border-transparent'
                        : 'bg-white border-gray-200 text-gray-600 hover:border-[#98DE38]'
                    }`}
                  >
                    <item.Icon className="w-4" />
                    {item.label}
                  </button>
                );
              })}
            </div>

            {!ecosystemRole && (
              <div className="bg-white border border-gray-200 rounded-xl p-1 inline-flex">
              <button
                type="button"
                onClick={() => setYearly(false)}
                className={`px-4 py-2 rounded-lg text-xs font-black ${!yearly ? 'g-sec text-white' : 'text-gray-500'}`}
              >
                Monthly
              </button>
              <button
                type="button"
                onClick={() => setYearly(true)}
                className={`px-4 py-2 rounded-lg text-xs font-black ${yearly ? 'g-sec text-white' : 'text-gray-500'}`}
              >
                Yearly
              </button>
              </div>
            )}
          </div>

          {ecosystemRole && (
            <div className="mb-6 bg-white border border-green-200 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-sm font-black text-[#1B2D7F]">
                  Investors are free on ScaleScope
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Investors have free full access. Student and professional Early Founders can choose Free or Founder Pro.
                </p>
              </div>
              <span className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-[#98DE38]/20 text-[#1B2D7F] text-xs font-black uppercase">
                No paid upgrade required
              </span>
            </div>
          )}

          {loading ? (
            <div className="min-h-[320px] flex items-center justify-center">
              <Loader className="w-8 h-8 animate-spin text-[#1B2D7F]" />
            </div>
          ) : (
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
              {visiblePlans.map((plan) => {
                const suggested =
                  recommendedRole &&
                  plan.code !== 'free' &&
                  (plan.role_scope || []).includes(recommendedRole);

                return (
                  <article
                    key={plan.code}
                    className={`bg-white rounded-2xl border p-5 lift ${
                      suggested ? 'border-[#98DE38] shadow-sm' : 'border-gray-100'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-black text-[#1B2D7F] uppercase">
                          {plan.metadata?.ecosystem_access
                            ? 'free ecosystem access'
                            : (plan.role_scope || []).join(', ').replace(/early-stage-founder/g, 'founder') || 'all roles'}
                        </p>
                        <h2 className="text-xl font-black text-gray-900 mt-1">{plan.name}</h2>
                      </div>

                      {suggested && (
                        <span className="px-2.5 py-1 rounded-full bg-[#98DE38]/20 text-[#1B2D7F] text-[11px] font-black">
                          Best fit
                        </span>
                      )}
                    </div>

                    <p className="text-sm text-gray-500 mt-3 min-h-10">{plan.description}</p>

                    <div className="mt-5">
                      <p className="text-3xl font-black text-gray-900">{formatPrice(plan, yearly)}</p>
                      {plan.pricing_finalized && Number(plan.price_yearly) > 0 && yearly && (
                        <p className="text-xs text-gray-400 mt-1">
                          Billed annually. Taxes and any discounts are shown at checkout.
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSelectPlan(plan)}
                      disabled={Boolean(checkoutPlan) || (plan.code !== 'free' && (!plan.checkout_intervals?.includes(yearly ? 'yearly' : 'monthly') || (session && profile?.user_type !== 'early-stage-founder')))}
                      className={`w-full mt-5 py-3 rounded-xl text-sm font-black flex items-center justify-center gap-2 disabled:opacity-60 ${
                        plan.code === 'free'
                          ? 'border-2 border-gray-200 text-gray-700 bg-white hover:bg-gray-50'
                          : 'g-brand text-black hover:opacity-90'
                      }`}
                    >
                      {checkoutPlan === plan.code ? <Loader className="w-4 animate-spin" /> : null}
                      {plan.metadata?.ecosystem_access ? 'Use Free Access' : plan.code === 'free' ? 'Start Free' : !plan.checkout_intervals?.includes(yearly ? 'yearly' : 'monthly') ? 'Currently unavailable' : `Continue with ${yearly ? 'yearly' : 'monthly'} Pro`}
                      <ArrowRight className="w-4" />
                    </button>

                    <ul className="mt-5 space-y-3">
                      {included(plan).map((feature) => (
                        <li key={feature} className="flex items-start gap-2 text-sm text-gray-600">
                          <CheckCircle className="w-4 text-[#98DE38] flex-shrink-0 mt-0.5" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="mt-5 pt-4 border-t border-gray-100">
                      <p className="text-xs font-black text-[#1B2D7F] uppercase mb-3">
                        Plan limits
                      </p>
                      <div className="space-y-2">
                        {limitRows(plan).map(([label, value]) => (
                          <div key={label} className="flex items-center justify-between gap-3 text-xs">
                            <span className="text-gray-500">{label}</span>
                            <span className="font-black text-gray-900">{formatLimit(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          <section className="mt-10 bg-gray-900 text-white rounded-2xl p-6">
            <div className="grid lg:grid-cols-3 gap-5 items-center">
              <div className="lg:col-span-2">
                <h2 className="text-xl font-black">Manage your subscription</h2>
                <p className="text-sm text-gray-300 mt-2">
                  Checkout and payment details are handled by Lemon Squeezy. Review the total before paying.
                  Manage renewal or cancellation from Billing. Your plan updates after payment confirmation.
                </p>
              </div>

              <Link
                to={session ? '/billing' : '/register'}
                className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl g-brand text-black text-sm font-black"
              >
                {session ? 'View Billing' : 'Create Account'}
                <ArrowRight className="w-4" />
              </Link>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
