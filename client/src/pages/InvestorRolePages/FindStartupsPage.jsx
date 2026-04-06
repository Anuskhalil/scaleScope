// src/pages/InvestorRolePages/FindStartupsPage.jsx
// Investor browses: Startups (founders) with AI match scores
// CTA: Express Interest → connection_request(type='investor_interest') | Message

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import {
  fetchStartupsForInvestor, fetchInvestorProfile,
  rankStartupsForInvestor,
  sendConnectionRequest, getOrCreateConversation,
} from '../../services/investorService';
import {
  Search, Sparkles, Rocket, MessageSquare,
  CheckCircle, MapPin, Filter, Loader, AlertTriangle,
  RefreshCw, ChevronRight, X, Send, Zap, DollarSign,
  FileText, Globe, Users, TrendingUp,
} from 'lucide-react';

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800;900&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap');
  .ss{font-family:'Syne',sans-serif}.dm{font-family:'DM Sans',sans-serif}
  .lift{transition:transform .22s cubic-bezier(.22,.68,0,1.2),box-shadow .22s ease}
  .lift:hover{transform:translateY(-3px);box-shadow:0 16px 44px rgba(29,78,216,.09)}
  .g-inv{background:linear-gradient(135deg,#1d4ed8,#4f46e5)}
  .page-bg{background-color:#eff6ff;background-image:radial-gradient(circle,#bfdbfe 1px,transparent 1px);background-size:28px 28px}
  .chip{display:inline-flex;align-items:center;padding:3px 10px;border-radius:999px;font-size:11px;font-weight:600;cursor:pointer;border:1.5px solid #e2e8f0;background:#fff;color:#64748b;transition:all .14s}
  .chip:hover{border-color:#93c5fd;color:#1d4ed8}
  .chip.on{background:#eff6ff;border-color:#93c5fd;color:#1d4ed8}
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
  .inp:focus{border-color:#1d4ed8}
  .ai-badge{display:inline-flex;align-items:center;gap:3px;padding:2px 8px;border-radius:999px;font-size:10px;font-weight:700;background:linear-gradient(135deg,#1d4ed8,#4f46e5);color:#fff}
  .stage-pill{padding:2px 9px;border-radius:999px;font-size:11px;font-weight:700}
`;

const INDUSTRIES = ['EdTech','HealthTech','FinTech','SaaS','AgriTech','CleanTech','LegalTech','HRTech','E-commerce','AI / ML','Social Impact'];
const STAGES     = ['Just an Idea','Researching','Building MVP','MVP Built','Growing','Pre-seed','Seed','Series A'];
const STAGE_COLORS = {
  'Just an Idea':'bg-yellow-100 text-yellow-800','Researching':'bg-orange-100 text-orange-800',
  'Building MVP':'bg-blue-100 text-blue-800','MVP Built':'bg-teal-100 text-teal-800',
  'Growing':'bg-emerald-100 text-emerald-800','Pre-seed':'bg-violet-100 text-violet-800',
  'Seed':'bg-indigo-100 text-indigo-800','Series A':'bg-rose-100 text-rose-800',
};

function initials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}
function gradFor(id) {
  const g = ['from-blue-500 to-indigo-500','from-violet-500 to-purple-500',
             'from-emerald-500 to-teal-500','from-amber-500 to-orange-500',
             'from-rose-500 to-pink-500','from-cyan-500 to-blue-500'];
  return g[((id || '').charCodeAt?.(0) || 0) % g.length];
}

// ── Startup card ──────────────────────────────────────────────────────────
function StartupCard({ startup, onExpress, onMessage, expressState, isTop }) {
  const p       = startup.profiles || {};
  const name    = startup.company_name || startup.idea_title || 'Unnamed Startup';
  const stage   = startup.funding_stage || startup.startup_stage || startup.company_stage;
  const stageCls= STAGE_COLORS[stage] || 'bg-slate-100 text-slate-700';
  const score   = startup._score || 0;

  return (
    <div className={`bg-white rounded-2xl border shadow-sm lift ${isTop ? 'border-blue-200 bg-gradient-to-br from-white to-blue-50/30' : 'border-slate-100'}`}>
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${gradFor(startup.user_id)} flex items-center justify-center text-white text-sm font-bold ss flex-shrink-0`}>
            {initials(name)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="font-bold text-slate-900 ss leading-tight truncate">{name}</p>
              {score >= 50 && <span className="ai-badge flex-shrink-0"><Sparkles className="w-2.5 h-2.5" />Match</span>}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              {startup.industry && <span className="chip">{startup.industry}</span>}
              {stage && <span className={`stage-pill ${stageCls}`}>{stage}</span>}
              {startup.team_size && <span className="chip">👥 {startup.team_size}</span>}
            </div>
          </div>
        </div>

        {/* AI match reason */}
        {startup._matchReason && score >= 30 && (
          <p className="text-xs text-blue-600 italic mb-2">"{startup._matchReason}"</p>
        )}

        {/* Problem */}
        {(startup.problem_solving || startup.problem_statement) && (
          <div className="mb-3">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Problem</p>
            <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">
              {startup.problem_solving || startup.problem_statement}
            </p>
          </div>
        )}

        {/* UVP */}
        {startup.unique_value_proposition && (
          <p className="text-xs text-slate-500 italic mb-3 line-clamp-2">"{startup.unique_value_proposition}"</p>
        )}

        {/* Founder */}
        {p.full_name && (
          <div className="flex items-center gap-2 mb-3 p-2.5 bg-slate-50 rounded-xl">
            <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${gradFor(p.id)} flex items-center justify-center text-white text-xs font-bold ss`}>
              {initials(p.full_name)}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-800 ss truncate">{p.full_name}</p>
              {p.location && <p className="text-xs text-slate-400 flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{p.location}</p>}
            </div>
          </div>
        )}

        {/* Assets */}
        <div className="flex items-center gap-3 mb-4">
          {startup.pitch_deck_url && (
            <a href={startup.pitch_deck_url} target="_blank" rel="noreferrer"
              className="flex items-center gap-1 text-xs text-blue-600 font-semibold hover:underline">
              <FileText className="w-3 h-3" /> Pitch Deck
            </a>
          )}
          {startup.demo_url && (
            <a href={startup.demo_url} target="_blank" rel="noreferrer"
              className="flex items-center gap-1 text-xs text-indigo-600 font-semibold hover:underline">
              <Globe className="w-3 h-3" /> Demo
            </a>
          )}
        </div>

        {/* CTAs */}
        <div className="flex gap-2">
          <button onClick={onMessage}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 border-2 border-slate-200 text-slate-600 hover:border-blue-200 hover:text-blue-600 rounded-xl text-xs font-bold transition-all">
            <MessageSquare className="w-3.5 h-3.5" /> Message
          </button>
          <button onClick={onExpress} disabled={expressState === 'sent' || expressState === 'sending'}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              expressState === 'sent'    ? 'bg-emerald-50 text-emerald-600 border-2 border-emerald-200' :
              expressState === 'sending' ? 'g-inv text-white opacity-70 cursor-wait' :
              'g-inv text-white hover:opacity-90'
            }`}>
            {expressState === 'sent'    ? <><CheckCircle className="w-3.5 h-3.5" />Interested</> :
             expressState === 'sending' ? <Loader className="w-3.5 h-3.5 animate-spin" /> :
             <><Zap className="w-3.5 h-3.5" />Express Interest</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
export default function FindStartupsPage() {
  const { user }    = useAuth();
  const navigate    = useNavigate();

  const [startups,     setStartups]    = useState([]);
  const [myProfile,    setMyProfile]   = useState(null);
  const [loading,      setLoading]     = useState(true);
  const [error,        setError]       = useState('');
  const [search,       setSearch]      = useState('');
  const [industryF,    setIndustryF]   = useState('');
  const [stageF,       setStageF]      = useState('');
  const [expressStates,setExpressStates] = useState({});
  const [msgModal,     setMsgModal]    = useState(null);
  const [msgText,      setMsgText]     = useState('');
  const [sending,      setSending]     = useState(false);
  const [showFilters,  setShowFilters] = useState(false);

  const load = useCallback(async (industry = industryF, stage = stageF) => {
    setLoading(true); setError('');
    try {
      const [data, profileData] = await Promise.all([
        fetchStartupsForInvestor({ industry, stage, limit: 30 }),
        myProfile ? Promise.resolve({ profile: {}, investorProfile: myProfile }) : fetchInvestorProfile(user.id),
      ]);
      const ip = myProfile || profileData.investorProfile;
      if (!myProfile) setMyProfile(ip);
      const ranked = rankStartupsForInvestor(data, ip);
      setStartups(ranked);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [user, industryF, stageF, myProfile]);

  useEffect(() => { load(); }, []);

  const handleExpress = async (startup) => {
    if (expressStates[startup.user_id]) return;
    setExpressStates(p => ({ ...p, [startup.user_id]: 'sending' }));
    try {
      await sendConnectionRequest(user.id, startup.user_id, 'investor_interest');
      setExpressStates(p => ({ ...p, [startup.user_id]: 'sent' }));
    } catch (e) {
      if (!e.message?.includes('23505')) alert(e.message);
      else setExpressStates(p => ({ ...p, [startup.user_id]: 'sent' }));
    }
  };

  const handleMessage = (startup) => {
    const name = startup.profiles?.full_name?.split(' ')[0] || 'there';
    setMsgModal(startup);
    setMsgText(`Hi ${name}, I came across your startup${startup.company_name ? ` "${startup.company_name}"` : ''} on ScalScope. I invest in ${(myProfile?.industries_of_interest || []).slice(0,2).join(' and ') || 'your space'} and I'd love to learn more. Are you open to a quick call?`);
  };

  const handleSendMessage = async () => {
    if (!msgModal || !msgText.trim() || sending) return;
    setSending(true);
    try {
      await sendConnectionRequest(user.id, msgModal.user_id, 'investor_interest', msgText.trim());
      setExpressStates(p => ({ ...p, [msgModal.user_id]: 'sent' }));
      setMsgModal(null); setMsgText('');
      navigate('/messages');
    } catch (e) {
      if (!e.message?.includes('23505')) alert(e.message);
      else { setMsgModal(null); navigate('/messages'); }
    } finally { setSending(false); }
  };

  // Client-side search
  const shown = startups.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    const fields = [s.company_name, s.idea_title, s.industry, s.profiles?.full_name,
      s.problem_solving, s.problem_statement, s.unique_value_proposition].filter(Boolean).join(' ').toLowerCase();
    return fields.includes(q);
  });

  return (
    <>
      <style>{CSS}</style>
      <div className="min-h-screen page-bg dm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">

          {/* Header */}
          <div className="mb-8 f0">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-blue-700 bg-blue-100 px-3 py-1.5 rounded-full mb-3">
              <Rocket className="w-3.5 h-3.5" /> Browse Startups
            </div>
            <h1 className="ss font-black text-4xl text-slate-900 mb-2">Find Startups to Back</h1>
            <p className="text-slate-600 text-lg max-w-xl">
              Founders actively seeking investment. Ranked by match with your investment focus.
              Express interest or message directly.
            </p>
          </div>

          <div className="grid lg:grid-cols-4 gap-6">

            {/* Filter sidebar */}
            <aside className="lg:col-span-1 f1">
              <button onClick={() => setShowFilters(!showFilters)}
                className="lg:hidden w-full flex items-center justify-between p-3.5 bg-white rounded-xl border border-blue-100 mb-3 shadow-sm font-semibold text-sm text-slate-700">
                <span className="flex items-center gap-2"><Filter className="w-4 h-4 text-blue-500" />Filters</span>
                <ChevronRight className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-90' : ''}`} />
              </button>

              <div className={`bg-white rounded-2xl border border-blue-100/60 shadow-sm p-5 ${showFilters ? 'block' : 'hidden lg:block'}`}>
                {/* Industry */}
                <div className="filter-panel">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Industry</p>
                  <div className="space-y-1.5">
                    {['', ...INDUSTRIES].map(ind => (
                      <button key={ind} onClick={() => { setIndustryF(ind); load(ind, stageF); }}
                        className={`w-full text-left text-sm py-2 px-3 rounded-xl transition-all font-medium ${
                          industryF === ind ? 'bg-blue-50 text-blue-700 border border-blue-200 font-bold' : 'text-slate-600 hover:bg-slate-50'
                        }`}>
                        {ind || 'All Industries'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Stage */}
                <div className="filter-panel">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Funding Stage</p>
                  <div className="flex flex-wrap gap-1.5">
                    {['', ...STAGES].map(s => (
                      <button key={s} onClick={() => { setStageF(s); load(industryF, s); }}
                        className={`chip ${stageF === s && s ? 'on' : ''}`}>
                        {s || 'Any'}
                      </button>
                    ))}
                  </div>
                </div>

                {(industryF || stageF) && (
                  <button onClick={() => { setIndustryF(''); setStageF(''); load('', ''); }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-semibold text-rose-500 hover:bg-red-50 rounded-xl transition-all">
                    <X className="w-3.5 h-3.5" /> Clear Filters
                  </button>
                )}
              </div>
            </aside>

            {/* Main content */}
            <div className="lg:col-span-3 f2">
              <div className="flex items-center gap-3 mb-5">
                <div className="flex-1 relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input className="inp pl-10" placeholder="Search by startup name, founder, industry, or problem…"
                    value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <button onClick={() => load(industryF, stageF)}
                  className="p-2.5 bg-white border border-blue-100 rounded-xl text-slate-500 hover:text-blue-600 hover:border-blue-200 transition-all">
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {!loading && (
                <p className="text-sm text-slate-500 mb-4 flex items-center gap-2">
                  <Rocket className="w-4 h-4 text-blue-500" />
                  <span className="font-semibold text-slate-700">{shown.length}</span> startups
                  {(industryF || stageF || search) && ' matching filters'}
                  {shown.filter(s => s._score >= 50).length > 0 && (
                    <span className="ai-badge"><Sparkles className="w-2.5 h-2.5" />{shown.filter(s => s._score >= 50).length} AI matched</span>
                  )}
                </p>
              )}

              {error && (
                <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl px-5 py-4 mb-5">
                  <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-700 flex-1">{error}</p>
                  <button onClick={() => load(industryF, stageF)} className="text-red-500 hover:text-red-700"><RefreshCw className="w-4 h-4" /></button>
                </div>
              )}

              {loading ? (
                <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3">
                      <div className="flex gap-3"><div className="shimmer w-12 h-12 flex-shrink-0 rounded-2xl" /><div className="flex-1 space-y-2"><div className="shimmer h-4 w-28" /><div className="shimmer h-3 w-20" /></div></div>
                      <div className="shimmer h-3 w-full" /><div className="shimmer h-3 w-4/5" />
                      <div className="shimmer h-10 w-full" />
                      <div className="flex gap-2"><div className="shimmer h-9 flex-1" /><div className="shimmer h-9 flex-1" /></div>
                    </div>
                  ))}
                </div>
              ) : shown.length === 0 ? (
                <div className="py-20 text-center">
                  <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Rocket className="w-8 h-8 text-blue-400" />
                  </div>
                  <h3 className="ss font-bold text-slate-900 text-xl mb-2">No startups found</h3>
                  <p className="text-slate-500 text-sm mb-4">
                    {(industryF || stageF || search) ? 'Try different filters' : 'Founders will appear here as they join ScalScope.'}
                  </p>
                  {(industryF || stageF || search) && (
                    <button onClick={() => { setIndustryF(''); setStageF(''); setSearch(''); load('', ''); }}
                      className="text-sm font-semibold text-blue-600 hover:underline">Clear all filters</button>
                  )}
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {shown.map((s, i) => (
                    <div key={s.id || i} className="slide-in" style={{ animationDelay: `${Math.min(i, 8) * 0.05}s` }}>
                      <StartupCard
                        startup={s}
                        isTop={i < 3 && s._score >= 40}
                        onExpress={() => handleExpress(s)}
                        onMessage={() => handleMessage(s)}
                        expressState={expressStates[s.user_id]} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Message / Express Interest modal */}
      {msgModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-7 max-w-lg w-full shadow-2xl modal-pop">
            <div className="flex items-center justify-between mb-2">
              <h3 className="ss font-black text-xl text-slate-900">
                Message {msgModal.profiles?.full_name?.split(' ')[0] || 'Founder'}
              </h3>
              <button onClick={() => setMsgModal(null)} className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-xs text-slate-400 mb-3">Edit the template — a personalised message gets 3× better response rates.</p>
            <textarea className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl text-sm outline-none resize-none focus:border-blue-400 transition-colors"
              rows={6} value={msgText} onChange={e => setMsgText(e.target.value)} maxLength={600} />
            <p className="text-xs text-slate-400 text-right mt-1 mb-4">{msgText.length}/600</p>
            <div className="flex gap-3">
              <button onClick={() => setMsgModal(null)} className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200">Cancel</button>
              <button onClick={handleSendMessage} disabled={!msgText.trim() || sending}
                className="flex-1 py-3 g-inv text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50">
                {sending ? <Loader className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" />Send Message</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}