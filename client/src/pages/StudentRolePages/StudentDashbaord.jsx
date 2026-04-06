// src/pages/StudentRolePages/StudentDashboard.jsx
// ─── Student Dashboard — Final Brief ───────────────────────────────────────
// Sections:
//   1. Hero + CTAs (context-aware)
//   2. Journey Status (has_startup_idea / has_cofounder / connected_mentor)
//   3. Smart Recommendations (Mentors + Co-founders — real DB)
//   4. Action Cards
//   5. Recent Activity (messages + requests)
//   6. Sidebar (profile card, XP, quick actions)
//
// Logic:
//   if (!has_startup_idea)              → show Explore Ideas mode
//   if (has_startup_idea && !has_cofounder) → show Find Co-Founder CTA
//   if (has_startup_idea)               → show Find Mentor CTA
// ───────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../auth/AuthContext';
import {
  fetchConversations,
  fetchMentors,
  fetchCoFounders,
} from '../../services/studentService';
import {
  Rocket, Users, MessageSquare, ChevronRight, UserPlus,
  Zap, Target, Calendar, ArrowUpRight, CheckCircle,
  Clock, GraduationCap, Award, Flame, Lightbulb, Bell,
  DollarSign, Shield, Edit3, MapPin, Loader, Activity,
  Send, ChevronDown, ChevronUp, FileText, Gift, Search,
  Megaphone, ArrowRight, TrendingUp, BookOpen, Star,
  Plus, X, Sparkles, Brain, AlertCircle, BarChart2, Inbox,
} from 'lucide-react';

