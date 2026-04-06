// src/pages/MentorRolePages/MentorDashboard.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import {
  fetchMentorDashboard, calcMentorCompletion, getMentorProfileNudges,
  rankFoundersForMentor, rankStudentsForMentor,
  respondToRequest, getOrCreateConversation,
} from '../../services/mentorService';
import {
  Users, MessageSquare, CheckCircle, X, Edit3, MapPin, Bell,
  ChevronRight, ArrowRight, ArrowUpRight, Loader, Sparkles,
  Send, Zap, Shield, Search, Star, TrendingUp, Lightbulb,
  Rocket, GraduationCap, Award, Target, UserCheck, AlertCircle,
  BookOpen,
} from 'lucide-react';

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800;900&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap');
  .ss{font-family:'Syne',sans-serif}.dm{font-family:'DM Sans',sans-serif}
  .lift{transition:transform .22s cubic-bezier(.22,.68,0,1.2),box-shadow .22s ease}
  .lift:hover{transform:translateY(-3px);box-shadow:0 16px 48px rgba(5,150,105,.10)}
  .g-ment{background:linear-gradient(135deg,#059669,#0891b2)}
  .g-teal{background:linear-gradient(135deg,#0d9488,#0891b2)}
  .g-dk{background:linear-gradient(135deg,#022c22,#164e63)}
  .page-bg{background-color:#f0fdf9;background-image:radial-gradient(circle,#6ee7b7 1px,transparent 1px);background-size:28px 28px}
  .sh{background:linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%);background-size:200% 100%;animation:sh 1.4s infinite;border-radius:10px}
  @keyframes sh{0%{background-position:200% 0}100%{background-position:-200% 0}}
  .f0{animation:fu .35s ease both}.f1{animation:fu .35s .07s ease both}
  .f2{animation:fu .35s .14s ease both}.f3{animation:fu .35s .21s ease both}
  .f4{animation:fu .35s .28s ease both}
  @keyframes fu{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
  .slide{animation:si .28s cubic-bezier(.32,.72,0,1) both}
  @keyframes si{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:none}}
  .prog-ring{transition:stroke-dashoffset .6s cubic-bezier(.4,0,.2,1)}
  .ai-badge{display:inline-flex;align-items:center;gap:3px;padding:2px 9px;border-radius:999px;font-size:10px;font-weight:700;background:linear-gradient(135deg,#059669,#0891b2);color:#fff}
  .chip{display:inline-flex;align-items:center;padding:2px 9px;border-radius:999px;font-size:11px;font-weight:600;border:1.5px solid #e2e8f0;background:#fff;color:#64748b}
  .unread-pulse{animation:udot 2s ease-in-out infinite}
  @keyframes udot{0%,100%{box-shadow:0 0 0 0 rgba(5,150,105,.5)}50%{box-shadow:0 0 0 5px rgba(5,150,105,0)}}
`;

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
  const g = ['from-emerald-500 to-teal-500','from-indigo-500 to-violet-500',
             'from-amber-500 to-orange-500','from-rose-500 to-pink-500',
             'from-blue-500 to-cyan-500','from-violet-500 to-purple-500'];
  return g[((id || '').charCodeAt?.(0) || 0) % g.length];
}
function Card({ children, className = '' }) {
  return <div className={`bg-white rounded-2xl shadow-sm border border-emerald-100/60 ${className}`}>{children}</div>;
}
function SectionHead({ title, icon, linkTo, linkLabel }) {
  return (
    <div className="flex items-center justify-between px-6 pt-6 pb-3">
      <h2 className="ss font-bold text-slate-900 flex items-center gap-2 text-base">{icon}{title}</h2>
      {linkLabel && linkTo && (
        <Link to={linkTo} className="text-xs font-semibold text-emerald-600 flex items-center gap-0.5 hover:gap-1.5 transition-all">
          {linkLabel}<ChevronRight className="w-3.5 h-3.5" />
        </Link>
      )}
    </div>
  );
}

// ── Suggested person card (founder or student) ────────────────────────────
function SuggestionCard({ person, label, onMessage, onOfferHelp, helpState }) {
  const isFounder = !!person.company_name || !!person.idea_title;
  const name      = person.profiles?.full_name || 'Unknown';
  const subtitle  = isFounder
    ? (person.company_name || person.idea_title || 'Startup')
    : (person.profiles?.bio?.slice(0, 50) || 'Student');
  const industry  = person.industry || (person.interests || [])[0] || '';
  const score     = person._score || 0;
  const reason    = person._matchReason || 'Matches your profile';

  return (
    <div className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-100 hover:border-emerald-100 hover:bg-emerald-50/20 transition-all lift">
      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradFor(person.user_id)} flex items-center justify-center text-white text-xs font-bold ss flex-shrink-0`}>
        {initials(name)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="font-semibold text-slate-900 text-sm ss leading-tight">{name}</p>
          {score >= 40 && (
            <span className="ai-badge flex-shrink-0"><Sparkles className="w-2.5 h-2.5" />AI Match</span>
          )}
        </div>
        <p className="text-xs text-slate-500 truncate">{subtitle}</p>
        {person.profiles?.location && (
          <p className="text-xs text-slate-400 flex items-center gap-0.5 mt-0.5">
            <MapPin className="w-3 h-3" />{person.profiles.location}
          </p>
        )}
        <p className="text-xs text-emerald-600 font-medium mt-1 italic">"{reason}"</p>
        {(person.help_needed || []).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {person.help_needed.slice(0, 2).map((h, i) => (
              <span key={i} className="chip">{h}</span>
            ))}
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1.5 flex-shrink-0">
        <button onClick={onMessage}
          className="p-1.5 border border-slate-200 rounded-lg text-slate-400 hover:text-emerald-600 hover:border-emerald-200 transition-all">
          <MessageSquare className="w-3.5 h-3.5" />
        </button>
        <button onClick={onOfferHelp} disabled={helpState === 'sent' || helpState === 'sending'}
          className={`p-1.5 rounded-lg transition-all ${
            helpState === 'sent'    ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' :
            helpState === 'sending' ? 'bg-emerald-50 text-emerald-300 border border-emerald-100' :
            'bg-emerald-600 text-white hover:bg-emerald-700'
          }`}>
          {helpState === 'sent'    ? <CheckCircle className="w-3.5 h-3.5" /> :
           helpState === 'sending' ? <Loader className="w-3.5 h-3.5 animate-spin" /> :
           <Zap className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
export default function MentorDashboard() {
  const { user }   = useAuth();
  const navigate   = useNavigate();

  const [data,       setData]       = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [responding, setResponding] = useState({});
  const [helpStates, setHelpStates] = useState({});

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const d = await fetchMentorDashboard(user.id);
      // Rank suggestions by relevance
      d.founders  = rankFoundersForMentor(d.founders,  d.mentorProfile);
      d.students  = rankStudentsForMentor(d.students,  d.mentorProfile);
      setData(d);
    } catch (e) { console.error('[MentorDashboard]', e); }
    finally { setLoading(false); }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const handleRespond = async (reqId, status) => {
    setResponding(p => ({ ...p, [reqId]: status }));
    try {
      await respondToRequest(reqId, status);
      setData(prev => ({
        ...prev,
        requests: prev.requests.filter(r => r.id !== reqId),
        // If accepted, re-fetch mentees next load
      }));
      if (status === 'accepted') load();
    } catch (e) { alert(e.message); setResponding(p => ({ ...p, [reqId]: null })); }
  };

  const handleMessage = async (targetId) => {
    try { await getOrCreateConversation(user.id, targetId); navigate('/messages'); }
    catch (e) { console.error(e); }
  };

  const handleOfferHelp = async (targetId, targetType) => {
    if (helpStates[targetId]) return;
    setHelpStates(p => ({ ...p, [targetId]: 'sending' }));
    try {
      const { sendConnectionRequest } = await import('../../services/mentorService');
      await sendConnectionRequest(user.id, targetId, 'mentor_offer');
      setHelpStates(p => ({ ...p, [targetId]: 'sent' }));
    } catch (e) {
      if (!e.message?.includes('23505')) alert(e.message);
      else setHelpStates(p => ({ ...p, [targetId]: 'sent' }));
    }
  };

  if (loading) return (
    <>
      <style>{CSS}</style>
      <div className="min-h-screen page-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl g-ment flex items-center justify-center mx-auto mb-3 shadow-lg">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <p className="ss font-bold text-slate-900">Loading your mentor hub…</p>
          <Loader className="w-5 h-5 animate-spin text-emerald-500 mx-auto mt-2" />
        </div>
      </div>
    </>
  );

  const { profile = {}, mentorProfile = {}, requests = [], mentees = [],
          founders = [], students = [], convos = [] } = data || {};

  const firstName  = profile.full_name?.split(' ')[0] || 'Mentor';
  const init       = initials(profile.full_name);
  const completion = calcMentorCompletion(profile, mentorProfile);
  const nudges     = getMentorProfileNudges(profile, mentorProfile);
  const unread     = (convos || []).reduce((s, c) => s + (c.unreadCount || 0), 0);
  const capacity   = mentorProfile.mentorship_capacity || 3;
  const activeCt   = mentees.length;
  const spotsLeft  = Math.max(0, capacity - activeCt);

  // Progress ring
  const R = 22, C = 2 * Math.PI * R, dash = C * (completion / 100);

  return (
    <>
      <style>{CSS}</style>
      <div className="min-h-screen page-bg dm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">

          {/* ── HERO ──────────────────────────────────────────────────── */}
          <div className="g-dk rounded-3xl px-7 py-8 md:px-10 mb-6 text-white relative overflow-hidden f0">
            <div className="absolute -right-12 -top-12 w-60 h-60 rounded-full opacity-10 blur-2xl"
              style={{ background: 'radial-gradient(circle,#34d399,transparent)' }} />
            <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest bg-emerald-400/20 text-emerald-200 px-3 py-1 rounded-full border border-emerald-400/20">
                    <BookOpen className="w-3.5 h-3.5" /> Mentor
                  </span>
                  {requests.length > 0 && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold bg-red-500 text-white px-2.5 py-0.5 rounded-full">
                      <Bell className="w-3 h-3" /> {requests.length} new
                    </span>
                  )}
                  {spotsLeft > 0 && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold bg-emerald-500/30 text-emerald-200 px-2.5 py-0.5 rounded-full">
                      {spotsLeft} spot{spotsLeft !== 1 ? 's' : ''} open
                    </span>
                  )}
                </div>
                <h1 className="ss font-black text-3xl md:text-4xl leading-none mb-1">
                  Welcome, {firstName} 👋
                </h1>
                <p className="text-white/60 text-sm max-w-lg">
                  {mentorProfile.current_role
                    ? `${mentorProfile.current_role}${mentorProfile.current_company ? ` · ${mentorProfile.current_company}` : ''}`
                    : 'Complete your profile to start receiving mentorship requests.'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 md:flex-col lg:flex-row">
                <Link to="/mentor-profile" className="g-ment flex items-center gap-2 text-white font-bold text-sm px-5 py-2.5 rounded-xl shadow hover:opacity-90 transition-all">
                  <Edit3 className="w-4 h-4" /> Edit Profile
                </Link>
                <Link to="/find-founders" className="bg-white/15 border border-white/20 text-white flex items-center gap-2 font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-white/25 transition-all">
                  <Search className="w-4 h-4" /> Find Founders
                </Link>
                <Link to="/messages" className="bg-white/10 border border-white/15 text-white/80 flex items-center gap-2 font-semibold text-sm px-5 py-2.5 rounded-xl hover:bg-white/20 transition-all">
                  <MessageSquare className="w-4 h-4" /> Messages {unread > 0 && <span className="bg-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">{unread}</span>}
                </Link>
              </div>
            </div>
          </div>

          {/* ── STATS ROW ───────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 f1">
            {[
              { label: 'Profile',    val: `${completion}%`,  sub: completion >= 80 ? 'Strong profile!' : 'Needs work', Icon: Shield,      grad: 'from-emerald-500 to-teal-500' },
              { label: 'Requests',   val: `${requests.length}`, sub: 'Pending',      Icon: Bell,        grad: 'from-rose-500 to-pink-500' },
              { label: 'Mentees',    val: `${activeCt}`,     sub: `${spotsLeft} spots open`,             Icon: UserCheck,   grad: 'from-indigo-500 to-violet-500' },
              { label: 'Messages',   val: `${convos.length}`, sub: `${unread} unread`,                  Icon: MessageSquare, grad: 'from-blue-500 to-cyan-500' },
            ].map((s, i) => (
              <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-emerald-100/60 lift">
                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${s.grad} flex items-center justify-center text-white mb-3`}>
                  <s.Icon style={{ width: 17, height: 17 }} />
                </div>
                <p className="ss text-2xl font-black text-slate-900">{s.val}</p>
                <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
                <p className="text-xs text-emerald-600 font-semibold mt-0.5">{s.sub}</p>
              </div>
            ))}
          </div>

          {/* ── MAIN GRID ───────────────────────────────────────────────── */}
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-5">

              {/* 1. Profile Strength */}
              {nudges.length > 0 && (
                <Card className="f1">
                  <SectionHead title="Profile Strength" icon={<Shield className="w-4.5 h-4.5 text-emerald-500" style={{ width: 18, height: 18 }} />} linkTo="/mentor-profile" linkLabel="Complete profile" />
                  <div className="px-6 pb-6">
                    <div className="flex items-center gap-5 mb-4">
                      {/* Ring */}
                      <div className="relative flex-shrink-0">
                        <svg width="58" height="58" className="-rotate-90">
                          <circle cx="29" cy="29" r={R} fill="none" stroke="#d1fae5" strokeWidth="5" />
                          <circle cx="29" cy="29" r={R} fill="none" stroke="#059669" strokeWidth="5"
                            strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C - dash}
                            className="prog-ring" />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center ss font-black text-xs text-slate-900">{completion}%</span>
                      </div>
                      <div>
                        <p className="ss font-bold text-slate-900">
                          {completion >= 80 ? 'Strong profile' : completion >= 50 ? 'Getting there' : 'Just getting started'}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {completion >= 80
                            ? 'You\'re visible to students and founders.'
                            : 'Complete your profile to appear in search results.'}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {nudges.map((n, i) => (
                        <Link key={i} to="/mentor-profile"
                          className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-100 rounded-xl hover:bg-emerald-100 transition-all group">
                          <AlertCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                          <p className="text-xs font-medium text-slate-700 flex-1">{n.msg}</p>
                          <ArrowRight className="w-3.5 h-3.5 text-emerald-400 group-hover:text-emerald-600" />
                        </Link>
                      ))}
                    </div>
                  </div>
                </Card>
              )}

              {/* 2. Incoming Requests */}
              {requests.length > 0 && (
                <Card className="f1">
                  <SectionHead
                    title={`Mentorship Requests (${requests.length})`}
                    icon={<Bell className="w-4.5 h-4.5 text-rose-500" style={{ width: 18, height: 18 }} />}
                  />
                  <div className="px-6 pb-6 space-y-3">
                    {requests.map(req => (
                      <div key={req.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 slide">
                        <div className="flex items-start gap-3">
                          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradFor(req.sender?.id)} flex items-center justify-center text-white text-xs font-bold ss flex-shrink-0`}>
                            {initials(req.sender?.full_name)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                              <p className="font-semibold text-slate-900 text-sm ss">{req.sender?.full_name || 'Unknown'}</p>
                              <span className="chip capitalize text-xs">{req.sender?.user_type?.replace(/-/g, ' ') || 'User'}</span>
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
                          <button
                            onClick={() => handleRespond(req.id, 'accepted')}
                            disabled={!!responding[req.id]}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition-all disabled:opacity-50">
                            {responding[req.id] === 'accepted'
                              ? <Loader className="w-3.5 h-3.5 animate-spin" />
                              : <><CheckCircle className="w-3.5 h-3.5" />Accept</>}
                          </button>
                          <button
                            onClick={() => handleMessage(req.sender?.id)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 border-2 border-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:border-emerald-200 hover:text-emerald-600 transition-all">
                            <MessageSquare className="w-3.5 h-3.5" />Message
                          </button>
                          <button
                            onClick={() => handleRespond(req.id, 'declined')}
                            disabled={!!responding[req.id]}
                            className="px-3 py-2.5 border-2 border-red-100 text-red-400 hover:bg-red-50 rounded-xl transition-all disabled:opacity-50">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* 3. Active Mentees */}
              <Card className="f2">
                <SectionHead title="Active Mentees" icon={<UserCheck className="w-4.5 h-4.5 text-indigo-500" style={{ width: 18, height: 18 }} />} linkTo="/my-mentees" linkLabel="View all" />
                <div className="px-6 pb-6">
                  {mentees.length === 0 ? (
                    <div className="py-8 text-center bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                      <UserCheck className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-slate-400 text-sm">No active mentees yet.</p>
                      <p className="text-xs text-slate-300 mt-1">Accept a request above to start mentoring.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {mentees.slice(0, 4).map((m, i) => {
                        const startup = m.founderData?.company_name || m.founderData?.idea_title
                          || m.studentData?.startup_idea_description?.slice(0, 50)
                          || null;
                        return (
                          <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-slate-100 hover:border-emerald-100 transition-all">
                            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${gradFor(m.user?.id)} flex items-center justify-center text-white text-xs font-bold ss flex-shrink-0`}>
                              {initials(m.user?.full_name)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-slate-900 text-sm ss">{m.user?.full_name || '—'}</p>
                              {startup && <p className="text-xs text-slate-500 truncate">{startup}</p>}
                              <p className="text-xs text-emerald-600 font-medium">
                                {m.user?.user_type === 'early-stage-founder' ? '🚀 Founder' : '🎓 Student'}
                              </p>
                            </div>
                            <button onClick={() => handleMessage(m.user?.id)}
                              className="p-1.5 border border-slate-200 rounded-lg text-slate-400 hover:text-emerald-600 hover:border-emerald-200 transition-all">
                              <MessageSquare className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                      {mentees.length > 4 && (
                        <Link to="/my-mentees" className="flex items-center justify-center gap-1.5 w-full py-2.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
                          See {mentees.length - 4} more <ArrowRight className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              </Card>

              {/* 4. AI Suggested Founders */}
              <Card className="f3">
                <SectionHead title="Suggested Founders" icon={<Sparkles className="w-4.5 h-4.5 text-emerald-500" style={{ width: 18, height: 18 }} />} linkTo="/find-founders" linkLabel="Browse all" />
                <div className="px-6 pb-6">
                  <p className="text-xs text-slate-400 mb-3">Matched to your expertise and what you can help with.</p>
                  {founders.length > 0 ? (
                    <div className="space-y-2">
                      {founders.slice(0, 3).map((f, i) => (
                        <SuggestionCard key={f.id || i} person={f}
                          label="Founder"
                          onMessage={() => handleMessage(f.user_id)}
                          onOfferHelp={() => handleOfferHelp(f.user_id, 'founder')}
                          helpState={helpStates[f.user_id]} />
                      ))}
                      {founders.length > 3 && (
                        <Link to="/find-founders" className="flex items-center justify-center gap-1.5 w-full py-2.5 text-xs font-semibold text-emerald-600 hover:bg-emerald-50 rounded-xl transition-all">
                          See {founders.length - 3} more founders <ArrowRight className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                  ) : (
                    <div className="py-8 text-center bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                      <p className="text-slate-400 text-sm mb-2">No founders yet.</p>
                      <Link to="/find-founders" className="inline-flex g-ment text-white text-xs font-bold px-4 py-2 rounded-xl">
                        Browse Founders
                      </Link>
                    </div>
                  )}
                </div>
              </Card>

              {/* Suggested Students */}
              {students.length > 0 && (
                <Card className="f3">
                  <SectionHead title="Students with Ideas" icon={<GraduationCap className="w-4.5 h-4.5 text-indigo-500" style={{ width: 18, height: 18 }} />} linkTo="/find-founders" linkLabel="See all" />
                  <div className="px-6 pb-6">
                    <p className="text-xs text-slate-400 mb-3">Students actively building — and needing your guidance.</p>
                    <div className="space-y-2">
                      {students.slice(0, 3).map((s, i) => (
                        <SuggestionCard key={s.id || i} person={s}
                          label="Student"
                          onMessage={() => handleMessage(s.user_id)}
                          onOfferHelp={() => handleOfferHelp(s.user_id, 'student')}
                          helpState={helpStates[s.user_id]} />
                      ))}
                    </div>
                  </div>
                </Card>
              )}

              {/* Messages preview */}
              <Card className="f4">
                <SectionHead title="Messages" icon={<MessageSquare className="w-4.5 h-4.5 text-blue-500" style={{ width: 18, height: 18 }} />} linkTo="/messages" linkLabel="View all" />
                <div className="px-6 pb-6">
                  {convos.length > 0 ? (
                    <div className="space-y-1">
                      {convos.slice(0, 4).map(c => (
                        <Link key={c.id} to="/messages"
                          className={`flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-all ${c.unreadCount > 0 ? 'border-l-4 border-emerald-400 bg-emerald-50/30' : ''}`}>
                          <div className="relative flex-shrink-0">
                            <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${gradFor(c.otherUser?.id)} flex items-center justify-center text-white text-xs font-bold ss`}>
                              {initials(c.otherUser?.full_name)}
                            </div>
                            {c.unreadCount > 0 && <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white unread-pulse" />}
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
                      <p className="text-xs text-slate-300 mt-1">Accept a request to start messaging.</p>
                    </div>
                  )}
                  <Link to="/messages" className="mt-3 flex items-center justify-center gap-2 w-full py-2.5 border-2 border-emerald-100 text-emerald-600 rounded-xl text-sm font-semibold hover:bg-emerald-50 transition-all">
                    <Send className="w-4 h-4" /> Open Messages
                  </Link>
                </div>
              </Card>
            </div>

            {/* SIDEBAR */}
            <div className="space-y-5">

              {/* Mentor card */}
              <div className="g-dk rounded-2xl p-6 text-white relative overflow-hidden f0 lift">
                <div className="absolute -right-6 -bottom-6 w-24 h-24 rounded-full bg-white/5" />
                <div className="relative">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="ss font-bold text-base">My Profile</h3>
                    <BookOpen className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center text-lg font-bold ss flex-shrink-0 overflow-hidden">
                      {profile.avatar_url
                        ? <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
                        : init}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold ss truncate">{profile.full_name || 'Complete your profile'}</p>
                      <p className="text-emerald-300 text-xs font-bold mt-0.5">
                        {mentorProfile.current_role || 'Add your role'}
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
                    <div className="h-full bg-emerald-400 rounded-full transition-all duration-700" style={{ width: `${completion}%` }} />
                  </div>
                  <Link to="/mentor-profile" className="flex items-center justify-center gap-2 bg-white/15 hover:bg-white/25 text-white text-sm font-semibold py-2.5 rounded-xl transition-all">
                    <Edit3 className="w-4 h-4" /> Edit Profile
                  </Link>
                </div>
              </div>

              {/* Quick Actions */}
              <Card className="f1">
                <div className="px-6 pt-5 pb-2">
                  <h3 className="ss font-bold text-slate-900 text-sm">Quick Actions</h3>
                </div>
                <div className="px-6 pb-5 space-y-0.5">
                  {[
                    { Icon: Edit3,        label: 'Edit Profile',    to: '/mentor-profile', col: 'text-emerald-600' },
                    { Icon: Search,       label: 'Find Founders',   to: '/find-founders',  col: 'text-indigo-600'  },
                    { Icon: UserCheck,    label: 'My Mentees',      to: '/my-mentees',     col: 'text-violet-600'  },
                    { Icon: MessageSquare,label: 'Messages',        to: '/messages',       col: 'text-blue-600'    },
                    { Icon: BookOpen,     label: 'Discover',        to: '/discover',       col: 'text-teal-600'    },
                  ].map(({ Icon, label, to, col }, i) => (
                    <Link key={i} to={to} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-emerald-50/50 group transition-all">
                      <Icon className={`w-4 h-4 ${col}`} />
                      <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 flex-1">{label}</span>
                      <ArrowUpRight className="w-3 h-3 text-slate-300 group-hover:text-slate-500" />
                    </Link>
                  ))}
                </div>
              </Card>

              {/* Mentor stats */}
              <Card className="f2">
                <div className="px-6 pt-5 pb-5">
                  <h3 className="ss font-bold text-slate-900 text-sm mb-4 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-emerald-500" /> Mentoring Stats
                  </h3>
                  <div className="space-y-3">
                    {[
                      { label: 'Capacity',    val: `${capacity} mentees max`,    icon: '📊' },
                      { label: 'Active',      val: `${activeCt} mentee${activeCt !== 1 ? 's' : ''}`, icon: '✅' },
                      { label: 'Open spots',  val: `${spotsLeft} available`,     icon: '🟢' },
                      { label: 'Rate',        val: mentorProfile.is_pro_bono
                                                  ? 'Pro Bono ✓'
                                                  : mentorProfile.hourly_rate
                                                    ? `$${mentorProfile.hourly_rate}/hr`
                                                    : 'Not set', icon: '💰' },
                    ].map((s, i) => (
                      <div key={i} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl">
                        <span className="text-xs text-slate-500 flex items-center gap-1.5">{s.icon} {s.label}</span>
                        <span className="text-xs font-bold text-slate-800 ss">{s.val}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>

              {/* Expertise chips */}
              {(mentorProfile.expertise_areas || []).length > 0 && (
                <Card className="f3">
                  <div className="px-6 pt-5 pb-5">
                    <h3 className="ss font-bold text-slate-900 text-sm mb-3 flex items-center gap-2">
                      <Star className="w-4 h-4 text-amber-400" /> My Expertise
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {mentorProfile.expertise_areas.slice(0, 8).map((e, i) => (
                        <span key={i} className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-100 px-2.5 py-1 rounded-full font-medium">
                          {e}
                        </span>
                      ))}
                    </div>
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