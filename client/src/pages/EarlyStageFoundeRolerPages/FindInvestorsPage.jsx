// src/pages/FounderRolePages/FindInvestorsPage.jsx
// Source: investor_profiles + profiles
// Shows: firm_name, investment_stage, ticket_size, industries
// CTA: Send Pitch → connection_request (type: 'investor_contact')

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import {
  fetchInvestors,
  sendConnectionRequest,
  getOrCreateConversation,
  formatCheckSize,
} from '../../services/founderService';
import {
  Search, DollarSign, MessageSquare, Send, CheckCircle,
  MapPin, Filter, Loader, AlertTriangle, RefreshCw,
  ChevronRight, X, Sparkles, Building2, TrendingUp,
  Globe, Linkedin, Twitter, ExternalLink,
} from 'lucide-react';

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800;900&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap');
  .ss{font-family:'Syne',sans-serif}.dm{font-family:'DM Sans',sans-serif}
  .lift{transition:transform .22s cubic-bezier(.22,.68,0,1.2),box-shadow .22s ease}
  .lift:hover{transform:translateY(-3px);box-shadow:0 16px 44px rgba(5,150,105,.09)}
  .g-found{background:linear-gradient(135deg,#f59e0b,#ef4444)}
  .g-em{background:linear-gradient(135deg,#059669,#0891b2)}
  .page-bg{background-color:#f0fdf4;background-image:radial-gradient(circle,#86efac 1px,transparent 1px);background-size:28px 28px}
  .chip{display:inline-flex;align-items:center;padding:3px 10px;border-radius:999px;font-size:11px;font-weight:600;cursor:pointer;border:1.5px solid #e2e8f0;background:#fff;color:#64748b;transition:all .14s}
  .chip:hover{border-color:#6ee7b7;color:#065f46}
  .chip.on{background:#ecfdf5;border-color:#6ee7b7;color:#065f46}
  .filter-panel{border-bottom:1px solid #f3f4f6;padding-bottom:16px;margin-bottom:16px}
  .filter-panel:last-child{border-bottom:none;padding-bottom:0;margin-bottom:0}
  .slide-in{animation:si .28s cubic-bezier(.32,.72,0,1) both}
  @keyframes si{from{opacity:0;transform:translateX(24px)}to{opacity:1;transform:none}}
  .f0{animation:fu .32s ease both}.f1{animation:fu .32s .06s ease both}
  .f2{animation:fu .32s .12s ease both}
  @keyframes fu{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
  .shimmer{background:linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%);background-size:200% 100%;animation:sh 1.4s infinite;border-radius:12px}
  @keyframes sh{0%{background-position:200% 0}100%{background-position:-200% 0}}
  .modal-pop{animation:mp .22s cubic-bezier(.34,1.4,.64,1) both}
  @keyframes mp{from{opacity:0;transform:scale(.95)}to{opacity:1;transform:scale(1)}}
  .inp{width:100%;padding:10px 14px;border:1.5px solid #e2e8f0;border-radius:12px;font-size:13px;outline:none;font-family:'DM Sans',sans-serif;transition:border-color .14s;background:#fff}
  .inp:focus{border-color:#059669}
  .ta{width:100%;padding:10px 14px;border:2px solid #e2e8f0;border-radius:12px;font-size:14px;outline:none;resize:none;font-family:'DM Sans',sans-serif;transition:border-color .14s;background:#f8fafc}
  .ta:focus{border-color:#059669;background:#fff}
  .verify-badge{display:inline-flex;align-items:center;gap:3px;padding:2px 8px;border-radius:999px;font-size:10px;font-weight:700;background:#ecfdf5;color:#059669;border:1.5px solid #6ee7b7}
`;

const STAGE_OPTS    = ['Pre-seed','Seed','Series A','Series B','Series B+'];
const INDUSTRY_OPTS = ['EdTech','HealthTech','FinTech','SaaS','AgriTech','CleanTech','LegalTech','HRTech','E-commerce','AI / ML','Social Impact'];
const LOCATION_OPTS = ['Pakistan','Dubai','Singapore','USA','UK','Remote'];

function initials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}
function gradFor(id) {
  const g = ['from-emerald-500 to-teal-500','from-blue-500 to-indigo-500',
             'from-violet-500 to-indigo-500','from-amber-500 to-orange-500',
             'from-cyan-500 to-teal-500','from-rose-500 to-pink-500'];
  return g[((id || '').charCodeAt?.(0) || 0) % g.length];
}

// ── Investor Card ─────────────────────────────────────────────────────────
function InvestorCard({ investor, onPitch, onMessage, pitchState }) {
  const p      = investor.profiles || {};
  const stages = investor.preferred_stages || investor.investment_stage || [];
  const inds   = investor.preferred_industries || investor.industries_of_interest || [];
  const ticket = investor.check_range_min || investor.check_range_max
    ? formatCheckSize(investor.check_range_min, investor.check_range_max)
    : investor.ticket_size_min || investor.ticket_size_max
      ? formatCheckSize(investor.ticket_size_min, investor.ticket_size_max)
      : null;
  const uid    = investor.profile_id || investor.user_id;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm lift">
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${gradFor(uid)} flex items-center justify-center text-white text-sm font-bold ss flex-shrink-0`}>
            {initials(p.full_name)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-bold text-slate-900 ss leading-tight truncate">{p.full_name || 'Investor'}</p>
                <p className="text-xs text-emerald-700 font-semibold truncate">
                  {investor.fund_name || investor.firm_name || investor.investor_type || 'Independent Investor'}
                </p>
              </div>
              {(investor.is_verified || investor.accepting_pitches) && (
                <span className="verify-badge flex-shrink-0">✓ Active</span>
              )}
            </div>
            {p.location && (
              <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3" />{p.location}
                {investor.geography_focus && <> · {investor.geography_focus}</>}
              </p>
            )}
          </div>
        </div>

        {/* Bio / thesis snippet */}
        {(p.bio || investor.what_i_look_for || investor.investment_thesis) && (
          <p className="text-xs text-slate-600 leading-relaxed mb-3 line-clamp-2">
            {p.bio || investor.what_i_look_for || investor.investment_thesis}
          </p>
        )}

        {/* Stages */}
        {stages.length > 0 && (
          <div className="mb-2">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Invests In</p>
            <div className="flex flex-wrap gap-1.5">
              {stages.map((s, i) => (
                <span key={i} className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-100 px-2 py-0.5 rounded-full font-semibold">{s}</span>
              ))}
            </div>
          </div>
        )}

        {/* Industries */}
        {inds.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Industries</p>
            <div className="flex flex-wrap gap-1.5">
              {inds.slice(0, 4).map((ind, i) => (
                <span key={i} className="text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full font-medium">{ind}</span>
              ))}
              {inds.length > 4 && <span className="text-xs text-slate-400">+{inds.length - 4}</span>}
            </div>
          </div>
        )}

        {/* Ticket + portfolio stats */}
        <div className="flex items-center gap-3 mb-4 p-3 bg-emerald-50/50 rounded-xl border border-emerald-100/50">
          {ticket && (
            <div className="flex-1 text-center">
              <p className="text-xs text-slate-400 mb-0.5">Ticket Size</p>
              <p className="font-black text-emerald-700 ss text-sm">{ticket}</p>
            </div>
          )}
          {(investor.total_investments || investor.portfolio_count) && (
            <div className="flex-1 text-center">
              <p className="text-xs text-slate-400 mb-0.5">Portfolio</p>
              <p className="font-black text-slate-800 ss text-sm">{investor.total_investments || investor.portfolio_count} cos</p>
            </div>
          )}
          {(investor.exits || investor.successful_exits) && (
            <div className="flex-1 text-center">
              <p className="text-xs text-slate-400 mb-0.5">Exits</p>
              <p className="font-black text-emerald-700 ss text-sm">{investor.exits || investor.successful_exits}</p>
            </div>
          )}
        </div>

        {/* Social links */}
        <div className="flex gap-2 mb-4">
          {p.linkedin_url && (
            <a href={p.linkedin_url} target="_blank" rel="noreferrer"
              className="p-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-all">
              <Linkedin className="w-3.5 h-3.5" />
            </a>
          )}
          {p.twitter_url && (
            <a href={p.twitter_url} target="_blank" rel="noreferrer"
              className="p-1.5 bg-sky-50 text-sky-600 rounded-lg hover:bg-sky-100 transition-all">
              <Twitter className="w-3.5 h-3.5" />
            </a>
          )}
        </div>

        {/* CTAs */}
        <div className="flex gap-2">
          <button onClick={onMessage}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 border-2 border-slate-200 text-slate-600 hover:border-emerald-200 hover:text-emerald-600 rounded-xl text-xs font-bold transition-all">
            <MessageSquare className="w-3.5 h-3.5" /> Message
          </button>
          <button onClick={onPitch} disabled={pitchState === 'sent' || pitchState === 'sending'}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              pitchState === 'sent'    ? 'bg-emerald-50 text-emerald-600 border-2 border-emerald-200' :
              pitchState === 'sending' ? 'g-em text-white opacity-70 cursor-wait' :
              'g-em text-white hover:opacity-90'
            }`}>
            {pitchState === 'sent'    ? <><CheckCircle className="w-3.5 h-3.5" />Pitched</> :
             pitchState === 'sending' ? <Loader className="w-3.5 h-3.5 animate-spin" /> :
             <><Send className="w-3.5 h-3.5" />Send Pitch</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
export default function FindInvestorsPage() {
  const { user }  = useAuth();
  const navigate  = useNavigate();

  const [investors,  setInvestors]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [search,     setSearch]     = useState('');
  const [stageF,     setStageF]     = useState('');
  const [industryF,  setIndustryF]  = useState('');
  const [locationF,  setLocationF]  = useState('');
  const [pitchStates,setPitchStates]= useState({});
  const [pitchModal, setPitchModal] = useState(null); // investor
  const [pitchText,  setPitchText]  = useState('');
  const [sending,    setSending]    = useState(false);
  const [showFilters,setShowFilters]= useState(false);

  const load = useCallback(async (stage = stageF, industry = industryF) => {
    setLoading(true); setError('');
    try {
      const data = await fetchInvestors({ stage, industry, limit: 30 });
      setInvestors(data);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [stageF, industryF]);

  useEffect(() => { load(); }, []);

  const handlePitch = (investor) => {
    setPitchModal(investor);
    const name = investor.profiles?.full_name?.split(' ')[0] || 'there';
    setPitchText(`Hi ${name}, I'm the founder of [YOUR STARTUP]. We're solving [PROBLEM] with [SOLUTION]. We're currently at [STAGE] stage and looking for [AMOUNT] to [USE OF FUNDS]. Would love to share our pitch deck — do you have 15 minutes for a call?`);
  };

  const handleSendPitch = async () => {
    if (!pitchModal || !pitchText.trim() || sending) return;
    const uid = pitchModal.profile_id || pitchModal.user_id;
    setSending(true);
    try {
      await sendConnectionRequest(user.id, uid, 'investor_contact', pitchText.trim());
      setPitchStates(p => ({ ...p, [uid]: 'sent' }));
      setPitchModal(null); setPitchText('');
      navigate('/messages');
    } catch (e) {
      if (!e.message?.includes('23505')) alert(e.message);
      else { setPitchModal(null); navigate('/messages'); }
    } finally { setSending(false); }
  };

  const handleMessage = async (investor) => {
    const uid = investor.profile_id || investor.user_id;
    try {
      await getOrCreateConversation(user.id, uid);
      navigate('/messages');
    } catch (e) { console.error(e); }
  };

  // Client-side text search + location
  const shown = investors.filter(inv => {
    const p = inv.profiles || {};
    if (locationF) {
      const loc = (p.location || '').toLowerCase();
      const geo = (inv.geography_focus || '').toLowerCase();
      if (!loc.includes(locationF.toLowerCase()) && !geo.includes(locationF.toLowerCase())) return false;
    }
    if (search) {
      const q = search.toLowerCase();
      const searchable = [p.full_name, inv.fund_name, inv.firm_name,
        ...(inv.preferred_industries || inv.industries_of_interest || []),
        ...(inv.preferred_stages || inv.investment_stage || []),
        inv.investment_thesis, inv.what_i_look_for,
      ].filter(Boolean).join(' ').toLowerCase();
      if (!searchable.includes(q)) return false;
    }
    return true;
  });

  return (
    <>
      <style>{CSS}</style>
      <div className="min-h-screen page-bg dm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">

          {/* Header */}
          <div className="mb-8 f0">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-700 bg-emerald-100 px-3 py-1.5 rounded-full mb-3">
              <DollarSign className="w-3.5 h-3.5" /> Find Investors
            </div>
            <h1 className="ss font-black text-4xl text-slate-900 mb-2">Find Investors</h1>
            <p className="text-slate-600 text-lg max-w-xl">
              Angel investors and VCs actively looking for early-stage startups.
              Filter by stage, industry, and location. Send your pitch with one click.
            </p>
          </div>

          <div className="grid lg:grid-cols-4 gap-6">

            {/* Filter sidebar */}
            <aside className="lg:col-span-1 f1">
              <button onClick={() => setShowFilters(!showFilters)}
                className="lg:hidden w-full flex items-center justify-between p-3.5 bg-white rounded-xl border border-emerald-100 mb-3 shadow-sm font-semibold text-sm text-slate-700">
                <span className="flex items-center gap-2"><Filter className="w-4 h-4 text-emerald-500" />Filters</span>
                <ChevronRight className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-90' : ''}`} />
              </button>

              <div className={`bg-white rounded-2xl border border-emerald-100/60 shadow-sm p-5 ${showFilters ? 'block' : 'hidden lg:block'}`}>
                {/* Stage */}
                <div className="filter-panel">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Investment Stage</p>
                  <div className="space-y-1.5">
                    {['', ...STAGE_OPTS].map(s => (
                      <button key={s} onClick={() => { setStageF(s); load(s, industryF); }}
                        className={`w-full text-left text-sm py-2 px-3 rounded-xl transition-all font-medium ${
                          stageF === s
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold'
                            : 'text-slate-600 hover:bg-slate-50'
                        }`}>
                        {s || 'All Stages'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Industry */}
                <div className="filter-panel">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Industry Focus</p>
                  <div className="flex flex-wrap gap-1.5">
                    {['', ...INDUSTRY_OPTS].map(ind => (
                      <button key={ind} onClick={() => { setIndustryF(ind); load(stageF, ind); }}
                        className={`chip ${industryF === ind && ind ? 'on' : ''}`}>
                        {ind || 'Any'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Location */}
                <div className="filter-panel">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Location / Focus</p>
                  <div className="flex flex-wrap gap-1.5">
                    {['', ...LOCATION_OPTS].map(loc => (
                      <button key={loc} onClick={() => setLocationF(loc === locationF ? '' : loc)}
                        className={`chip ${locationF === loc && loc ? 'on' : ''}`}>
                        {loc || 'Any'}
                      </button>
                    ))}
                  </div>
                </div>

                {(stageF || industryF || locationF) && (
                  <button onClick={() => { setStageF(''); setIndustryF(''); setLocationF(''); load('', ''); }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-semibold text-rose-500 hover:bg-red-50 rounded-xl transition-all">
                    <X className="w-3.5 h-3.5" /> Clear Filters
                  </button>
                )}
              </div>
            </aside>

            {/* Main content */}
            <div className="lg:col-span-3 f2">
              {/* Search + refresh */}
              <div className="flex items-center gap-3 mb-5">
                <div className="flex-1 relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input className="inp pl-10" placeholder="Search by name, fund, industry, or thesis…"
                    value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <button onClick={() => load(stageF, industryF)}
                  className="p-2.5 bg-white border border-emerald-100 rounded-xl text-slate-500 hover:text-emerald-600 hover:border-emerald-200 transition-all">
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {!loading && (
                <p className="text-sm text-slate-500 mb-4 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-500" />
                  <span className="font-semibold text-slate-700">{shown.length}</span> investors
                  {(stageF || industryF || locationF || search) && ' matching filters'}
                </p>
              )}

              {error && (
                <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl px-5 py-4 mb-5">
                  <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-700 flex-1">{error}</p>
                  <button onClick={() => load(stageF, industryF)} className="text-red-500 hover:text-red-700">
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              )}

              {loading ? (
                <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3">
                      <div className="flex gap-3"><div className="shimmer w-12 h-12 flex-shrink-0 rounded-2xl" /><div className="flex-1 space-y-2"><div className="shimmer h-4 w-28" /><div className="shimmer h-3 w-20" /></div></div>
                      <div className="shimmer h-3 w-full" />
                      <div className="flex gap-1.5"><div className="shimmer h-5 w-16" /><div className="shimmer h-5 w-16" /></div>
                      <div className="shimmer h-10 w-full" />
                      <div className="flex gap-2"><div className="shimmer h-8 flex-1" /><div className="shimmer h-8 flex-1" /></div>
                    </div>
                  ))}
                </div>
              ) : shown.length === 0 ? (
                <div className="py-20 text-center">
                  <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <DollarSign className="w-8 h-8 text-emerald-400" />
                  </div>
                  <h3 className="ss font-bold text-slate-900 text-xl mb-2">No investors found</h3>
                  <p className="text-slate-500 text-sm mb-4">
                    {(stageF || industryF || locationF || search)
                      ? 'Try different filters'
                      : 'Investor profiles will appear here once they join ScalScope.'}
                  </p>
                  {(stageF || industryF || locationF || search) && (
                    <button onClick={() => { setStageF(''); setIndustryF(''); setLocationF(''); setSearch(''); load('', ''); }}
                      className="text-sm font-semibold text-emerald-600 hover:underline">
                      Clear all filters
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {shown.map((inv, i) => {
                    const uid = inv.profile_id || inv.user_id;
                    return (
                      <div key={inv.id || i} className="slide-in" style={{ animationDelay: `${Math.min(i, 8) * 0.05}s` }}>
                        <InvestorCard
                          investor={inv}
                          onPitch={() => handlePitch(inv)}
                          onMessage={() => handleMessage(inv)}
                          pitchState={pitchStates[uid]} />
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Pitch modal */}
      {pitchModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-7 max-w-lg w-full shadow-2xl modal-pop">
            <div className="flex items-center justify-between mb-2">
              <h3 className="ss font-black text-xl text-slate-900">
                Pitch to {pitchModal.profiles?.full_name?.split(' ')[0] || 'Investor'}
              </h3>
              <button onClick={() => setPitchModal(null)} className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Keep it concise: who you are, what you're building, current stage, and the ask.
            </p>
            <textarea className="ta w-full"
              rows={7} value={pitchText} onChange={e => setPitchText(e.target.value)}
              placeholder="Write your pitch message…" maxLength={800} />
            <p className="text-xs text-slate-400 text-right mt-1 mb-4">{pitchText.length}/800</p>
            <div className="flex gap-3">
              <button onClick={() => setPitchModal(null)}
                className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200">Cancel</button>
              <button onClick={handleSendPitch} disabled={!pitchText.trim() || sending}
                className="flex-1 py-3 g-em text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50">
                {sending ? <Loader className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" />Send Pitch</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}