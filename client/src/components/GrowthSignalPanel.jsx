import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle, Circle, Loader, RefreshCw, Shield, Sparkles } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { getGrowthSignals } from '../services/growthSignalsService';
import { backendApi } from '../lib/backendApi';

export default function GrowthSignalPanel({ profile, founderProfile, investorProfile, role, compact = false, enableAI = false }) {
  const { user } = useAuth();
  const owner = Boolean(user?.id && profile?.id === user.id);
  const local = useMemo(() => getGrowthSignals({ profile, founderProfile, investorProfile, role }),
    [profile, founderProfile, investorProfile, role]);
  const fingerprint = JSON.stringify([profile?.id, local]);
  const [remote, setRemote] = useState(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!owner || !enableAI || !local) return undefined;
    let cancelled = false;
    setRemote({ key: fingerprint, loading: true });
    backendApi.getGrowthPlan({}).then(plan => {
      if (!cancelled) setRemote({ key: fingerprint, plan, loading: false });
    }).catch(() => {
      if (!cancelled) setRemote({ key: fingerprint, error: true, loading: false });
    });
    return () => { cancelled = true; };
  // The fingerprint includes all derived facts and the signed-in profile ID.
  }, [owner, enableAI, fingerprint, attempt]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!owner || !local) return null;
  const current = remote?.key === fingerprint ? remote : null;
  const server = current?.plan?.signals;
  const signals = server?.version === local.version && server?.role === local.role ? server : local;
  const top = signals.actions.slice(0, 3);
  const rest = signals.actions.slice(3);
  const evidenceProvided = signals.evidence.some(e => !['Not recorded','Not confirmed'].includes(e.status));
  const action = (item, index) => <li key={item.id} className="border-t border-gray-100 py-4 first:border-t-0">
    <div className="flex items-start gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#98DE38] text-xs font-bold text-[#1B2D7F]">{index + 1}</span>
      <div className="min-w-0 flex-1">
        <h3 className="text-sm font-bold text-gray-900 break-words">{item.title}</h3>
        <p className="mt-1 text-xs text-gray-500"><strong>Why now:</strong> {item.reason}</p>
        <p className="mt-2 text-sm leading-relaxed text-gray-700">{item.outcome}</p>
        <Link to={item.to} className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[#1B2D7F] hover:underline">
          {item.to.endsWith('/profile') ? 'Review profile' : 'Review matches'}<ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  </li>;
  return <section className="min-w-0 bg-white p-4 sm:p-6 border-y border-gray-200">
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="flex items-center gap-2 font-bold text-gray-900"><Sparkles className="h-5 w-5 text-[#1B2D7F]" />Growth Signals</h2>
        <p className="mt-1 text-sm text-gray-600">{signals.stage}</p>
      </div>
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <Shield className="h-4 w-4" />Private to you
        {enableAI && <button type="button" onClick={() => setAttempt(n => n + 1)} disabled={current?.loading}
          aria-label="Refresh growth guidance" title="Refresh growth guidance" className="rounded p-2 text-[#1B2D7F] hover:bg-gray-100 disabled:opacity-50">
          {current?.loading ? <Loader className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </button>}
      </div>
    </header>
    <div className="mt-5 grid gap-5 md:grid-cols-2">
      <div className="min-w-0">
        <div className="flex justify-between gap-3 text-sm font-semibold text-[#1B2D7F]"><span>{signals.role === 'investor' ? 'Mandate clarity' : 'Profile clarity'}</span><span>{signals.clarity.score}%</span></div>
        <div role="progressbar" aria-label="Profile clarity" aria-valuemin={0} aria-valuemax={100} aria-valuenow={signals.clarity.score} className="mt-2 h-2 w-full overflow-hidden rounded bg-gray-100"><div className="h-full bg-[#98DE38]" style={{ width: signals.clarity.score + '%' }} /></div>
        <p className="mt-2 text-xs text-gray-500">{signals.clarity.checks.filter(c => c.done).length} of {signals.clarity.checks.length} relevant details recorded. Not a trust, verification or funding score.</p>
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-[#1B2D7F]">Evidence context</p>
        {signals.evidence.map(item => <p key={item.label} className="mt-1 text-xs text-gray-600"><strong>{item.label}:</strong> {item.status}</p>)}
        <p className="mt-2 text-xs text-gray-500">{evidenceProvided ? 'Provided information still needs appropriate review.' : 'Missing evidence does not mean a claim is false.'}</p>
      </div>
    </div>
    <div className="mt-5 border-t border-gray-200 pt-4">
      <h3 className="text-sm font-bold text-[#1B2D7F]">Next priorities</h3>
      <p className="mt-1 text-xs text-gray-500">Suggested actions, not completed milestones. Keep sensitive documents private; connect before messaging.</p>
      <ol>{top.map(action)}</ol>
      {rest.length > 0 && <details open={!compact}><summary className="cursor-pointer text-sm font-semibold text-[#1B2D7F]">More actions ({rest.length})</summary><ol>{rest.map((item, index) => action(item, index + 3))}</ol></details>}
    </div>
    <details className="border-t border-gray-200 pt-3">
      <summary className="cursor-pointer text-sm font-semibold text-[#1B2D7F]">Profile clarity breakdown</summary>
      <ul className="mt-3 grid gap-2 sm:grid-cols-2">{signals.clarity.checks.map(item => <li key={item.id} className="flex items-center gap-2 text-xs text-gray-600">
        {item.done ? <CheckCircle aria-label="Recorded" className="h-4 w-4 shrink-0 text-[#1B2D7F]" /> : <Circle aria-label="Missing" className="h-4 w-4 shrink-0 text-gray-400" />}{item.label}
      </li>)}</ul>
    </details>
    <footer className="mt-4 space-y-1 text-xs text-gray-500">
      <p>{current?.loading ? 'Checking priorities...' : current?.plan?.ai_enabled ? 'AI-prioritized actions; facts and scores use fixed rules.' : current?.error ? 'Server unavailable. Showing profile-based guidance.' : current?.plan?.reason || 'Stage-based guidance from your profile.'}</p>
      <p>Guidance is not a guarantee of compatibility, authenticity or investment.</p>
    </footer>
  </section>;
}
