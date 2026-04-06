// src/pages/FounderRolePages/FindTeamPage.jsx
// Source: student_profiles WHERE looking_for contains 'Co-Founder' OR 'Startup'
// Founder invites a student to their team → creates connection_request (type: 'team_invite')

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import {
  fetchTeamCandidates,
  sendConnectionRequest,
  getOrCreateConversation,
} from '../../services/founderService';
import {
  Search, Users, MessageSquare, UserPlus, CheckCircle,
  MapPin, Briefcase, Clock, ChevronRight, Filter,
  Loader, AlertTriangle, RefreshCw, Sparkles, X,
  Rocket, Zap, Code, BarChart2, Palette, Brain,
  Send,
} from 'lucide-react';

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800;900&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap');
  .ss{font-family:'Syne',sans-serif}.dm{font-family:'DM Sans',sans-serif}
  .lift{transition:transform .22s cubic-bezier(.22,.68,0,1.2),box-shadow .22s ease}
  .lift:hover{transform:translateY(-3px);box-shadow:0 16px 44px rgba(245,158,11,.10)}
  .g-found{background:linear-gradient(135deg,#f59e0b,#ef4444)}
  .g-vi{background:linear-gradient(135deg,#7c3aed,#6366f1)}
  .page-bg{background-color:#fffbeb;background-image:radial-gradient(circle,#fcd34d 1px,transparent 1px);background-size:28px 28px}
  .chip{display:inline-flex;align-items:center;padding:3px 10px;border-radius:999px;font-size:11px;font-weight:600;cursor:pointer;border:1.5px solid #e2e8f0;background:#fff;color:#64748b;transition:all .14s}
  .chip:hover{border-color:#fcd34d;color:#92400e}
  .chip.on{background:#fef9c3;border-color:#fcd34d;color:#92400e}
  .filter-panel{border-bottom:1px solid #f3f4f6;padding-bottom:16px;margin-bottom:16px}
  .filter-panel:last-child{border-bottom:none;padding-bottom:0;margin-bottom:0}
  .slide-in{animation:si .28s cubic-bezier(.32,.72,0,1) both}
  @keyframes si{from{opacity:0;transform:translateX(24px)}to{opacity:1;transform:none}}
  .f0{animation:fu .32s ease both}.f1{animation:fu .32s .06s ease both}
  .f2{animation:fu .32s .12s ease both}.f3{animation:fu .32s .18s ease both}
  @keyframes fu{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
  .shimmer{background:linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%);background-size:200% 100%;animation:sh 1.4s infinite;border-radius:12px}
  @keyframes sh{0%{background-position:200% 0}100%{background-position:-200% 0}}
  .modal-pop{animation:mp .22s cubic-bezier(.34,1.4,.64,1) both}
  @keyframes mp{from{opacity:0;transform:scale(.95)}to{opacity:1;transform:scale(1)}}
  .inp{width:100%;padding:10px 14px;border:1.5px solid #e2e8f0;border-radius:12px;font-size:13px;outline:none;font-family:'DM Sans',sans-serif;transition:border-color .14s;background:#fff}
  .inp:focus{border-color:#f59e0b}
  .lf-badge{display:inline-flex;align-items:center;gap:3px;padding:3px 9px;border-radius:999px;font-size:11px;font-weight:600}
`;

const ROLE_FILTERS = [
  { val: 'Co-Founder', icon: <Rocket className="w-3 h-3" />,    col: 'from-amber-500 to-orange-500'  },
  { val: 'Startup',    icon: <Zap className="w-3 h-3" />,       col: 'from-indigo-500 to-violet-500' },
  { val: 'Developer',  icon: <Code className="w-3 h-3" />,      col: 'from-blue-500 to-indigo-500'   },
  { val: 'Marketer',   icon: <BarChart2 className="w-3 h-3" />, col: 'from-green-500 to-emerald-500' },
  { val: 'Designer',   icon: <Palette className="w-3 h-3" />,   col: 'from-rose-500 to-pink-500'     },
];
const COMMITMENT_FILTERS = ['Full-time','Part-time','Flexible'];
const SKILL_SUGGESTIONS  = ['Python','React','Node.js','Marketing','Design','Data Science','Sales','Finance','Content'];

function initials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}
function gradFor(uid) {
  const g = ['from-amber-500 to-orange-500','from-violet-500 to-indigo-500',
             'from-emerald-500 to-teal-500','from-rose-500 to-pink-500',
             'from-blue-500 to-indigo-500','from-cyan-500 to-teal-500'];
  return g[((uid || '').charCodeAt?.(0) || 0) % g.length];
}
function lfBadge(val) {
  const map = {
    'Co-Founder': 'bg-amber-50 text-amber-700 border border-amber-200',
    'Startup':    'bg-indigo-50 text-indigo-700 border border-indigo-200',
  };
  return map[val] || 'bg-slate-50 text-slate-600 border border-slate-200';
}

// ── Candidate Card ────────────────────────────────────────────────────────
function CandidateCard({ candidate, onInvite, onMessage, inviteState, isTop }) {
  const skills = candidate.skills || [];
  const lf     = candidate.looking_for || [];
  return (
    <div className={`bg-white rounded-2xl border shadow-sm lift transition-all ${isTop ? 'border-amber-200 bg-gradient-to-br from-white to-amber-50/40' : 'border-slate-100'}`}>
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradFor(candidate.user_id)} flex items-center justify-center text-white font-bold text-sm ss flex-shrink-0`}>
            {initials(candidate.name)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-slate-900 ss leading-tight">{candidate.name || 'Unnamed'}</p>
            {candidate.commitment && (
              <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                <Clock className="w-3 h-3" />{candidate.commitment}
              </p>
            )}
            {candidate.location && (
              <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3" />{candidate.location}
              </p>
            )}
          </div>
          {candidate.has_idea && (
            <span className="text-xs bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 py-0.5 rounded-full font-semibold flex-shrink-0">
              Has idea
            </span>
          )}
        </div>

        {/* Bio */}
        {candidate.bio && (
          <p className="text-xs text-slate-600 leading-relaxed mb-3 line-clamp-2">{candidate.bio}</p>
        )}

        {/* Looking For badges */}
        {lf.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {lf.map((v, i) => (
              <span key={i} className={`lf-badge ${lfBadge(v)}`}>{v}</span>
            ))}
          </div>
        )}

        {/* Skills */}
        {skills.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {skills.slice(0, 4).map((s, i) => (
              <span key={i} className="text-xs bg-stone-100 text-stone-700 px-2 py-0.5 rounded-lg font-medium">{s}</span>
            ))}
            {skills.length > 4 && (
              <span className="text-xs text-slate-400">+{skills.length - 4}</span>
            )}
          </div>
        )}

        {/* Interests */}
        {(candidate.interests || []).length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {candidate.interests.slice(0, 3).map((t, i) => (
              <span key={i} className="text-xs bg-violet-50 text-violet-700 px-2 py-0.5 rounded-full font-medium">{t}</span>
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="flex gap-2">
          <button onClick={onMessage}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 border-2 border-slate-200 text-slate-600 hover:border-amber-200 hover:text-amber-600 rounded-xl text-xs font-bold transition-all">
            <MessageSquare className="w-3.5 h-3.5" /> Message
          </button>
          <button onClick={onInvite} disabled={inviteState === 'sent' || inviteState === 'sending'}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              inviteState === 'sent'    ? 'bg-emerald-50 text-emerald-600 border-2 border-emerald-200' :
              inviteState === 'sending' ? 'g-found text-white opacity-70 cursor-wait' :
              'g-found text-white hover:opacity-90'
            }`}>
            {inviteState === 'sent'    ? <><CheckCircle className="w-3.5 h-3.5" />Invited</> :
             inviteState === 'sending' ? <Loader className="w-3.5 h-3.5 animate-spin" /> :
             <><UserPlus className="w-3.5 h-3.5" />Invite to Team</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
export default function FindTeamPage() {
  const { user }  = useAuth();
  const navigate  = useNavigate();

  const [candidates, setCandidates] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [search,     setSearch]     = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [commFilter, setCommFilter] = useState('');
  const [skillFilter,setSkillFilter]= useState('');
  const [invStates,  setInvStates]  = useState({});
  const [msgModal,   setMsgModal]   = useState(null); // candidate
  const [msgText,    setMsgText]    = useState('');
  const [sending,    setSending]    = useState(false);
  const [showFilters,setShowFilters]= useState(false);

  const load = useCallback(async (role = roleFilter) => {
    setLoading(true); setError('');
    try {
      const data = await fetchTeamCandidates({ role, limit: 30 });
      setCandidates(data);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [roleFilter]);

  useEffect(() => { load(); }, [load]);

  const handleInvite = async (candidate) => {
    if (invStates[candidate.user_id]) return;
    setInvStates(p => ({ ...p, [candidate.user_id]: 'sending' }));
    try {
      await sendConnectionRequest(user.id, candidate.user_id, 'team_invite');
      setInvStates(p => ({ ...p, [candidate.user_id]: 'sent' }));
    } catch (e) {
      if (!e.message?.includes('23505')) alert(e.message);
      else setInvStates(p => ({ ...p, [candidate.user_id]: 'sent' }));
    }
  };

  const handleMessage = (candidate) => {
    setMsgModal(candidate);
    setMsgText(`Hi ${candidate.name?.split(' ')[0] || 'there'}, I'm building a startup and think your skills could be a great fit. Would you be open to a quick chat?`);
  };

  const handleSendMessage = async () => {
    if (!msgModal || !msgText.trim() || sending) return;
    setSending(true);
    try {
      await sendConnectionRequest(user.id, msgModal.user_id, 'team_invite', msgText.trim());
      setInvStates(p => ({ ...p, [msgModal.user_id]: 'sent' }));
      setMsgModal(null); setMsgText('');
      navigate('/messages');
    } catch (e) {
      if (!e.message?.includes('23505')) alert(e.message);
      else { setMsgModal(null); navigate('/messages'); }
    } finally { setSending(false); }
  };

  // Filter in-memory
  const shown = candidates.filter(c => {
    if (search) {
      const q = search.toLowerCase();
      if (!(c.name || '').toLowerCase().includes(q) &&
          !(c.bio  || '').toLowerCase().includes(q) &&
          !(c.skills || []).some(s => s.toLowerCase().includes(q))) return false;
    }
    if (commFilter && c.commitment !== commFilter) return false;
    if (skillFilter) {
      if (!(c.skills || []).some(s => s.toLowerCase().includes(skillFilter.toLowerCase()))) return false;
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
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-amber-700 bg-amber-100 px-3 py-1.5 rounded-full mb-3">
              <UserPlus className="w-3.5 h-3.5" /> Find Team
            </div>
            <h1 className="ss font-black text-4xl text-slate-900 mb-2">Find Your Team</h1>
            <p className="text-slate-600 text-lg max-w-xl">
              Students actively looking to join a startup or co-found one.
              Filter by role, skills, and availability.
            </p>
          </div>

          <div className="grid lg:grid-cols-4 gap-6">

            {/* Filter sidebar */}
            <aside className="lg:col-span-1 f1">
              {/* Mobile toggle */}
              <button onClick={() => setShowFilters(!showFilters)}
                className="lg:hidden w-full flex items-center justify-between p-3.5 bg-white rounded-xl border border-amber-100 mb-3 shadow-sm font-semibold text-sm text-slate-700">
                <span className="flex items-center gap-2"><Filter className="w-4 h-4 text-amber-500" />Filters</span>
                <ChevronRight className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-90' : ''}`} />
              </button>

              <div className={`bg-white rounded-2xl border border-amber-100/60 shadow-sm p-5 space-y-0 ${showFilters ? 'block' : 'hidden lg:block'}`}>
                {/* Role */}
                <div className="filter-panel">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Looking For Role</p>
                  <div className="space-y-1.5">
                    {[{val:'',label:'All Candidates'},...ROLE_FILTERS.map(r=>({val:r.val,label:r.val}))].map(({ val, label }) => (
                      <button key={val} onClick={() => { setRoleFilter(val); load(val); }}
                        className={`w-full text-left text-sm py-2 px-3 rounded-xl transition-all font-medium ${
                          roleFilter === val
                            ? 'bg-amber-50 text-amber-700 border border-amber-200 font-bold'
                            : 'text-slate-600 hover:bg-stone-50'
                        }`}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Commitment */}
                <div className="filter-panel">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Availability</p>
                  <div className="flex flex-wrap gap-1.5">
                    {['', ...COMMITMENT_FILTERS].map(c => (
                      <button key={c} onClick={() => setCommFilter(c)}
                        className={`chip ${commFilter === c ? 'on' : ''}`}>
                        {c || 'Any'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Skills */}
                <div className="filter-panel">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Skills</p>
                  <div className="flex flex-wrap gap-1.5">
                    {['', ...SKILL_SUGGESTIONS].map(s => (
                      <button key={s} onClick={() => setSkillFilter(s === skillFilter ? '' : s)}
                        className={`chip ${skillFilter === s && s ? 'on' : ''}`}>
                        {s || 'Any'}
                      </button>
                    ))}
                  </div>
                </div>

                {(roleFilter || commFilter || skillFilter) && (
                  <button onClick={() => { setRoleFilter(''); setCommFilter(''); setSkillFilter(''); load(''); }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-semibold text-rose-500 hover:bg-red-50 rounded-xl transition-all">
                    <X className="w-3.5 h-3.5" /> Clear Filters
                  </button>
                )}
              </div>
            </aside>

            {/* Main content */}
            <div className="lg:col-span-3 f2">
              {/* Search + count */}
              <div className="flex items-center gap-3 mb-5">
                <div className="flex-1 relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input className="inp pl-10" placeholder="Search by name, skill, or keyword…"
                    value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <button onClick={() => load(roleFilter)}
                  className="p-2.5 bg-white border border-amber-100 rounded-xl text-slate-500 hover:text-amber-600 hover:border-amber-200 transition-all">
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {/* Count */}
              {!loading && (
                <p className="text-sm text-slate-500 mb-4 flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-500" />
                  <span className="font-semibold text-slate-700">{shown.length}</span> candidates
                  {(roleFilter || commFilter || skillFilter || search) && ' matching filters'}
                </p>
              )}

              {error && (
                <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl px-5 py-4 mb-5">
                  <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-700 flex-1">{error}</p>
                  <button onClick={() => load(roleFilter)} className="text-red-500 hover:text-red-700">
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              )}

              {loading ? (
                <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3">
                      <div className="flex gap-3"><div className="shimmer w-11 h-11 flex-shrink-0" /><div className="flex-1 space-y-2"><div className="shimmer h-4 w-28" /><div className="shimmer h-3 w-20" /></div></div>
                      <div className="shimmer h-3 w-full" />
                      <div className="shimmer h-3 w-4/5" />
                      <div className="flex gap-2"><div className="shimmer h-8 flex-1" /><div className="shimmer h-8 flex-1" /></div>
                    </div>
                  ))}
                </div>
              ) : shown.length === 0 ? (
                <div className="py-20 text-center">
                  <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-amber-400" />
                  </div>
                  <h3 className="ss font-bold text-slate-900 text-xl mb-2">No candidates found</h3>
                  <p className="text-slate-500 text-sm mb-4">
                    {(roleFilter || commFilter || skillFilter || search)
                      ? 'Try different filters'
                      : 'Students who select "Co-Founder" or "Startup" on their profile appear here.'}
                  </p>
                  {(roleFilter || commFilter || skillFilter || search) && (
                    <button onClick={() => { setRoleFilter(''); setCommFilter(''); setSkillFilter(''); setSearch(''); load(''); }}
                      className="text-sm font-semibold text-amber-600 hover:underline">
                      Clear all filters
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {shown.map((c, i) => (
                    <div key={c.id || i} className={`slide-in`} style={{ animationDelay: `${Math.min(i, 8) * 0.05}s` }}>
                      <CandidateCard
                        candidate={c}
                        isTop={i < 3}
                        onInvite={() => handleInvite(c)}
                        onMessage={() => handleMessage(c)}
                        inviteState={invStates[c.user_id]} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Message modal */}
      {msgModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-7 max-w-md w-full shadow-2xl modal-pop">
            <div className="flex items-center justify-between mb-5">
              <h3 className="ss font-black text-xl text-slate-900">Message {msgModal.name?.split(' ')[0]}</h3>
              <button onClick={() => setMsgModal(null)} className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <textarea
              className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl text-sm outline-none resize-none focus:border-amber-400 transition-colors"
              rows={5} value={msgText} onChange={e => setMsgText(e.target.value)}
              placeholder="Write your message…" maxLength={500} />
            <p className="text-xs text-slate-400 text-right mt-1 mb-4">{msgText.length}/500</p>
            <div className="flex gap-3">
              <button onClick={() => setMsgModal(null)}
                className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200">Cancel</button>
              <button onClick={handleSendMessage} disabled={!msgText.trim() || sending}
                className="flex-1 py-3 g-found text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50">
                {sending ? <Loader className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" />Send & Invite</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}