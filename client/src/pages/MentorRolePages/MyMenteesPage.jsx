// src/pages/MentorRolePages/MyMenteesPage.jsx
// Source: connection_requests WHERE receiver_id=mentor AND status=accepted AND type IN (mentor_request, mentor)
// Enriched with founder_profiles + student_profiles data

import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import {
  fetchMentees, getOrCreateConversation,
} from '../../services/mentorService';
import {
  Users, MessageSquare, Rocket, GraduationCap, MapPin,
  Loader, RefreshCw, AlertTriangle, Search, Clock,
  ChevronRight, ArrowRight, UserCheck, BookOpen, Lightbulb,
} from 'lucide-react';

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800;900&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap');
  .ss{font-family:'Syne',sans-serif}.dm{font-family:'DM Sans',sans-serif}
  .lift{transition:transform .22s cubic-bezier(.22,.68,0,1.2),box-shadow .22s ease}
  .lift:hover{transform:translateY(-3px);box-shadow:0 16px 44px rgba(27,45,127,.12)}
  .g-brand,.g-ment{background:linear-gradient(135deg,#98DE38,#7EC42E)}
  .g-sec{background:linear-gradient(135deg,#1B2D7F,#2A3F8F)}
  .page-bg{background-color:#F9FAFB;background-image:radial-gradient(circle,rgba(152,222,56,.08) 1px,transparent 1px);background-size:28px 28px}
  .f0{animation:fu .35s ease both}.f1{animation:fu .35s .07s ease both}
  .f2{animation:fu .35s .14s ease both}
  @keyframes fu{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
  .slide{animation:si .28s cubic-bezier(.32,.72,0,1) both}
  @keyframes si{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:none}}
  .shimmer{background:linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%);background-size:200% 100%;animation:sh 1.4s infinite;border-radius:12px}
  @keyframes sh{0%{background-position:200% 0}100%{background-position:-200% 0}}
  .inp{width:100%;padding:10px 14px;border:1.5px solid #e2e8f0;border-radius:12px;font-size:13px;outline:none;font-family:'DM Sans',sans-serif;transition:border-color .14s;background:#fff}
  .inp:focus{border-color:#98DE38}
  .mentor-brand .text-emerald-300,.mentor-brand .text-emerald-500,.mentor-brand .text-emerald-600,.mentor-brand .text-emerald-700{color:#1B2D7F!important}
  .mentor-brand .bg-emerald-50,.mentor-brand .bg-emerald-100{background-color:rgba(152,222,56,.14)!important}
  .mentor-brand .border-emerald-100{border-color:rgba(152,222,56,.35)!important}
`;

function initials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}
function timeAgo(iso) {
  if (!iso) return '';
  const s = (Date.now() - new Date(iso)) / 1000;
  if (s < 86400)  return 'today';
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  if (s < 2592000)return `${Math.floor(s / 604800)}w ago`;
  return `${Math.floor(s / 2592000)}mo ago`;
}
function gradFor(id) {
  const g = ['from-emerald-500 to-teal-500','from-indigo-500 to-violet-500',
             'from-amber-500 to-orange-500','from-rose-500 to-pink-500',
             'from-blue-500 to-cyan-500','from-violet-500 to-purple-500'];
  return g[((id || '').charCodeAt?.(0) || 0) % g.length];
}

// ── Mentee card ───────────────────────────────────────────────────────────
function MenteeCard({ mentee, onMessage }) {
  const u       = mentee.user || {};
  const fd      = mentee.founderData;
  const sd      = mentee.studentData;
  const isFound = u.user_type === 'early-stage-founder';
  const startup = fd?.company_name || fd?.idea_title
    || (sd?.startup_idea_description ? sd.startup_idea_description.slice(0, 60) + '…' : null);
  const stage   = fd?.startup_stage || fd?.company_stage || null;
  const problem = fd?.problem_solving || null;
  const since   = timeAgo(mentee.since);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm lift">
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${gradFor(u.id)} flex items-center justify-center text-white font-bold ss flex-shrink-0`}>
            {initials(u.full_name)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-slate-900 ss text-base leading-tight">{u.full_name || 'Unknown'}</p>
            <p className={`text-xs font-bold mt-0.5 ${isFound ? 'text-amber-600' : 'text-indigo-600'}`}>
              {isFound ? '🚀 Founder' : '🎓 Student'}
            </p>
            {u.location && (
              <p className="text-xs text-slate-400 flex items-center gap-0.5 mt-0.5">
                <MapPin className="w-3 h-3" />{u.location}
              </p>
            )}
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-xs text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3" /> Since {since}
            </p>
          </div>
        </div>

        {/* Startup / Idea */}
        {startup ? (
          <div className={`p-3.5 rounded-xl mb-3 border ${isFound ? 'bg-amber-50 border-amber-100' : 'bg-indigo-50 border-indigo-100'}`}>
            <p className={`text-xs font-bold uppercase mb-0.5 ${isFound ? 'text-amber-600' : 'text-indigo-500'}`}>
              {isFound ? '🏢 Startup' : '💡 Idea'}
            </p>
            <p className={`text-sm font-bold ss ${isFound ? 'text-amber-900' : 'text-indigo-900'}`}>{startup}</p>
            {stage && <span className={`text-xs font-medium px-2 py-0.5 rounded-full mt-1 inline-block ${isFound ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'}`}>{stage}</span>}
            {problem && <p className="text-xs text-slate-600 mt-1.5 line-clamp-2">{problem}</p>}
          </div>
        ) : (
          <div className="p-3 bg-slate-50 rounded-xl mb-3 border border-slate-100">
            <p className="text-xs text-slate-400 italic">No startup info added yet.</p>
          </div>
        )}

        {/* Bio snippet */}
        {u.bio && (
          <p className="text-xs text-slate-500 leading-relaxed mb-3 line-clamp-2">{u.bio}</p>
        )}

        {/* CTA */}
        <button onClick={onMessage}
          className="w-full flex items-center justify-center gap-2 py-2.5 g-ment text-[#1B2D7F] text-sm font-bold rounded-xl hover:opacity-90 transition-all">
          <MessageSquare className="w-4 h-4" /> Message {u.full_name?.split(' ')[0] || ''}
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
export default function MyMenteesPage() {
  const { user }  = useAuth();
  const navigate  = useNavigate();

  const [mentees,  setMentees]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [search,   setSearch]   = useState('');

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true); setError('');
    try {
      const data = await fetchMentees(user.id);
      setMentees(data);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const handleMessage = async (targetId) => {
    try {
      const convId = await getOrCreateConversation(user.id, targetId);
      navigate(convId ? `/mentor/messages?conv=${convId}` : '/mentor/messages');
    } catch (e) { console.error(e); }
  };

  const shown = mentees.filter(m => {
    if (!search) return true;
    const q = search.toLowerCase();
    const u = m.user || {};
    return [u.full_name, u.location, m.founderData?.company_name,
            m.founderData?.idea_title, m.studentData?.startup_idea_description]
      .filter(Boolean).join(' ').toLowerCase().includes(q);
  });

  // Stats
  const founders = shown.filter(m => m.user?.user_type === 'early-stage-founder').length;
  const students = shown.filter(m => m.user?.user_type === 'student').length;

  return (
    <>
      <style>{CSS}</style>
      <div className="min-h-screen page-bg pt-20 pb-16 px-4 dm mentor-brand">
        <div className="max-w-6xl mx-auto">

          {/* Header */}
          <div className="mb-8 f0">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold uppercase px-3 py-1 rounded-full bg-green-50 text-green-700 border border-green-200 mb-3">
              <UserCheck className="w-3.5 h-3.5" /> My Mentees
            </div>
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
              <div>
                <h1 className="text-3xl sm:text-4xl font-black text-gray-900 mb-2">Active Guidance</h1>
                <p className="text-gray-500 text-sm max-w-xl">Students and founders connected with you for mentorship and startup guidance.</p>
              </div>
              <Link to="/mentor/find-founders" className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-bold text-gray-700 hover:bg-gray-50">
                Find Founders <ArrowRight className="w-4" />
              </Link>
            </div>
          </div>

          {/* Stats */}
          {!loading && mentees.length > 0 && (
            <div className="grid sm:grid-cols-3 gap-3 mb-6 f1">
              {[
                { label: 'Total',     val: mentees.length, col: 'text-emerald-600', bg: 'bg-emerald-50 border-emerald-100' },
                { label: 'Founders',  val: founders,       col: 'text-amber-600',   bg: 'bg-amber-50 border-amber-100'   },
                { label: 'Students',  val: students,       col: 'text-indigo-600',  bg: 'bg-indigo-50 border-indigo-100' },
              ].map((s, i) => (
                <div key={i} className="bg-white rounded-2xl p-4 border border-gray-100">
                  <p className="text-xs text-gray-500">{s.label}</p>
                  <p className="text-2xl font-black text-gray-900">{s.val}</p>
                </div>
              ))}
            </div>
          )}

          {/* Search */}
          <div className="flex items-center gap-3 mb-6 f2">
            <div className="flex-1 relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input className="inp pl-10" placeholder="Search mentees by name, startup, or location…"
                value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <button onClick={load} className="p-2.5 bg-white border border-[#98DE38]/30 rounded-xl text-slate-500 hover:text-[#1B2D7F] hover:border-[#98DE38] transition-all">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl px-5 py-4 mb-6">
              <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
              <p className="text-sm text-red-700 flex-1">{error}</p>
              <button onClick={load}><RefreshCw className="w-4 h-4 text-red-400" /></button>
            </div>
          )}

          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3">
                  <div className="flex gap-3"><div className="shimmer w-12 h-12 rounded-2xl flex-shrink-0" /><div className="flex-1 space-y-2"><div className="shimmer h-4 w-32" /><div className="shimmer h-3 w-20" /></div></div>
                  <div className="shimmer h-16 w-full" />
                  <div className="shimmer h-10 w-full" />
                </div>
              ))}
            </div>
          ) : mentees.length === 0 ? (
            <div className="py-24 text-center">
              <div className="w-20 h-20 bg-emerald-50 rounded-3xl flex items-center justify-center mx-auto mb-5">
                <Users className="w-10 h-10 text-emerald-300" />
              </div>
              <h3 className="ss font-bold text-slate-900 text-2xl mb-2 empty">No active guidance yet</h3>
              <p className="text-slate-500 mb-6 max-w-sm mx-auto">
                Accept incoming mentorship requests from your dashboard, or reach out directly to founders and students.
              </p>
              <div className="flex flex-wrap gap-3 justify-center">
                <Link to="/mentor/dashboard" className="g-ment text-[#1B2D7F] font-bold text-sm px-5 py-2.5 rounded-xl hover:opacity-90 transition-all flex items-center gap-2">
                  <BookOpen className="w-4 h-4" /> Go to Dashboard
                </Link>
                <Link to="/mentor/find-founders" className="bg-white text-slate-700 border-2 border-slate-200 font-bold text-sm px-5 py-2.5 rounded-xl hover:border-[#98DE38]/40 transition-all flex items-center gap-2">
                  <Search className="w-4 h-4" /> Find Founders
                </Link>
              </div>
            </div>
          ) : shown.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-slate-400 text-sm">No mentees match "{search}".</p>
              <button onClick={() => setSearch('')} className="mt-2 text-sm font-semibold text-emerald-600 hover:underline">Clear search</button>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {shown.map((m, i) => (
                <div key={m.requestId || i} className="slide" style={{ animationDelay: `${Math.min(i, 8) * 0.06}s` }}>
                  <MenteeCard mentee={m} onMessage={() => handleMessage(m.user?.id)} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