// ─── Styles ────────────────────────────────────────────────────────────────
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800;900&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap');
  .ss{font-family:'Syne',sans-serif}
  .dm{font-family:'DM Sans',sans-serif}
  .lift{transition:transform .22s cubic-bezier(.22,.68,0,1.2),box-shadow .22s ease}
  .lift:hover{transform:translateY(-3px);box-shadow:0 16px 48px rgba(79,70,229,.11)}
  .g-ind{background:linear-gradient(135deg,#4f46e5,#7c3aed)}
  .g-vi{background:linear-gradient(135deg,#7c3aed,#6366f1)}
  .g-em{background:linear-gradient(135deg,#059669,#0891b2)}
  .g-am{background:linear-gradient(135deg,#f59e0b,#ef4444)}
  .g-dk{background:linear-gradient(135deg,#1e1b4b,#312e81)}
  .page-bg{background-color:#f4f5fb;background-image:radial-gradient(circle,#c7d2fe 1px,transparent 1px);background-size:28px 28px}
  .sh{background:linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%);background-size:200% 100%;animation:sh 1.4s infinite;border-radius:10px}
  @keyframes sh{0%{background-position:200% 0}100%{background-position:-200% 0}}
  .f0{animation:fu .35s ease both}
  .f1{animation:fu .35s .07s ease both}
  .f2{animation:fu .35s .14s ease both}
  .f3{animation:fu .35s .21s ease both}
  .f4{animation:fu .35s .28s ease both}
  .f5{animation:fu .35s .35s ease both}
  @keyframes fu{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
  .qa{transition:all .2s cubic-bezier(.22,.68,0,1.2)}
  .qa:hover{transform:translateY(-2px) scale(1.025);box-shadow:0 10px 30px rgba(79,70,229,.18)}
  .journey-item{border:2px solid #e2e8f0;border-radius:14px;padding:14px 16px;transition:all .2s}
  .journey-item.done{border-color:#a7f3d0;background:#f0fdf4}
  .journey-item.active{border-color:#a5b4fc;background:#eef2ff}
  .journey-item.pending{opacity:.55}
  .pulse{animation:pulse 2.5s ease-in-out infinite}
  @keyframes pulse{0%,100%{box-shadow:0 0 0 0 rgba(99,102,241,.4)}50%{box-shadow:0 0 0 6px rgba(99,102,241,0)}}
  .unread-dot{animation:udot 2s ease-in-out infinite}
  @keyframes udot{0%,100%{box-shadow:0 0 0 0 rgba(79,70,229,.5)}50%{box-shadow:0 0 0 5px rgba(79,70,229,0)}}
`;

// ─── Static data ───────────────────────────────────────────────────────────
const OPPORTUNITIES = [
  { id: 1, type: 'Accelerator', Icon: Rocket, grad: 'g-ind', name: 'Launchpad Accelerator – Cohort 5', deadline: 'Mar 30, 2026', funding: '$15,000', tag: 'New', tagCls: 'bg-indigo-100 text-indigo-700', desc: 'Equity-free accelerator for student founders in South Asia.' },
  { id: 2, type: 'Grant', Icon: Gift, grad: 'g-em', name: 'IGNITE Student Innovation Grant', deadline: 'Apr 10, 2026', funding: '$5,000', tag: 'Open', tagCls: 'bg-emerald-100 text-emerald-700', desc: 'Non-dilutive grant for early-stage student-led startups.' },
  { id: 3, type: 'Event', Icon: Megaphone, grad: 'g-am', name: 'Karachi Startup Summit 2026', deadline: 'Apr 18, 2026', funding: 'Free', tag: 'Upcoming', tagCls: 'bg-amber-100 text-amber-700', desc: '300+ founders, investors & mentors. Apply to pitch on stage.' },
];

// ─── Helpers ───────────────────────────────────────────────────────────────
function initials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}
function timeAgo(iso) {
  if (!iso) return '';
  const s = (Date.now() - new Date(iso)) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
function roleGrad(t) {
  return { mentor: 'from-violet-500 to-indigo-500', investor: 'from-emerald-500 to-teal-500', student: 'from-indigo-500 to-violet-500', 'early-stage-founder': 'from-amber-500 to-orange-500' }[t] || 'from-slate-400 to-slate-500';
}
function shapeMentor(r) {
  const p = r.profiles || {};
  return {
    id: r.id, user_id: r.user_id,
    name: p.full_name || 'Mentor',
    init: initials(p.full_name),
    grad: 'from-violet-500 to-indigo-500',
    role: r.current_role || r.current_company || 'Mentor',
    expertise: (r.expertise_areas || []).slice(0, 3),
    location: p.location || 'Remote',
    available: !!(r.available_for?.length),
    why: `Expert in ${(r.expertise_areas || []).slice(0, 2).join(' & ') || 'mentorship'}.`,
  };
}
function shapeCofounder(r, currentUserId) {
  const p = r.profiles || {};
  const skills = (r.skills_with_levels || []).map(s => s.skill || s).filter(Boolean);
  return {
    id: r.id, user_id: r.user_id,
    name: p.full_name || 'Co-Founder',
    init: initials(p.full_name),
    grad: 'from-indigo-500 to-violet-500',
    role: skills.slice(0, 2).join(' + ') || 'Student Builder',
    skills: skills.slice(0, 3),
    location: p.location || 'Remote',
    commitment: r.commitment_level || 'Flexible',
    idea: r.has_startup_idea,
    why: r.has_startup_idea ? 'Has a startup idea — looking for co-founder.' : 'Actively looking to build together.',
  };
}

// ─── Sub-components ────────────────────────────────────────────────────────
function Shimmer({ h = 'h-16' }) { return <div className={`sh ${h} w-full`} />; }
function Card({ children, className = '' }) {
  return <div className={`bg-white rounded-2xl shadow-sm border border-slate-100 ${className}`}>{children}</div>;
}
function SectionHead({ title, icon, linkTo, linkLabel }) {
  return (
    <div className="flex items-center justify-between px-6 pt-6 pb-3">
      <h2 className="ss font-bold text-slate-900 text-lg flex items-center gap-2">{icon}{title}</h2>
      {linkLabel && linkTo && (
        <Link to={linkTo} className="text-xs text-indigo-600 font-semibold flex items-center gap-1 hover:gap-2 transition-all">
          {linkLabel}<ChevronRight className="w-3.5 h-3.5" />
        </Link>
      )}
    </div>
  );
}

// ─── People card ───────────────────────────────────────────────────────────
function PeopleCard({ item, accentClass, ctaClass, ctaLabel, onConnect, onMessage }) {
  return (
    <div className="border border-slate-100 rounded-2xl p-4 hover:border-indigo-100 hover:shadow-md transition-all lift">
      <div className="flex items-start gap-3 mb-3">
        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${item.grad} flex items-center justify-center text-white font-bold text-sm ss flex-shrink-0`}>{item.init}</div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900 text-sm ss leading-snug">{item.name}</p>
          <p className="text-xs text-slate-500 truncate">{item.role}</p>
          {item.location && <p className="text-xs text-slate-400 flex items-center gap-0.5 mt-0.5"><MapPin className="w-3 h-3" />{item.location}</p>}
        </div>
        {item.available !== undefined && (
          <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1 ${item.available ? 'bg-emerald-400' : 'bg-slate-300'}`} />
        )}
      </div>
      {(item.expertise || item.skills || []).length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {(item.expertise || item.skills).slice(0, 3).map((t, i) => (
            <span key={i} className={`text-xs px-2.5 py-1 rounded-full font-medium ${accentClass}`}>{t}</span>
          ))}
        </div>
      )}
      {item.why && (
        <div className={`flex items-start gap-1.5 p-2.5 rounded-xl mb-3 ${accentClass}`}>
          <Sparkles className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 opacity-70" />
          <p className="text-xs leading-relaxed italic">{item.why}</p>
        </div>
      )}
      <div className="flex gap-2">
        <button onClick={onMessage}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 border-2 border-slate-200 text-slate-600 hover:border-indigo-200 hover:text-indigo-600 rounded-xl text-xs font-bold transition-all">
          <MessageSquare className="w-3.5 h-3.5" /> Message
        </button>
        <button onClick={onConnect}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 ${ctaClass} text-white rounded-xl text-xs font-bold hover:opacity-90 transition-all`}>
          <UserPlus className="w-3.5 h-3.5" /> {ctaLabel}
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════
export default function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);    // profiles row (includes student_profiles nested)
  const [sp, setSp] = useState(null);    // student_profiles row
  const [activities, setActivities] = useState([]);
  const [convos, setConvos] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [coFounders, setCoFounders] = useState([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [connsLoading, setConnsLoading] = useState(false);
  const [showMore, setShowMore] = useState({ mentors: false, cf: false, opps: false });

  // ── Load ──────────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    if (!user) return;
    try {
      const [profRes, actRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
        supabase.from('student_activities').select('*').eq('user_id', user.id)
          .order('created_at', { ascending: false }).limit(8),
      ]);
      setProfile(profRes.data || {});
      setActivities(actRes.data || []);

      // Load student_profiles separately to get journey fields
      const { data: spData } = await supabase.from('student_profiles')
        .select('*').eq('user_id', user.id).maybeSingle();
      setSp(spData || {});

      setPageLoading(false);

      // Background: load connections
      setConnsLoading(true);
      try {
        const [convData, mentorData, cfData] = await Promise.all([
          fetchConversations(user.id).catch(() => []),
          fetchMentors({ limit: 6 }).catch(() => []),
          fetchCoFounders({ limit: 6 }).catch(() => []),
        ]);
        setConvos(convData);
        setMentors(mentorData.map(shapeMentor));
        setCoFounders(cfData.filter(r => r.user_id !== user.id).map(r => shapeCofounder(r, user.id)));
      } catch (err) { console.warn('[Dashboard] connections:', err.message); }
      finally { setConnsLoading(false); }
    } catch (err) {
      console.error('[Dashboard]', err);
      setPageLoading(false);
    }
  }, [user]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── Journey answers (save directly to student_profiles) ───────────────
  const setJourneyField = async (field, value) => {
    // Optimistic update
    setSp(prev => ({ ...prev, [field]: value }));
    try {
      await supabase.from('student_profiles').upsert({
        user_id: user.id,
        [field]: value,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
    } catch (err) {
      console.warn('journey save:', err.message);
      setSp(prev => ({ ...prev, [field]: !value })); // revert
    }
    // Log activity
    logActivity(field, field === 'has_startup_idea'
      ? (value ? 'Confirmed having a startup idea' : 'Marked as exploring')
      : (value ? 'Connected with a co-founder' : 'Updated co-founder status'));
  };

  const logActivity = async (type, description) => {
    const entry = { user_id: user.id, type, description, created_at: new Date().toISOString() };
    setActivities(prev => [entry, ...prev].slice(0, 8));
    try { await supabase.from('student_activities').insert(entry); } catch { }
  };

  // ── Loading screen ────────────────────────────────────────────────────
  if (pageLoading) return (
    <>
      <style>{CSS}</style>
      <div className="min-h-screen page-bg flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl g-ind flex items-center justify-center mx-auto mb-4">
            <Brain className="w-6 h-6 text-white" />
          </div>
          <p className="ss font-bold text-slate-900 text-lg mb-1">Loading Dashboard</p>
          <p className="text-slate-400 text-sm dm">Fetching your journey…</p>
        </div>
      </div>
    </>
  );

  // ── Derived values ────────────────────────────────────────────────────
  const p = profile || {};
  const s = sp || {};
  const firstName = p.full_name?.split(' ')[0] || 'there';
  const init = initials(p.full_name);
  const completion = p.profile_completion || 0;
  const unread = convos.reduce((sum, c) => sum + (c.unreadCount || 0), 0);

  // ── BRIEF LOGIC ───────────────────────────────────────────────────────
  const hasStartupIdea = s.has_startup_idea || false;
  const hasCofounder = s.has_cofounder || false;
  const ideaAnswered = s.has_startup_idea !== null && s.has_startup_idea !== undefined;
  const hasConnectedMentor = convos.some(c => c.otherUser?.user_type === 'mentor');

  // Primary CTA from brief:  
  // !has_startup_idea → Explore Ideas
  // has_startup_idea && !has_cofounder → Find Co-Founder
  // has_startup_idea → Find Mentor
  let primaryCTA;
  if (!hasStartupIdea) {
    primaryCTA = { label: 'Explore Ideas', icon: <Search className="w-4 h-4" />, to: '/discover', grad: 'g-ind' };
  } else if (!hasCofounder) {
    primaryCTA = { label: 'Find Co-Founder', icon: <UserPlus className="w-4 h-4" />, to: '/find-cofounders', grad: 'g-vi' };
  } else {
    primaryCTA = { label: 'Find Mentor', icon: <Users className="w-4 h-4" />, to: '/find-mentors', grad: 'g-ind' };
  }

  // Journey milestones for XP tracker
  const milestones = [
    { id: 'profile', label: 'Complete your profile', done: completion >= 60, icon: '👤', xp: 50 },
    { id: 'idea', label: 'Answer — have an idea?', done: ideaAnswered, icon: '💡', xp: 30 },
    { id: 'mentor', label: 'Connect with a mentor', done: hasConnectedMentor, icon: '🤝', xp: 100 },
    { id: 'cofounder', label: 'Find a co-founder', done: hasCofounder, icon: '👥', xp: 80 },
    { id: 'message', label: 'Send your first message', done: convos.length > 0, icon: '💬', xp: 20 },
  ];
  const xp = milestones.filter(m => m.done).reduce((s, m) => s + m.xp, 0);

  const tog = (k) => setShowMore(p => ({ ...p, [k]: !p[k] }));

  return (
    <>
      <style>{CSS}</style>
      <div className="min-h-screen page-bg dm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">

          {/* ════ HERO ════════════════════════════════════════════════════ */}
          <div className={`rounded-3xl border px-7 py-8 md:px-10 mb-6 relative overflow-hidden f0 ${hasStartupIdea ? 'bg-gradient-to-br from-slate-900 to-indigo-950 text-white border-indigo-900' : 'bg-gradient-to-br from-indigo-50 to-violet-50 border-indigo-100'}`}>
            <div className="absolute -right-12 -top-12 w-64 h-64 rounded-full opacity-10 blur-3xl"
              style={{ background: 'radial-gradient(circle, #818cf8, transparent)' }} />
            <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <span className={`inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full ${hasStartupIdea ? 'bg-white/10 text-white/80' : 'bg-indigo-100 text-indigo-600 border border-indigo-200'}`}>
                    <GraduationCap className="w-3.5 h-3.5" /> Student
                  </span>
                  {unread > 0 && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-white bg-red-500 px-2.5 py-1 rounded-full">
                      <Bell className="w-3 h-3" /> {unread} unread
                    </span>
                  )}
                </div>
                <h1 className={`ss font-black text-3xl md:text-4xl leading-none mb-3 ${hasStartupIdea ? 'text-white' : 'text-slate-900'}`}>
                  {hasStartupIdea ? `Build your startup, ${firstName} 🚀` : `Welcome, ${firstName} 👋`}
                </h1>
                <p className={`text-sm max-w-lg leading-relaxed ${hasStartupIdea ? 'text-white/70' : 'text-slate-500'}`}>
                  {hasStartupIdea
                    ? 'Your mission control. Find the right mentor, co-founder, and investor to bring your idea to life.'
                    : 'Explore mentors, find co-founders, discover startup ideas, and build your network.'
                  }
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <Link to={primaryCTA.to}
                  className={`qa ${primaryCTA.grad} text-white flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm shadow-lg`}>
                  {primaryCTA.icon} {primaryCTA.label}
                </Link>
                <Link to="/find-mentors"
                  className={`qa flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm border-2 ${hasStartupIdea ? 'bg-white/10 border-white/20 text-white hover:bg-white/20' : 'bg-white border-indigo-200 text-indigo-700 hover:bg-indigo-50'}`}>
                  <Users className="w-4 h-4" /> Mentors
                </Link>
                <Link to="/discover"
                  className={`qa flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm border-2 ${hasStartupIdea ? 'bg-white/10 border-white/20 text-white hover:bg-white/20' : 'bg-white border-violet-200 text-violet-700 hover:bg-violet-50'}`}>
                  <Search className="w-4 h-4" /> Discover
                </Link>
              </div>
            </div>
          </div>

          {/* ════ STATS ════════════════════════════════════════════════════ */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 f1">
            {[
              { label: 'Profile', value: `${completion}%`, sub: completion >= 80 ? 'Looking great' : 'Add more info', Icon: Shield, grad: 'from-indigo-500 to-violet-600' },
              { label: 'XP Earned', value: `${xp} XP`, sub: `${milestones.filter(m => m.done).length}/${milestones.length} goals`, Icon: Award, grad: 'from-amber-400 to-orange-500' },
              { label: 'Conversations', value: `${convos.length}`, sub: `${unread} unread`, Icon: MessageSquare, grad: 'from-blue-500 to-indigo-500' },
              { label: 'Opportunities', value: `${OPPORTUNITIES.length}`, sub: 'This month', Icon: Megaphone, grad: 'from-emerald-500 to-teal-500' },
            ].map((s, i) => (
              <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 lift">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.grad} flex items-center justify-center text-white mb-3`}>
                  <s.Icon className="w-5 h-5" />
                </div>
                <p className="ss text-2xl font-black text-slate-900">{s.value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
                <p className="text-xs text-indigo-600 font-semibold mt-1">{s.sub}</p>
              </div>
            ))}
          </div>

          {/* ════ MAIN GRID ═══════════════════════════════════════════════ */}
          <div className="grid lg:grid-cols-3 gap-6">

            {/* ── LEFT + CENTRE (2 cols) ─────────────────────────────── */}
            <div className="lg:col-span-2 space-y-6">

              {/* ── 1. JOURNEY STATUS ─────────────────────────────────── */}
              <Card className="f1">
                <SectionHead title="Your Journey Status" icon={<Target className="w-5 h-5 text-indigo-500" />} />
                <div className="px-6 pb-6 space-y-3">

                  {/* Has startup idea? */}
                  <div className={`journey-item ${ideaAnswered ? 'done' : 'active'}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-base flex-shrink-0 ${ideaAnswered ? 'bg-emerald-100' : 'bg-indigo-100'}`}>
                          {ideaAnswered ? '✓' : '💡'}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 text-sm ss">Startup Idea</p>
                          <p className="text-xs text-slate-500">{hasStartupIdea ? 'You have an idea 🚀' : 'Still exploring'}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button onClick={() => setJourneyField('has_startup_idea', true)}
                          className={`text-xs font-bold px-3 py-1.5 rounded-lg border-2 transition-all ${hasStartupIdea ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-500 hover:border-indigo-200'}`}>
                          Yes
                        </button>
                        <button onClick={() => setJourneyField('has_startup_idea', false)}
                          className={`text-xs font-bold px-3 py-1.5 rounded-lg border-2 transition-all ${!hasStartupIdea && ideaAnswered ? 'border-slate-400 bg-slate-100 text-slate-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                          No
                        </button>
                      </div>
                    </div>
                    {hasStartupIdea && s.startup_idea_description && (
                      <p className="ml-12 mt-2 text-xs text-slate-500 italic leading-relaxed">{s.startup_idea_description}</p>
                    )}
                  </div>

                  {/* Has co-founder? */}
                  <div className={`journey-item ${hasCofounder ? 'done' : hasStartupIdea ? 'active' : 'pending'}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-base flex-shrink-0 ${hasCofounder ? 'bg-emerald-100' : hasStartupIdea ? 'bg-indigo-100' : 'bg-slate-100'}`}>
                          {hasCofounder ? '✓' : '👥'}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 text-sm ss">Co-Founder</p>
                          <p className="text-xs text-slate-500">{hasCofounder ? 'You have a co-founder ✓' : hasStartupIdea ? 'Looking for a co-founder' : 'Complete idea step first'}</p>
                        </div>
                      </div>
                      {hasStartupIdea && (
                        <div className="flex gap-2 flex-shrink-0">
                          <button onClick={() => setJourneyField('has_cofounder', true)}
                            className={`text-xs font-bold px-3 py-1.5 rounded-lg border-2 transition-all ${hasCofounder ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500 hover:border-emerald-200'}`}>
                            Yes
                          </button>
                          <button onClick={() => setJourneyField('has_cofounder', false)}
                            className={`text-xs font-bold px-3 py-1.5 rounded-lg border-2 transition-all ${!hasCofounder ? 'border-slate-400 bg-slate-100 text-slate-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                            No
                          </button>
                        </div>
                      )}
                      {!hasStartupIdea && (
                        <span className="text-xs text-slate-400 font-medium bg-slate-100 px-2.5 py-1 rounded-full">Locked</span>
                      )}
                    </div>
                  </div>

                  {/* Connected with mentor? */}
                  <div className={`journey-item ${hasConnectedMentor ? 'done' : convos.length > 0 ? 'active' : 'pending'}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-base flex-shrink-0 ${hasConnectedMentor ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                          {hasConnectedMentor ? '✓' : '🤝'}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 text-sm ss">Mentor Connection</p>
                          <p className="text-xs text-slate-500">{hasConnectedMentor ? 'Connected with a mentor ✓' : 'No mentor yet — they speed up everything'}</p>
                        </div>
                      </div>
                      {!hasConnectedMentor && (
                        <Link to="/find-mentors"
                          className="text-xs font-bold px-3 py-1.5 g-ind text-white rounded-lg hover:opacity-90 flex items-center gap-1 flex-shrink-0">
                          Find <ArrowRight className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                  </div>

                  {/* Smart next action */}
                  <div className="mt-1 p-4 rounded-2xl bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-100">
                    <div className="flex items-start gap-3">
                      <Zap className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-indigo-700 uppercase tracking-wide mb-0.5">Recommended Next Action</p>
                        <p className="text-sm font-semibold text-slate-800 ss">
                          {!ideaAnswered
                            ? 'Answer the journey questions above to get personalised guidance.'
                            : !hasStartupIdea
                              ? 'Explore ideas and mentors — you don\'t need an idea to start building your network.'
                              : !hasCofounder
                                ? 'You have an idea — now find a co-founder with complementary skills.'
                                : !hasConnectedMentor
                                  ? 'Great team! Now find a mentor to guide your startup journey.'
                                  : 'You\'re on track. Focus on validating your idea with real users.'
                          }
                        </p>
                        <Link to={primaryCTA.to}
                          className="inline-flex items-center gap-1.5 mt-2 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-all">
                          {primaryCTA.label} <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* ── 2. ACTION CARDS ───────────────────────────────────── */}
              <Card className="f2">
                <SectionHead title="Action Cards" icon={<Zap className="w-5 h-5 text-amber-500" />} />
                <div className="px-6 pb-6">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {[
                      {
                        Icon: Users, grad: 'g-ind', label: 'Find a Mentor',
                        desc: 'Get guidance from experienced founders and experts.',
                        cta: 'Browse Mentors', to: '/find-mentors',
                        badge: completion < 60 ? 'Complete profile first' : undefined,
                      },
                      {
                        Icon: Rocket, grad: 'g-vi', label: 'Start a Startup',
                        desc: hasStartupIdea ? 'You have an idea — build it out on your Startup page.' : 'Don\'t have an idea yet? Explore what others are building.',
                        cta: hasStartupIdea ? 'My Startup' : 'Discover Ideas',
                        to: hasStartupIdea ? '/my-startup' : '/discover',
                        highlight: hasStartupIdea,
                      },
                      {
                        Icon: Shield, grad: 'g-em', label: 'Complete Profile',
                        desc: `Your profile is ${completion}% complete. A complete profile gets 3× more connection requests.`,
                        cta: 'Edit Profile', to: '/profile',
                        badge: completion >= 100 ? '100% Complete ✓' : `${100 - completion} pts left`,
                        badgeCls: completion >= 100 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700',
                      },
                    ].map((card, i) => (
                      <div key={i} className={`rounded-2xl p-5 border-2 ${card.highlight ? 'border-violet-200 bg-violet-50' : 'border-slate-100 bg-white'} lift`}>
                        <div className={`w-10 h-10 rounded-xl ${card.grad} flex items-center justify-center text-white mb-3`}>
                          <card.Icon className="w-5 h-5" />
                        </div>
                        {card.badge && (
                          <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mb-2 ${card.badgeCls || 'bg-slate-100 text-slate-600'}`}>{card.badge}</span>
                        )}
                        <h3 className="ss font-bold text-slate-900 text-sm mb-1">{card.label}</h3>
                        <p className="text-xs text-slate-500 leading-relaxed mb-3">{card.desc}</p>
                        <Link to={card.to}
                          className={`inline-flex items-center gap-1.5 text-xs font-bold ${card.highlight ? 'text-violet-700' : 'text-indigo-600'} hover:gap-2.5 transition-all`}>
                          {card.cta} <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>

              {/* ── 3. SUGGESTED MENTORS ──────────────────────────────── */}
              <Card className="f2">
                <SectionHead title="Suggested Mentors" icon={<Users className="w-5 h-5 text-indigo-500" />} linkLabel="Browse All" linkTo="/find-mentors" />
                <div className="px-6 pb-6">
                  <p className="text-xs text-slate-400 mb-4 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    Matched to your skills and interests
                  </p>
                  {connsLoading ? (
                    <div className="space-y-3"><Shimmer h="h-28" /><Shimmer h="h-28" /><Shimmer h="h-24" /></div>
                  ) : mentors.length > 0 ? (
                    <>
                      <div className="space-y-3">
                        {(showMore.mentors ? mentors : mentors.slice(0, 3)).map((m, i) => (
                          <PeopleCard key={m.id || i} item={m}
                            accentClass="bg-indigo-50 text-indigo-700"
                            ctaClass="g-ind" ctaLabel="Request"
                            onConnect={() => logActivity('mentor_request', `Requested mentorship from ${m.name}`)}
                            onMessage={() => { logActivity('message_sent', `Messaged ${m.name}`); navigate('/messages'); }}
                          />
                        ))}
                      </div>
                      {mentors.length > 3 && (
                        <button onClick={() => tog('mentors')}
                          className="w-full mt-3 py-2.5 text-sm font-semibold text-indigo-600 hover:bg-indigo-50 rounded-xl flex items-center justify-center gap-1.5 transition-all">
                          {showMore.mentors ? <><ChevronUp className="w-4 h-4" />Show less</> : <><ChevronDown className="w-4 h-4" />See {mentors.length - 3} more</>}
                        </button>
                      )}
                    </>
                  ) : (
                    <div className="py-8 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                      <p className="text-slate-400 text-sm mb-3">No mentors found yet.</p>
                      <Link to="/find-mentors" className="inline-flex items-center gap-1.5 g-ind text-white text-xs font-bold px-4 py-2 rounded-xl">Browse Mentors</Link>
                    </div>
                  )}
                </div>
              </Card>

              {/* ── 4. SUGGESTED CO-FOUNDERS ──────────────────────────── */}
              <Card className="f3">
                <SectionHead title="Suggested Co-Founders" icon={<UserPlus className="w-5 h-5 text-violet-500" />} linkLabel="Browse All" linkTo="/find-cofounders" />
                <div className="px-6 pb-6">
                  <p className="text-xs text-slate-400 mb-4 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                    Students actively looking to build together
                  </p>
                  {connsLoading ? (
                    <div className="space-y-3"><Shimmer h="h-24" /><Shimmer h="h-24" /></div>
                  ) : coFounders.length > 0 ? (
                    <>
                      <div className="space-y-3">
                        {(showMore.cf ? coFounders : coFounders.slice(0, 3)).map((cf, i) => (
                          <PeopleCard key={cf.id || i} item={cf}
                            accentClass="bg-violet-50 text-violet-700"
                            ctaClass="g-vi" ctaLabel="Connect"
                            onConnect={() => logActivity('cofounder_connect', `Connected with ${cf.name}`)}
                            onMessage={() => { logActivity('message_sent', `Messaged ${cf.name}`); navigate('/messages'); }}
                          />
                        ))}
                      </div>
                      {coFounders.length > 3 && (
                        <button onClick={() => tog('cf')}
                          className="w-full mt-3 py-2.5 text-sm font-semibold text-violet-600 hover:bg-violet-50 rounded-xl flex items-center justify-center gap-1.5 transition-all">
                          {showMore.cf ? <><ChevronUp className="w-4 h-4" />Show less</> : <><ChevronDown className="w-4 h-4" />See {coFounders.length - 3} more</>}
                        </button>
                      )}
                    </>
                  ) : (
                    <div className="py-8 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                      <p className="text-slate-400 text-sm mb-3">No co-founders found yet.</p>
                      <Link to="/find-cofounders" className="inline-flex items-center gap-1.5 g-vi text-white text-xs font-bold px-4 py-2 rounded-xl">Browse Co-Founders</Link>
                    </div>
                  )}
                </div>
              </Card>

              {/* ── 5. RECENT ACTIVITY (messages + requests) ─────────── */}
              <Card className="f3">
                <SectionHead title="Recent Activity" icon={<Activity className="w-5 h-5 text-blue-500" />} linkLabel="Open Messages" linkTo="/messages" />
                <div className="px-6 pb-6">
                  {/* Recent conversations */}
                  {convos.length > 0 ? (
                    <div className="space-y-2 mb-4">
                      {convos.slice(0, 4).map(c => {
                        const other = c.otherUser || {};
                        return (
                          <Link key={c.id} to="/messages"
                            className={`flex items-start gap-3 p-3.5 rounded-2xl transition-all hover:bg-slate-50 ${c.unreadCount > 0 ? 'border-l-4 border-indigo-500 bg-indigo-50/50' : ''}`}>
                            <div className="relative flex-shrink-0">
                              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${roleGrad(other.user_type)} flex items-center justify-center text-white text-xs font-bold ss`}>
                                {initials(other.full_name)}
                              </div>
                              {c.unreadCount > 0 && <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-indigo-500 rounded-full border-2 border-white unread-dot" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-0.5">
                                <p className="font-semibold text-slate-900 text-sm ss">{other.full_name || 'Unknown'}</p>
                                <span className="text-xs text-slate-400">{timeAgo(c.last_message_at)}</span>
                              </div>
                              <p className={`text-xs truncate ${c.unreadCount > 0 ? 'text-slate-700 font-medium' : 'text-slate-400'}`}>
                                {c.lastMessage?.content || 'Start a conversation'}
                              </p>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-6 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 mb-4">
                      <p className="text-slate-400 text-sm">No messages yet.</p>
                      <p className="text-xs text-slate-400 mt-1">Request a mentor to start your first conversation.</p>
                    </div>
                  )}

                  {/* Activity log */}
                  {activities.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Recent Actions</p>
                      {activities.slice(0, 4).map((act, i) => (
                        <div key={i} className="flex items-center gap-2.5 py-1.5">
                          <div className="w-6 h-6 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0"><Activity className="w-3.5 h-3.5 text-indigo-500" /></div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-slate-700 truncate">{act.description}</p>
                          </div>
                          <span className="text-xs text-slate-400 flex-shrink-0">{timeAgo(act.created_at)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <Link to="/messages"
                    className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 border-2 border-indigo-100 text-indigo-600 rounded-xl text-sm font-semibold hover:bg-indigo-50 transition-all">
                    <Send className="w-4 h-4" /> Open Messages
                  </Link>
                </div>
              </Card>

              {/* ── 6. OPPORTUNITIES ──────────────────────────────────── */}
              <Card className="f4">
                <SectionHead title="Opportunities" icon={<Megaphone className="w-5 h-5 text-amber-500" />} linkLabel="See All" linkTo="/discover" />
                <div className="px-6 pb-6">
                  <p className="text-xs text-slate-400 mb-4">Accelerators · Grants · Events — curated for student founders</p>
                  <div className="space-y-3">
                    {(showMore.opps ? OPPORTUNITIES : OPPORTUNITIES.slice(0, 2)).map(opp => (
                      <div key={opp.id} className="flex items-start gap-4 p-4 rounded-2xl border border-slate-100 hover:border-indigo-100 hover:shadow-sm transition-all cursor-pointer">
                        <div className={`w-11 h-11 rounded-xl ${opp.grad} flex items-center justify-center text-white flex-shrink-0`}><opp.Icon className="w-5 h-5" /></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <p className="font-semibold text-slate-900 text-sm ss leading-snug">{opp.name}</p>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${opp.tagCls}`}>{opp.tag}</span>
                          </div>
                          <p className="text-xs text-slate-500 mb-2">{opp.desc}</p>
                          <div className="flex gap-3 text-xs">
                            <span className="text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3" />Deadline: {opp.deadline}</span>
                            <span className="text-emerald-600 font-semibold flex items-center gap-1"><DollarSign className="w-3 h-3" />{opp.funding}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {OPPORTUNITIES.length > 2 && (
                    <button onClick={() => tog('opps')}
                      className="w-full mt-3 py-2.5 text-sm font-semibold text-amber-600 hover:bg-amber-50 rounded-xl flex items-center justify-center gap-1.5 transition-all">
                      {showMore.opps ? <><ChevronUp className="w-4 h-4" />Show less</> : <><ChevronDown className="w-4 h-4" />See {OPPORTUNITIES.length - 2} more</>}
                    </button>
                  )}
                </div>
              </Card>
            </div>

            {/* ── RIGHT SIDEBAR ─────────────────────────────────────────── */}
            <div className="space-y-5">

              {/* Profile card */}
              <div className="g-dk rounded-2xl p-6 text-white relative overflow-hidden f0 lift">
                <div className="absolute -right-6 -bottom-6 w-28 h-28 bg-white/10 rounded-full" />
                <div className="relative">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="ss font-bold text-lg">My Profile</h3>
                    <Shield className="w-5 h-5 text-slate-400" />
                  </div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center font-bold text-lg ss overflow-hidden flex-shrink-0">
                      {p.avatar_url ? <img src={p.avatar_url} alt="" className="w-full h-full object-cover" /> : init}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold truncate ss">{p.full_name || 'Complete your profile'}</p>
                      <p className="text-slate-400 text-xs flex items-center gap-1 mt-0.5">
                        <GraduationCap className="w-3 h-3" />{s.university || 'Student'}
                      </p>
                      {p.location && <p className="text-slate-400 text-xs flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" />{p.location}</p>}
                    </div>
                  </div>
                  <div className="flex justify-between text-sm mb-1.5">
                    <span className="text-slate-400">Profile Complete</span>
                    <span className="font-bold">{completion}%</span>
                  </div>
                  <div className="h-2 bg-white/20 rounded-full overflow-hidden mb-4">
                    <div className="h-full bg-white rounded-full transition-all duration-700" style={{ width: `${completion}%` }} />
                  </div>
                  <Link to="/profile"
                    className="flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 text-white text-sm font-semibold py-2.5 rounded-xl transition-all">
                    <Edit3 className="w-4 h-4" /> Edit Profile
                  </Link>
                </div>
              </div>

              {/* XP Growth tracker */}
              <Card className="f1">
                <div className="px-6 pt-5 pb-2">
                  <div className="flex items-center justify-between">
                    <h3 className="ss font-bold text-slate-900 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-violet-500" />Growth</h3>
                    <span className="text-xs text-slate-400">{xp >= 200 ? 'Max!' : `${200 - xp} XP to next`}</span>
                  </div>
                </div>
                <div className="px-6 pb-5">
                  <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-100 rounded-xl mb-4">
                    <div className="w-10 h-10 rounded-xl g-am flex items-center justify-center text-white flex-shrink-0"><Award className="w-5 h-5" /></div>
                    <div>
                      <p className="ss font-black text-amber-800 text-2xl leading-none">{xp} XP</p>
                      <p className="text-xs text-amber-600 mt-0.5">{milestones.filter(m => m.done).length}/{milestones.length} goals complete</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {milestones.map((m) => (
                      <div key={m.id} className={`flex items-center gap-2.5 p-2.5 rounded-xl ${m.done ? 'bg-emerald-50' : 'bg-slate-50'}`}>
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${m.done ? 'bg-emerald-100' : 'bg-slate-200'}`}>
                          {m.done ? '✓' : m.icon}
                        </span>
                        <p className={`text-xs font-medium flex-1 ${m.done ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{m.label}</p>
                        {m.done && <span className="text-xs text-emerald-600 font-bold">+{m.xp}XP</span>}
                      </div>
                    ))}
                  </div>
                </div>
              </Card>

              {/* Quick actions */}
              <Card className="f2">
                <div className="px-6 pt-5 pb-2"><h3 className="ss font-bold text-slate-900">Quick Actions</h3></div>
                <div className="px-6 pb-5 space-y-0.5">
                  {[
                    { Icon: Users, label: 'Find Mentors', to: '/find-mentors', col: 'text-indigo-600' },
                    { Icon: UserPlus, label: 'Find Co-Founder', to: '/find-cofounders', col: 'text-violet-600' },
                    { Icon: Inbox, label: 'Requests', to: '/connection-requests', col: 'text-violet-600', badge: incomingRequests.length > 0 ? incomingRequests.length : null },
                    { Icon: Search, label: 'Discover', to: '/discover', col: 'text-amber-600' },
                    { Icon: Search, label: 'Discover', to: '/discover', col: 'text-amber-600' },
                    { Icon: MessageSquare, label: 'Messages', to: '/messages', col: 'text-blue-600' },
                    { Icon: Edit3, label: 'Edit Profile', to: '/profile', col: 'text-slate-500' },
                  ].map(({ Icon, label, to, col }, i) => (
                    <Link key={i} to={to}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-all group">
                      <Icon className={`w-4 h-4 ${col}`} />
                      <span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 flex-1">{label}</span>
                      <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500" />
                    </Link>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}