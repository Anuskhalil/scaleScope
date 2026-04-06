// src/pages/InvestorRolePages/InvestorDashboard.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import {
  fetchInvestorDashboard, calcInvestorCompletion, getInvestorProfileNudges,
  rankStartupsForInvestor, respondToRequest, getOrCreateConversation,
  sendConnectionRequest, formatTicketSize,
} from '../../services/investorService';
import {
  DollarSign, Rocket, MessageSquare, CheckCircle, X, Edit3,
  MapPin, Bell, ChevronRight, ArrowRight, ArrowUpRight,
  Loader, Sparkles, Send, Shield, Search, Star, TrendingUp,
  Zap, AlertCircle, UserCheck, Briefcase, Building2, BarChart2,
} from 'lucide-react';

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800;900&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap');
  .ss{font-family:'Syne',sans-serif}.dm{font-family:'DM Sans',sans-serif}
  .lift{transition:transform .22s cubic-bezier(.22,.68,0,1.2),box-shadow .22s ease}
  .lift:hover{transform:translateY(-3px);box-shadow:0 16px 48px rgba(37,99,235,.10)}
  .g-inv{background:linear-gradient(135deg,#1d4ed8,#4f46e5)}
  .g-inv-lite{background:linear-gradient(135deg,#3b82f6,#6366f1)}
  .g-dk{background:linear-gradient(135deg,#0f172a,#1e1b4b)}
  .page-bg{background-color:#eff6ff;background-image:radial-gradient(circle,#bfdbfe 1px,transparent 1px);background-size:28px 28px}
  .sh{background:linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%);background-size:200% 100%;animation:sh 1.4s infinite;border-radius:10px}
  @keyframes sh{0%{background-position:200% 0}100%{background-position:-200% 0}}
  .f0{animation:fu .35s ease both}.f1{animation:fu .35s .07s ease both}
  .f2{animation:fu .35s .14s ease both}.f3{animation:fu .35s .21s ease both}
  .f4{animation:fu .35s .28s ease both}
  @keyframes fu{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
  .slide{animation:si .28s cubic-bezier(.32,.72,0,1) both}
  @keyframes si{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:none}}
  .prog-ring{transition:stroke-dashoffset .6s cubic-bezier(.4,0,.2,1)}
  .ai-badge{display:inline-flex;align-items:center;gap:3px;padding:2px 9px;border-radius:999px;font-size:10px;font-weight:700;background:linear-gradient(135deg,#1d4ed8,#4f46e5);color:#fff}
  .chip{display:inline-flex;align-items:center;padding:2px 9px;border-radius:999px;font-size:11px;font-weight:600;border:1.5px solid #e2e8f0;background:#fff;color:#64748b}
  .stage-pill{padding:2px 10px;border-radius:999px;font-size:11px;font-weight:700}
  .unread-pulse{animation:udot 2s ease-in-out infinite}
  @keyframes udot{0%,100%{box-shadow:0 0 0 0 rgba(37,99,235,.5)}50%{box-shadow:0 0 0 5px rgba(37,99,235,0)}}
`;

const STAGE_COLORS = {
  'Just an Idea': 'bg-yellow-100 text-yellow-800',
  'Researching':  'bg-orange-100 text-orange-800',
  'Building MVP': 'bg-blue-100  text-blue-800',
  'MVP Built':    'bg-teal-100  text-teal-800',
  'Growing':      'bg-emerald-100 text-emerald-800',
  'Pre-seed':     'bg-violet-100 text-violet-800',
  'Seed':         'bg-indigo-100 text-indigo-800',
  'Series A':     'bg-rose-100  text-rose-800',
};

function initials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}
function timeAgo(iso) {
  if (!iso) return '';
  const s = (Date.now() - new Date(iso)) / 1000;
  if (s < 60)    return 'just now';
  if (s < 3600)  return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
function gradFor(id) {
  const g = ['from-blue-500 to-indigo-500','from-violet-500 to-purple-500',
             'from-emerald-500 to-teal-500','from-amber-500 to-orange-500',
             'from-rose-500 to-pink-500','from-cyan-500 to-blue-500'];
  return g[((id || '').charCodeAt?.(0) || 0) % g.length];
}
function stagePill(stage) {
  const cls = STAGE_COLORS[stage] || 'bg-slate-100 text-slate-700';
  return <span className={`stage-pill ${cls}`}>{stage}</span>;
}
function Card({ children, className = '' }) {
  return <div className={`bg-white rounded-2xl shadow-sm border border-blue-100/50 ${className}`}>{children}</div>;
}
function SectionHead({ title, icon, linkTo, linkLabel }) {
  return (
    <div className="flex items-center justify-between px-6 pt-6 pb-3">
      <h2 className="ss font-bold text-slate-900 flex items-center gap-2 text-base">{icon}{title}</h2>
      {linkLabel && linkTo && (
        <Link to={linkTo} className="text-xs font-semibold text-blue-600 flex items-center gap-0.5 hover:gap-1.5 transition-all">
          {linkLabel}<ChevronRight className="w-3.5 h-3.5" />
        </Link>
      )}
    </div>
  );
}

// ── Startup suggestion card ───────────────────────────────────────────────
function StartupCard({ startup, onMessage, onExpress, expressState }) {
  const p     = startup.profiles || {};
  const name  = startup.company_name || startup.idea_title || 'Unnamed Startup';
  const stage = startup.funding_stage || startup.startup_stage || startup.company_stage;
  return (
    <div className="p-4 border border-slate-100 rounded-2xl hover:border-blue-100 hover:bg-blue-50/20 transition-all lift">
      <div className="flex items-start gap-3 mb-2">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradFor(startup.user_id)} flex items-center justify-center text-white text-xs font-bold ss flex-shrink-0`}>
          {initials(name)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-slate-900 text-sm ss truncate">{name}</p>
            {startup._score >= 50 && (
              <span className="ai-badge"><Sparkles className="w-2.5 h-2.5" />Match</span>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
            {startup.industry && <span className="chip">{startup.industry}</span>}
            {stage && stagePill(stage)}
          </div>
        </div>
      </div>
      {startup._matchReason && (
        <p className="text-xs text-blue-600 italic mb-2">"{startup._matchReason}"</p>
      )}
      {(startup.problem_solving || startup.problem_statement) && (
        <p className="text-xs text-slate-600 leading-relaxed mb-2 line-clamp-2">
          {startup.problem_solving || startup.problem_statement}
        </p>
      )}
      <div className="flex items-center gap-2 flex-wrap mb-3">
        {startup.pitch_deck_url && (
          <a href={startup.pitch_deck_url} target="_blank" rel="noreferrer"
            className="text-xs text-blue-600 font-semibold flex items-center gap-0.5 hover:underline">
            📎 Pitch Deck
          </a>
        )}
        {startup.demo_url && (
          <a href={startup.demo_url} target="_blank" rel="noreferrer"
            className="text-xs text-indigo-600 font-semibold flex items-center gap-0.5 hover:underline">
            🎬 Demo
          </a>
        )}
        {startup.team_size && (
          <span className="chip">👥 {startup.team_size} member{startup.team_size === 1 ? '' : 's'}</span>
        )}
      </div>
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
          {expressState === 'sent'    ? <><CheckCircle className="w-3.5 h-3.5" />Interest Sent</> :
           expressState === 'sending' ? <Loader className="w-3.5 h-3.5 animate-spin" /> :
           <><Zap className="w-3.5 h-3.5" />Express Interest</>}
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
export default function InvestorDashboard() {
  const { user }   = useAuth();
  const navigate   = useNavigate();

  const [data,        setData]       = useState(null);
  const [loading,     setLoading]    = useState(true);
  const [responding,  setResponding] = useState({});
  const [exprStates,  setExprStates] = useState({});

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const d = await fetchInvestorDashboard(user.id);
      d.startups = rankStartupsForInvestor(d.startups, d.investorProfile);
      setData(d);
    } catch (e) { console.error('[InvestorDashboard]', e); }
    finally { setLoading(false); }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const handleRespond = async (reqId, status) => {
    setResponding(p => ({ ...p, [reqId]: status }));
    try {
      await respondToRequest(reqId, status);
      setData(prev => ({ ...prev, requests: prev.requests.filter(r => r.id !== reqId) }));
      if (status === 'accepted') load();
    } catch (e) { alert(e.message); setResponding(p => ({ ...p, [reqId]: null })); }
  };

  const handleMessage = async (targetId) => {
    try { await getOrCreateConversation(user.id, targetId); navigate('/messages'); }
    catch (e) { console.error(e); }
  };

  const handleExpress = async (targetId) => {
    if (exprStates[targetId]) return;
    setExprStates(p => ({ ...p, [targetId]: 'sending' }));
    try {
      await sendConnectionRequest(user.id, targetId, 'investor_interest');
      setExprStates(p => ({ ...p, [targetId]: 'sent' }));
    } catch (e) {
      if (!e.message?.includes('23505')) alert(e.message);
      else setExprStates(p => ({ ...p, [targetId]: 'sent' }));
    }
  };

  if (loading) return (
    <>
      <style>{CSS}</style>
      <div className="min-h-screen page-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl g-inv flex items-center justify-center mx-auto mb-3 shadow-lg">
            <DollarSign className="w-6 h-6 text-white" />
          </div>
          <p className="ss font-bold text-slate-900">Loading your investor hub…</p>
          <Loader className="w-5 h-5 animate-spin text-blue-500 mx-auto mt-2" />
        </div>
      </div>
    </>
  );

  const { profile = {}, investorProfile = {}, requests = [], startups = [], convos = [] } = data || {};
  const firstName  = profile.full_name?.split(' ')[0] || 'Investor';
  const init       = initials(profile.full_name);
  const completion = calcInvestorCompletion(profile, investorProfile);
  const nudges     = getInvestorProfileNudges(profile, investorProfile);
  const unread     = (convos || []).reduce((s, c) => s + (c.unreadCount || 0), 0);
  const ticket     = formatTicketSize(investorProfile.ticket_size_min, investorProfile.ticket_size_max);

  const R = 22, C = 2 * Math.PI * R, dash = C * (completion / 100);

  return (
    <>
      <style>{CSS}</style>
      <div className="min-h-screen page-bg dm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">

          {/* ── HERO ──────────────────────────────────────────────────── */}
          <div className="g-dk rounded-3xl px-7 py-8 md:px-10 mb-6 text-white relative overflow-hidden f0">
            <div className="absolute -right-12 -top-12 w-60 h-60 rounded-full opacity-10 blur-2xl"
              style={{ background: 'radial-gradient(circle,#60a5fa,transparent)' }} />
            <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest bg-blue-400/20 text-blue-200 px-3 py-1 rounded-full border border-blue-400/20">
                    <DollarSign className="w-3.5 h-3.5" /> Investor
                  </span>
                  {requests.length > 0 && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold bg-red-500 text-white px-2.5 py-0.5 rounded-full">
                      <Bell className="w-3 h-3" /> {requests.length} new pitch{requests.length !== 1 ? 'es' : ''}
                    </span>
                  )}
                </div>
                <h1 className="ss font-black text-3xl md:text-4xl leading-none mb-1">
                  Welcome, {firstName} 👋
                </h1>
                <p className="text-white/60 text-sm max-w-lg">
                  {investorProfile.firm_name
                    ? `${investorProfile.investor_type || 'Investor'} · ${investorProfile.firm_name} · ${ticket}`
                    : 'Complete your investor profile to receive matched startup pitches.'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 md:flex-col lg:flex-row">
                <Link to="/investor-profile" className="g-inv-lite flex items-center gap-2 text-white font-bold text-sm px-5 py-2.5 rounded-xl shadow hover:opacity-90">
                  <Edit3 className="w-4 h-4" /> Edit Profile
                </Link>
                <Link to="/find-startups" className="bg-white/15 border border-white/20 text-white flex items-center gap-2 font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-white/25">
                  <Search className="w-4 h-4" /> Browse Startups
                </Link>
                <Link to="/messages" className="bg-white/10 border border-white/15 text-white/80 flex items-center gap-2 font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-white/20">
                  <MessageSquare className="w-4 h-4" /> Messages
                  {unread > 0 && <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">{unread}</span>}
                </Link>
              </div>
            </div>
          </div>

          {/* ── STATS ───────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 f1">
            {[
              { label: 'Profile',    val: `${completion}%`,      sub: completion >= 80 ? 'Fully visible' : 'Needs more info', Icon: Shield,        grad: 'from-blue-400 to-indigo-500' },
              { label: 'Pitches',    val: `${requests.length}`,  sub: 'Pending review',  Icon: Bell,          grad: 'from-rose-500 to-pink-500' },
              { label: 'Ticket',     val: ticket === 'Undisclosed' ? '—' : ticket, sub: 'Ticket size',   Icon: DollarSign,    grad: 'from-emerald-500 to-teal-500' },
              { label: 'Messages',   val: `${convos.length}`,    sub: `${unread} unread`, Icon: MessageSquare, grad: 'from-violet-500 to-indigo-500' },
            ].map((s, i) => (
              <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-blue-100/60 lift">
                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${s.grad} flex items-center justify-center text-white mb-3`}>
                  <s.Icon style={{ width: 18, height: 18 }} />
                </div>
                <p className="ss text-2xl font-black text-slate-900">{s.val}</p>
                <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
                <p className="text-xs text-blue-600 font-semibold mt-0.5">{s.sub}</p>
              </div>
            ))}
          </div>

          {/* ── MAIN GRID ───────────────────────────────────────────────── */}
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-5">

              {/* 1. Profile Strength */}
              {nudges.length > 0 && (
                <Card className="f1">
                  <SectionHead title="Profile Strength" linkTo="/investor-profile" linkLabel="Complete profile"
                    icon={<Shield style={{ width: 18, height: 18 }} className="text-blue-500" />} />
                  <div className="px-6 pb-6">
                    <div className="flex items-center gap-5 mb-4">
                      <div className="relative flex-shrink-0">
                        <svg width="58" height="58" className="-rotate-90">
                          <circle cx="29" cy="29" r={R} fill="none" stroke="#dbeafe" strokeWidth="5" />
                          <circle cx="29" cy="29" r={R} fill="none" stroke="#1d4ed8" strokeWidth="5"
                            strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C - dash}
                            className="prog-ring" />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center ss font-black text-xs text-slate-900">{completion}%</span>
                      </div>
                      <div>
                        <p className="ss font-bold text-slate-900">
                          {completion >= 80 ? 'Fully visible to founders' : completion >= 50 ? 'Getting there' : 'Profile incomplete'}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {completion >= 80 ? 'Founders can find and pitch you.' : 'Complete your profile to start receiving matched pitches.'}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {nudges.map((n, i) => (
                        <Link key={i} to="/investor-profile"
                          className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-100 rounded-xl hover:bg-blue-100 transition-all group">
                          <AlertCircle className="w-4 h-4 text-blue-500 flex-shrink-0" />
                          <p className="text-xs font-medium text-slate-700 flex-1">{n.msg}</p>
                          <ArrowRight className="w-3.5 h-3.5 text-blue-400 group-hover:text-blue-600" />
                        </Link>
                      ))}
                    </div>
                  </div>
                </Card>
              )}

              {/* 2. Incoming Pitches */}
              {requests.length > 0 && (
                <Card className="f1">
                  <SectionHead title={`Incoming Pitches (${requests.length})`}
                    icon={<Bell style={{ width: 18, height: 18 }} className="text-rose-500" />} />
                  <div className="px-6 pb-6 space-y-3">
                    {requests.map(req => (
                      <div key={req.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 slide">
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradFor(req.sender?.id)} flex items-center justify-center text-white text-xs font-bold ss flex-shrink-0`}>
                            {initials(req.sender?.full_name)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                              <p className="font-semibold text-slate-900 text-sm ss">{req.sender?.full_name || 'Founder'}</p>
                              <span className="chip capitalize">{req.sender?.user_type?.replace(/-/g, ' ') || 'Founder'}</span>
                              <span className="text-xs text-slate-400 ml-auto">{timeAgo(req.created_at)}</span>
                            </div>
                            {req.sender?.location && (
                              <p className="text-xs text-slate-400 flex items-center gap-0.5 mb-1">
                                <MapPin className="w-3 h-3" />{req.sender.location}
                              </p>
                            )}
                            {req.message && (
                              <p className="text-xs text-slate-600 italic line-clamp-2 mt-1">"{req.message}"</p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2 mt-3">
                          <button onClick={() => handleRespond(req.id, 'accepted')}
                            disabled={!!responding[req.id]}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 disabled:opacity-50">
                            {responding[req.id] === 'accepted'
                              ? <Loader className="w-3.5 h-3.5 animate-spin" />
                              : <><CheckCircle className="w-3.5 h-3.5" />Interested</>}
                          </button>
                          <button onClick={() => handleMessage(req.sender?.id)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 border-2 border-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:border-blue-200 hover:text-blue-600">
                            <MessageSquare className="w-3.5 h-3.5" />Message
                          </button>
                          <button onClick={() => handleRespond(req.id, 'declined')}
                            disabled={!!responding[req.id]}
                            className="px-3 py-2.5 border-2 border-red-100 text-red-400 hover:bg-red-50 rounded-xl disabled:opacity-50">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* 3. Suggested Startups */}
              <Card className="f2">
                <SectionHead title="Suggested Startups" linkTo="/find-startups" linkLabel="Browse all"
                  icon={<Sparkles style={{ width: 18, height: 18 }} className="text-blue-500" />} />
                <div className="px-6 pb-6">
                  <p className="text-xs text-slate-400 mb-3">Matched to your investment stage and industry focus.</p>
                  {startups.length > 0 ? (
                    <div className="space-y-3">
                      {startups.slice(0, 4).map((s, i) => (
                        <StartupCard key={s.id || i}
                          startup={s}
                          onMessage={() => handleMessage(s.user_id)}
                          onExpress={() => handleExpress(s.user_id)}
                          expressState={exprStates[s.user_id]} />
                      ))}
                      {startups.length > 4 && (
                        <Link to="/find-startups"
                          className="flex items-center justify-center gap-1.5 w-full py-2.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded-xl transition-all">
                          See {startups.length - 4} more startups <ArrowRight className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                  ) : (
                    <div className="py-8 text-center bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                      <Rocket className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-slate-400 text-sm mb-2">No startup data yet.</p>
                      <Link to="/find-startups" className="inline-flex g-inv text-white text-xs font-bold px-4 py-2 rounded-xl">
                        Browse Startups
                      </Link>
                    </div>
                  )}
                </div>
              </Card>

              {/* 4. Messages */}
              <Card className="f3">
                <SectionHead title="Messages" linkTo="/messages" linkLabel="View all"
                  icon={<MessageSquare style={{ width: 18, height: 18 }} className="text-blue-500" />} />
                <div className="px-6 pb-6">
                  {convos.length > 0 ? (
                    <div className="space-y-1">
                      {convos.slice(0, 4).map(c => (
                        <Link key={c.id} to="/messages"
                          className={`flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-all ${c.unreadCount > 0 ? 'border-l-4 border-blue-400 bg-blue-50/30' : ''}`}>
                          <div className="relative flex-shrink-0">
                            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${gradFor(c.otherUser?.id)} flex items-center justify-center text-white text-xs font-bold ss`}>
                              {initials(c.otherUser?.full_name)}
                            </div>
                            {c.unreadCount > 0 && <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-blue-500 rounded-full border-2 border-white unread-pulse" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-slate-900 text-sm ss">{c.otherUser?.full_name || '—'}</p>
                            <p className={`text-xs truncate ${c.unreadCount > 0 ? 'text-slate-700 font-medium' : 'text-slate-400'}`}>
                              {c.lastMessage?.content || 'No messages yet'}
                            </p>
                          </div>
                          <span className="text-xs text-slate-300 flex-shrink-0">{timeAgo(c.last_message_at)}</span>
                        </Link>
                      ))}
                    </div>
                  ) : (
                    <div className="py-6 text-center">
                      <p className="text-slate-400 text-sm">No conversations yet.</p>
                      <p className="text-xs text-slate-300 mt-1">Respond to a pitch to start messaging.</p>
                    </div>
                  )}
                  <Link to="/messages" className="mt-3 flex items-center justify-center gap-2 w-full py-2.5 border-2 border-blue-100 text-blue-600 rounded-xl text-sm font-semibold hover:bg-blue-50">
                    <Send className="w-4 h-4" /> Open Messages
                  </Link>
                </div>
              </Card>
            </div>

            {/* ── SIDEBAR ────────────────────────────────────────────────── */}
            <div className="space-y-5">

              {/* Investor card */}
              <div className="g-dk rounded-2xl p-6 text-white relative overflow-hidden f0 lift">
                <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-white/5" />
                <div className="relative">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="ss font-bold text-base">My Portfolio</h3>
                    <DollarSign className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-lg font-bold ss flex-shrink-0 overflow-hidden">
                      {profile.avatar_url
                        ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                        : init}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold ss truncate">{profile.full_name || 'Complete profile'}</p>
                      <p className="text-blue-300 text-xs font-bold mt-0.5">
                        {investorProfile.firm_name || investorProfile.investor_type || 'Add firm name'}
                      </p>
                      {profile.location && (
                        <p className="text-white/50 text-xs flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3" />{profile.location}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-white/60">Profile strength</span>
                    <span className="font-bold">{completion}%</span>
                  </div>
                  <div className="h-2 bg-white/15 rounded-full overflow-hidden mb-4">
                    <div className="h-full bg-blue-400 rounded-full transition-all duration-700" style={{ width: `${completion}%` }} />
                  </div>
                  <Link to="/investor-profile" className="flex items-center justify-center gap-2 bg-white/15 hover:bg-white/25 text-white text-sm font-semibold py-2.5 rounded-xl transition-all">
                    <Edit3 className="w-4 h-4" /> Edit Profile
                  </Link>
                </div>
              </div>

              {/* Quick Actions */}
              <Card className="f1">
                <div className="px-6 pt-5 pb-2"><h3 className="ss font-bold text-slate-900 text-sm">Quick Actions</h3></div>
                <div className="px-6 pb-5 space-y-0.5">
                  {[
                    { Icon: Edit3,         label: 'Edit Profile',     to: '/investor-profile', col: 'text-blue-600'   },
                    { Icon: Search,        label: 'Browse Startups',  to: '/find-startups',    col: 'text-indigo-600' },
                    { Icon: MessageSquare, label: 'Messages',         to: '/messages',         col: 'text-violet-600' },
                    { Icon: Briefcase,     label: 'Discover',         to: '/discover',         col: 'text-teal-600'   },
                  ].map(({ Icon, label, to, col }, i) => (
                    <Link key={i} to={to} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-blue-50/50 group transition-all">
                      <Icon className={`w-4 h-4 ${col}`} />
                      <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 flex-1">{label}</span>
                      <ArrowUpRight className="w-3 h-3 text-slate-300 group-hover:text-slate-500" />
                    </Link>
                  ))}
                </div>
              </Card>

              {/* Portfolio stats */}
              <Card className="f2">
                <div className="px-6 pt-5 pb-5">
                  <h3 className="ss font-bold text-slate-900 text-sm mb-4 flex items-center gap-2">
                    <BarChart2 className="w-4 h-4 text-blue-500" /> Investor Stats
                  </h3>
                  <div className="space-y-2.5">
                    {[
                      { label: 'Ticket Size',   val: ticket,                              icon: '💵' },
                      { label: 'Portfolio',      val: `${investorProfile.portfolio_count || 0} companies`, icon: '🏢' },
                      { label: 'Exits',          val: `${investorProfile.successful_exits || 0}`,         icon: '🚀' },
                      { label: 'Accepting',      val: investorProfile.accepting_pitches !== false ? 'Yes ✓' : 'Paused', icon: '📩' },
                      { label: 'Contact via',    val: investorProfile.preferred_contact_method || 'Not set', icon: '📞' },
                    ].map((s, i) => (
                      <div key={i} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
                        <span className="text-xs text-slate-500 flex items-center gap-1.5">{s.icon} {s.label}</span>
                        <span className="text-xs font-bold text-slate-800 ss">{s.val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>

              {/* Industry focus chips */}
              {(investorProfile.industries_of_interest || []).length > 0 && (
                <Card className="f3">
                  <div className="px-6 pt-5 pb-5">
                    <h3 className="ss font-bold text-slate-900 text-sm mb-3 flex items-center gap-2">
                      <Star className="w-4 h-4 text-amber-400" /> My Focus Areas
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {investorProfile.industries_of_interest.slice(0, 8).map((ind, i) => (
                        <span key={i} className="text-xs bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-1 rounded-full font-medium">
                          {ind}
                        </span>
                      ))}
                    </div>
                    {(investorProfile.investment_stage || []).length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {investorProfile.investment_stage.map((st, i) => (
                          <span key={i} className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-1 rounded-full font-medium">
                            {st}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}