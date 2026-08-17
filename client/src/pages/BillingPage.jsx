import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle,
  CreditCard,
  Loader,
  RefreshCw,
  Shield,
  Sparkles,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { backendApi } from '../lib/backendApi';

const CSS = `
  :root {
    --primary: #98DE38;
    --primary-dark: #7EC42E;
    --secondary: #1B2D7F;
    --secondary-light: #2A3F8F;
    --gray-50: #F9FAFB;
  }
  .page-bg { background: var(--gray-50); background-image: radial-gradient(circle, rgba(152,222,56,.06) 1px, transparent 1px); background-size: 28px 28px; }
  .g-brand { background: linear-gradient(135deg, var(--primary), var(--primary-dark)); }
  .g-sec { background: linear-gradient(135deg, var(--secondary), var(--secondary-light)); }
  .lift { transition: transform .2s cubic-bezier(.22,.68,0,1.2), box-shadow .2s ease; }
  .lift:hover { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(27,45,127,.12); }
`;

const usagePercent = (used, limit) => {
  if (!Number(limit)) return 0;
  return Math.max(0, Math.min(100, Math.round((Number(used || 0) / Number(limit)) * 100)));
};

const formatLimit = (value) => {
  const number = Number(value);

  if (!Number.isFinite(number)) return value;
  if (number >= 9999) return 'Full access';

  return number.toLocaleString();
};

export default function BillingPage() {
  const [state, setState] = useState({
    loading: true,
    error: null,
    billing: null,
    usage: null,
  });

  const load = async () => {
    try {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      const [billing, usage] = await Promise.all([
        backendApi.getMyBilling(),
        backendApi.getBillingUsage('connection_requests'),
      ]);

      setState({
        loading: false,
        error: null,
        billing,
        usage,
      });
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error.message || 'Could not load billing',
      }));
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handlePortal = async () => {
    try {
      const portal = await backendApi.openBillingPortal();
      if (portal.url) {
        window.location.href = portal.url;
        return;
      }

      toast(portal.message || 'Billing portal is not configured yet.', {
        style: { background: '#1B2D7F', color: '#fff' },
      });
    } catch (error) {
      toast.error(error.message || 'Could not open billing portal');
    }
  };

  const billing = state.billing || {};
  const plan = billing.plan || {};
  const subscription = billing.subscription || {};
  const limit = state.usage?.limit || {};
  const used = limit.used || state.usage?.usage?.used_count || 0;
  const max = limit.limit ?? plan.limits?.connection_requests ?? 0;
  const pct = usagePercent(used, max);
  const ecosystemAccess = plan.metadata?.ecosystem_access || ['mentor', 'investor'].includes(billing.role);

  return (
    <>
      <style>{CSS}</style>
      <div className="min-h-screen page-bg pt-20 pb-16 px-4">
        <div className="max-w-5xl mx-auto">
          <header className="mb-8">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-50 text-green-700 border border-green-200 text-xs font-black uppercase">
              <CreditCard className="w-3.5" />
              Billing
            </span>
            <h1 className="text-3xl sm:text-4xl font-black text-gray-900 mt-3">
              Plan, limits, and billing status
            </h1>
            <p className="text-sm text-gray-500 mt-2 max-w-2xl">
              {ecosystemAccess
                ? 'Mentors and investors receive free ecosystem access so the platform can keep guidance and deal-flow strong.'
                : 'Your billing plan controls outreach limits and premium matching features. Messaging after accepted connections remains available.'}
            </p>
          </header>

          {state.loading ? (
            <div className="min-h-[300px] flex items-center justify-center">
              <Loader className="w-8 h-8 animate-spin text-[#1B2D7F]" />
            </div>
          ) : state.error ? (
            <div className="bg-white rounded-2xl border border-red-100 p-6 text-center">
              <p className="font-bold text-red-600">Could not load billing</p>
              <p className="text-sm text-gray-500 mt-1">{state.error}</p>
              <button type="button" onClick={load} className="mt-4 px-4 py-2 g-brand text-black rounded-xl text-sm font-black">
                Try again
              </button>
            </div>
          ) : (
            <div className="grid lg:grid-cols-3 gap-5">
              <section className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6 lift">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div>
                    <p className="text-xs font-black text-[#1B2D7F] uppercase">Current plan</p>
                    <h2 className="text-2xl font-black text-gray-900 mt-1">{plan.name || 'Free'}</h2>
                    <p className="text-sm text-gray-500 mt-2">{plan.description || 'Basic ScaleScope access.'}</p>
                  </div>

                  <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-[#98DE38]/20 text-[#1B2D7F] text-xs font-black uppercase">
                    <CheckCircle className="w-3.5" />
                    {subscription.status || 'free'}
                  </span>
                </div>

                <div className="mt-6 rounded-2xl bg-gray-50 border border-gray-100 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-gray-900">Connection requests</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Used this month: {used}{Number(max) ? ` / ${formatLimit(max)}` : ''}
                      </p>
                    </div>
                    <p className="text-2xl font-black text-gray-900">
                      {ecosystemAccess ? 'Open' : `${pct}%`}
                    </p>
                  </div>

                  <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden mt-3">
                    <div className="h-full g-brand rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-3 mt-5">
                  {(plan.features?.included || []).slice(0, 6).map((feature) => (
                    <div key={feature} className="flex items-start gap-2 p-3 rounded-xl bg-gray-50">
                      <CheckCircle className="w-4 text-[#98DE38] flex-shrink-0 mt-0.5" />
                      <span className="text-sm text-gray-600">{feature}</span>
                    </div>
                  ))}
                </div>
              </section>

              <aside className="space-y-5">
                <div className="g-sec rounded-2xl p-5 text-white">
                  <Shield className="w-6 mb-3" />
                  <h3 className="font-black text-lg">
                    {ecosystemAccess ? 'Free ecosystem access' : 'Upgrade when you need scale'}
                  </h3>
                  <p className="text-sm text-white/70 mt-2">
                    {ecosystemAccess
                      ? 'No paid plan is required for mentors and investors. Keep your profile strong to receive better matches.'
                      : 'Premium plans unlock deeper AI reports, more requests, and role-specific advanced discovery.'}
                  </p>
                  <Link to="/pricing" className="mt-4 w-full py-2.5 g-brand text-black rounded-xl text-sm font-black flex items-center justify-center gap-2">
                    {ecosystemAccess ? 'View Access' : 'View Plans'} <ArrowRight className="w-4" />
                  </Link>
                </div>

                <div className="bg-white rounded-2xl border border-gray-100 p-5">
                  <h3 className="font-black text-gray-900 flex items-center gap-2">
                    <Sparkles className="w-4 text-[#1B2D7F]" />
                    Billing actions
                  </h3>
                  {!ecosystemAccess && (
                    <button
                      type="button"
                      onClick={handlePortal}
                      className="mt-4 w-full py-2.5 border border-gray-200 rounded-xl text-sm font-black text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2"
                    >
                      <CreditCard className="w-4" />
                      Manage Billing
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={load}
                    className="mt-2 w-full py-2.5 border border-gray-200 rounded-xl text-sm font-black text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-4" />
                    Refresh
                  </button>
                  <p className="text-xs text-gray-400 mt-3">
                    {ecosystemAccess
                      ? 'Billing is not required for mentor and investor ecosystem access.'
                      : 'Payment portal becomes active after a Lemon Squeezy test subscription is created.'}
                  </p>
                </div>
              </aside>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
