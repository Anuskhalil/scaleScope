import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import {
  fetchMatchedCoFounders,
  fetchStudentProfile,
  sendConnectionRequest,
  getOrCreateConversation,
} from '../../services/studentService';
import {
  Search, Sparkles, Zap, CheckCircle, Clock, X,
  Award, MessageSquare, Heart, UserPlus,
  ChevronRight, Filter, MapPin, Briefcase,
  Loader, AlertTriangle, RefreshCw, Users, Rocket,
} from 'lucide-react';

// ─── Design system (moved to global CSS in production) ───────────────────
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800;900&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&display=swap');
  .ss { font-family:'Syne',sans-serif; }
  .dm { font-family:'DM Sans',sans-serif; }
  .lift { transition: transform .22s cubic-bezier(.22,.68,0,1.2), box-shadow .22s ease; will-change: transform; }
  .lift:hover { transform: translateY(-3px); box-shadow: 0 16px 44px rgba(109,40,217,.10); }
  .g-vi { background: linear-gradient(135deg,#7c3aed,#6366f1); }
  .comp-fill { background: linear-gradient(90deg,#7c3aed,#6366f1); }
  .card-top { border-color: #c4b5fd !important; background: linear-gradient(160deg,#fdf9ff 0%,#f5f3ff 100%); }
  .filter-sec { border-bottom:1px solid #e2e8f0; padding-bottom:18px; margin-bottom:18px; }
  .filter-sec:last-child { border-bottom:none; padding-bottom:0; margin-bottom:0; }
  .chip { display:inline-flex; align-items:center; padding:4px 11px; border-radius:9999px; font-size:11px; font-weight:600; cursor:pointer; border:1.5px solid #e2e8f0; background:#fff; color:#64748b; transition:all .14s; user-select: none; -webkit-tap-highlight-color: transparent; }
  .chip:hover { border-color:#c4b5fd; color:#7c3aed; }
  .chip.on { background:#f5f3ff; border-color:#c4b5fd; color:#7c3aed; }
  .chip:active { transform: scale(.98); }
  .dot-g { width:7px;height:7px;border-radius:50%;background:#22c55e;flex-shrink:0; }
  .dot-a { width:7px;height:7px;border-radius:50%;background:#f59e0b;flex-shrink:0; }
  .int-tag { background:#f5f3ff; color:#6d28d9; border:1.5px solid #ede9fe; font-size:11px; font-weight:600; padding:3px 10px; border-radius:9999px; }
  .sk-tag  { background:#f5f3ff; color:#7c3aed; border:1.5px solid #ddd6fe; font-size:11px; font-weight:600; padding:3px 10px; border-radius:9999px; }
  .slide-in { animation: si .28s cubic-bezier(.32,.72,0,1) both; }
  @keyframes si { from{opacity:0;transform:translateX(28px)} to{opacity:1;transform:none} }
  .tab-bar { border-bottom:2px solid #e2e8f0; display:flex; overflow-x:auto; scroll-behavior: smooth; }
  .tab-bar::-webkit-scrollbar { display:none; }
  .tab { padding:10px 16px; font-size:13px; font-weight:600; color:#64748b; cursor:pointer; border-bottom:2px solid transparent; margin-bottom:-2px; transition:all .14s; white-space:nowrap; font-family:'DM Sans',sans-serif; }
  .tab.on { color:#7c3aed; border-bottom-color:#7c3aed; }
  .tab:active { transform: scale(.98); }
  @keyframes mp { from{opacity:0;transform:scale(.95)} to{opacity:1;transform:scale(1)} }
  .modal-pop { animation:mp .22s cubic-bezier(.34,1.4,.64,1) both; }
  .inp { width:100%; padding:10px 14px; border:1.5px solid #e2e8f0; border-radius:12px; font-size:13px; outline:none; font-family:'DM Sans',sans-serif; transition:border-color .14s; background:#fff; }
  .inp:focus { border-color:#7c3aed; box-shadow: 0 0 0 3px rgba(124,58,237,.1); }
  .thin::-webkit-scrollbar { width:4px; }
  .thin::-webkit-scrollbar-thumb { background:#e2e8f0; border-radius:4px; }
  .comp-track { height:5px; background:#ede9fe; border-radius:4px; overflow:hidden; }
  .comp-bar-fill { height:100%; background:linear-gradient(90deg,#7c3aed,#6366f1); border-radius:4px; }
  .badge-idea  { background:#f0fdf4; color:#16a34a; border:1.5px solid #bbf7d0; }
  .badge-mvp   { background:#eff6ff; color:#2563eb; border:1.5px solid #bfdbfe; }
  .badge-built { background:#fff7ed; color:#ea580c; border:1.5px solid #fed7aa; }
  @keyframes fu { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }
  .f0{animation:fu .32s ease both} .f1{animation:fu .32s .06s ease both} .f2{animation:fu .32s .12s ease both} .f3{animation:fu .32s .18s ease both} .f4{animation:fu .32s .24s ease both}
  .shimmer { background:linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%); background-size:200% 100%; animation:sh 1.4s infinite; border-radius:16px; contain: content; }
  @keyframes sh { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
  .no-scroll::-webkit-scrollbar{display:none} .no-scroll{-ms-overflow-style:none;scrollbar-width:none}
  /* Mobile optimizations */
  @media (max-width: 1024px) {
    .lift:hover { transform: none; box-shadow: none; }
    .chip:active { transform: scale(.95); }
  }
  @media (prefers-reduced-motion: reduce) {
    * { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; }
  }
`;

// ─── Constants (memoized to prevent re-creation) ─────────────────────────
const F_SKILLS = Object.freeze(['React', 'Node.js', 'AI/ML', 'Python', 'iOS/Swift', 'Design/Figma', 'Marketing', 'Finance', 'Product', 'Data', 'DevOps', 'Sales']);
const F_IND = Object.freeze(['EdTech', 'HealthTech', 'FinTech', 'SaaS', 'AgriTech', 'CleanTech', 'LegalTech', 'HRTech', 'E-Commerce', 'AI / ML']);
const F_STAGE = Object.freeze(['Just an Idea', 'Pre-MVP', 'Building MVP', 'MVP Built', 'Revenue']);
const F_LOC = Object.freeze(['Karachi', 'Lahore', 'Islamabad', 'Remote', 'International']);
const F_AVAIL = Object.freeze(['Full-time Ready', 'Part-time', 'Flexible / Open', 'After April']);

// ─── Performance Hooks ───────────────────────────────────────────────────
function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function useTimeout(callback, delay, deps = []) {
  useEffect(() => {
    const id = setTimeout(callback, delay);
    return () => clearTimeout(id);
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
}

// ─── Shape DB row into card format (FIXED) ─────────────────────
function shapeCofounder(row, currentUserId) {
  const p = row.profiles || {};
  const name = p.full_name || 'Founder';

  // ✅ Extract skills: handle both JSONB objects and plain strings
  const skillLevels = (row.skills_with_levels || []);
  const skillsFromLevels = skillLevels.map(s => {
    if (typeof s === 'object' && s !== null && s.skill) return s.skill;
    return String(s);
  }).filter(Boolean);

  const skillsFromProfile = Array.isArray(p.skills) ? p.skills : [];
  const skills = [...new Set([...skillsFromLevels, ...skillsFromProfile])]
    .map(s => String(s).trim())
    .filter(Boolean);

  // ✅ USE REAL MATCH DATA from matchingService
  const matchScore = row._matchScore ?? 70;
  const matchReasons = row._matchReasons ?? [];
  const matchedOn = row._matchedOn ?? {};

  const grad = matchScore >= 80 ? 'from-emerald-500 to-teal-600'
    : matchScore >= 60 ? 'from-violet-500 to-indigo-600'
      : 'from-slate-400 to-slate-600';

  const stage = row.has_startup_idea
    ? (row.startup_idea_description?.length > 100 ? 'Building MVP' : 'Just an Idea')
    : 'Just an Idea';

  const commitmentLower = (row.commitment_level || '').toLowerCase();
  const availability = commitmentLower.includes('full') ? 'Full-time Ready'
    : commitmentLower.includes('serious') ? 'Part-time'
      : 'Flexible / Open';
  const availDot = commitmentLower.includes('full') ? 'g' : 'a';

  return {
    id: row.id,
    user_id: row.user_id,
    initials: name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(),
    grad,
    name,
    role: skills.length ? skills.slice(0, 2).join(' + ') + ' Developer' : 'Student Founder',
    tagline: row.startup_idea_description
      ? `Building: ${row.startup_idea_description.slice(0, 55)}${row.startup_idea_description.length > 55 ? '...' : ''}`
      : 'Looking for startup partner',
    location: p.location || 'Remote',
    locDot: p.location ? 'g' : 'a',
    availability,
    availDot,
    startupStage: stage,
    stageClass: stage.includes('Built') ? 'badge-built'
      : stage.includes('MVP') ? 'badge-mvp'
        : 'badge-idea',
    industry: p.interests?.[0] || row.industry || 'EdTech',
    skills,
    interests: p.interests || row.interests || [],
    exp: row.current_year ? `Year ${row.current_year} student` : 'Student',
    edu: [row.university, row.degree].filter(Boolean).join(' • '),
    commitment: row.commitment_level || 'Open to discuss',

    matchScore: Math.min(matchScore, 99),
    verified: (p.profile_completion || 0) >= 80,
    badge: skills.some(s => ['React', 'Node.js', 'Python', 'AI/ML', 'Technical'].some(t => s.toLowerCase().includes(t.toLowerCase())))
      ? '⚡ Technical'
      : skills.some(s => ['Marketing', 'Sales', 'Finance', 'Business'].some(t => s.toLowerCase().includes(t.toLowerCase())))
        ? '📈 Business'
        : '💡 Idea Stage',
    bio: p.bio || row.startup_idea_description || '',

    aiReason: matchReasons.length > 0
      ? matchReasons.slice(0, 2).join(' • ')
      : 'Complementary skills and shared interests',

    compatScore: [
      { label: 'Skill Complement', val: matchedOn.skills ? 85 : 60 },
      { label: 'Vision Alignment', val: matchedOn.industry ? 80 : 65 },
      { label: 'Work Style Match', val: matchedOn.looking_for ? 75 : 60 },
      { label: 'Commitment Level', val: matchedOn.availability ? 90 : 55 },
    ].map(c => ({ ...c, val: Math.min(c.val, 99) })),

    projects: [],
  };
}

// ─── Memoized UI Components ──────────────────────────────────────────────
const Chip = memo(({ label, on, onClick }) => (
  <button
    onClick={onClick}
    className={`chip ${on ? 'on' : ''}`}
    aria-pressed={on}
    role="switch"
  >
    {label}
  </button>
));

const CheckRow = memo(({ label, checked, onClick }) => (
  <label className="flex items-center gap-2.5 cursor-pointer group" onClick={onClick}>
    <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border-2 transition-all ${checked ? 'bg-violet-600 border-violet-600' : 'border-slate-300 group-hover:border-violet-300'}`} role="checkbox" aria-checked={checked}>
      {checked && <div className="w-2 h-2 rounded-sm bg-white" />}
    </div>
    <span className="text-sm text-slate-600 group-hover:text-violet-600 transition-colors">{label}</span>
  </label>
));

const RadioRow = memo(({ label, checked, onClick }) => (
  <label className="flex items-center gap-2.5 cursor-pointer group" onClick={onClick}>
    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${checked ? 'bg-violet-600 border-violet-600' : 'border-slate-300 group-hover:border-violet-300'}`} role="radio" aria-checked={checked}>
      {checked && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
    </div>
    <span className="text-sm text-slate-600 group-hover:text-violet-600 transition-colors">{label}</span>
  </label>
));

const CompatBars = memo(({ scores }) => (
  <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
    {scores.map((c, i) => (
      <div key={i}>
        <div className="flex justify-between text-xs mb-1">
          <span className="text-slate-500">{c.label}</span>
          <span className="font-bold text-slate-700">{c.val}%</span>
        </div>
        <div className="comp-track" role="progressbar" aria-valuenow={c.val} aria-valuemin={0} aria-valuemax={100}>
          <div className="comp-bar-fill" style={{ width: `${c.val}%` }} />
        </div>
      </div>
    ))}
  </div>
));

// ─── Profile Panel (memoized) ────────────────────────────────────────────
const ProfilePanel = memo(({ cf, onClose, onConnect, onMessage }) => {
  const [tab, setTab] = useState('about');

  useEffect(() => {
    const handleEsc = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40 flex" role="dialog" aria-modal="true" aria-labelledby="profile-title">
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="w-full max-w-lg bg-white h-full flex flex-col shadow-2xl slide-in dm overflow-hidden">
        <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <p id="profile-title" className="text-xs font-bold text-slate-400 uppercase tracking-widest">Co-Founder Profile</p>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-all" aria-label="Close profile">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto thin">
          <div className="px-6 pt-6 pb-5 border-b border-slate-100">
            <div className="flex items-start gap-4 mb-4">
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${cf.grad} flex items-center justify-center text-white font-black text-xl ss flex-shrink-0`} aria-hidden="true">
                {cf.initials}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="ss font-black text-slate-900 text-xl leading-tight mb-0.5">{cf.name}</h2>
                <p className="text-sm font-semibold text-slate-600">{cf.role}</p>
                <p className="text-xs text-slate-400 mt-0.5 italic">{cf.tagline}</p>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2 mb-4">
              {[
                { label: 'Match', v: `${cf.matchScore}%`, sub: 'Match score' },
                { label: 'Avail', v: cf.availDot === 'g' ? 'Now' : 'Soon', sub: 'availability' },
                { label: 'Stage', v: cf.startupStage.split(' ').slice(-1)[0], sub: 'startup stage' },
                { label: 'Edu', v: cf.edu ? cf.edu.split(' ')[0] : '—', sub: 'university' },
              ].map((s, i) => (
                <div key={i} className="bg-slate-50 rounded-xl p-2.5 text-center">
                  <p className="ss font-black text-slate-900 text-base leading-none mb-0.5">{s.v}</p>
                  <p className="text-[10px] text-slate-400 leading-tight">{s.sub}</p>
                </div>
              ))}
            </div>
            <div className="bg-violet-50 border border-violet-100 rounded-xl p-3 text-xs text-violet-700 leading-relaxed">
              <p className="font-bold flex items-center gap-1 mb-1"><Zap className="w-3 h-3 text-violet-500" aria-hidden="true" /> Why matched</p>
              {cf.aiReason}
            </div>
          </div>
          <div className="px-6 border-b border-slate-100">
            <div className="tab-bar" role="tablist">
              {['about', 'skills', 'compatibility'].map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`tab ${tab === t ? 'on' : ''}`}
                  role="tab"
                  aria-selected={tab === t}
                  aria-controls={`panel-${t}`}
                  id={`tab-${t}`}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div className="px-6 py-6">
            {tab === 'about' && (
              <div className="space-y-5" role="tabpanel" id="panel-about" aria-labelledby="tab-about">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Bio</p>
                  {cf.bio ? <p className="text-sm text-slate-700 leading-relaxed">{cf.bio}</p> : <p className="text-sm text-slate-400 italic">No bio added yet.</p>}
                </div>
                {cf.interests.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Startup Interests</p>
                    <div className="flex flex-wrap gap-2">{cf.interests.map(t => <span key={t} className="int-tag">{t}</span>)}</div>
                  </div>
                )}
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Details</p>
                  <div className="space-y-2">
                    {[
                      { icon: <MapPin className="w-3.5 h-3.5" aria-hidden="true" />, val: cf.location },
                      { icon: <Clock className="w-3.5 h-3.5" aria-hidden="true" />, val: cf.exp },
                      { icon: <Award className="w-3.5 h-3.5" aria-hidden="true" />, val: cf.edu },
                      { icon: <Briefcase className="w-3.5 h-3.5" aria-hidden="true" />, val: cf.commitment },
                      { icon: <Rocket className="w-3.5 h-3.5" aria-hidden="true" />, val: `Stage: ${cf.startupStage}` },
                    ].filter(d => d.val).map((d, i) => (
                      <div key={i} className="flex items-center gap-2.5 text-sm text-slate-600">
                        <span className="text-violet-400 flex-shrink-0">{d.icon}</span>{d.val}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {tab === 'skills' && (
              <div role="tabpanel" id="panel-skills" aria-labelledby="tab-skills">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Skills</p>
                {cf.skills.length > 0 ? (
                  <div className="flex flex-wrap gap-2 mb-6">{cf.skills.map(s => <span key={s} className="sk-tag">{s}</span>)}</div>
                ) : <p className="text-sm text-slate-400 italic mb-4">No skills listed.</p>}
              </div>
            )}
            {tab === 'compatibility' && (
              <div role="tabpanel" id="panel-compatibility" aria-labelledby="tab-compatibility">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-5">Compatibility Breakdown</p>
                <CompatBars scores={cf.compatScore} />
                <div className="mt-5 p-4 bg-violet-50 border border-violet-100 rounded-xl">
                  <p className="text-xs font-bold text-violet-700 mb-1">Overall Match Score</p>
                  <p className="ss font-black text-violet-900 text-2xl">{cf.matchScore}%</p>
                  <p className="text-xs text-violet-600 mt-1">Based on skills, vision, work style & commitment alignment.</p>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="sticky bottom-0 border-t border-slate-100 bg-white px-6 py-4 flex gap-3 flex-shrink-0">
          <button onClick={() => onMessage(cf)} className="flex-1 flex items-center justify-center gap-2 border-2 border-slate-200 text-slate-700 hover:border-violet-300 hover:text-violet-600 py-3 rounded-xl text-sm font-bold transition-all min-h-[44px]">
            <MessageSquare className="w-4 h-4" aria-hidden="true" /> Message
          </button>
          <button onClick={() => onConnect(cf)} className="flex-1 flex items-center justify-center gap-2 g-vi text-white py-3 rounded-xl text-sm font-bold hover:opacity-90 transition-all shadow-lg shadow-violet-200 min-h-[44px]">
            <UserPlus className="w-4 h-4" aria-hidden="true" /> Connect
          </button>
        </div>
      </div>
    </div>
  );
});

// ─── Connect Modal (memoized) ────────────────────────────────────────────
const ConnectModal = memo(({ cf, userId, onClose }) => {
  const [idea, setIdea] = useState('');
  const [why, setWhy] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSend = useCallback(async () => {
    setSending(true); setError('');
    try {
      const message = [idea && `Idea: ${idea}`, why && `Why: ${why}`].filter(Boolean).join('\n');
      await sendConnectionRequest(userId, cf.user_id, 'cofounder_request', message);
      setSent(true);
    } catch (err) {
      setError(err.message || 'Failed to send request');
    } finally {
      setSending(false);
    }
  }, [idea, why, userId, cf.user_id]);

  useEffect(() => {
    const handleEsc = (e) => e.key === 'Escape' && !sent && onClose();
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose, sent]);

  if (sent) return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl modal-pop">
        <div className="w-16 h-16 g-vi rounded-2xl flex items-center justify-center mx-auto mb-4" aria-hidden="true">
          <CheckCircle className="w-8 h-8 text-white" />
        </div>
        <h3 className="ss font-black text-slate-900 text-xl mb-2">Request Sent!</h3>
        <p className="text-sm text-slate-500 leading-relaxed mb-6"><strong className="text-slate-700">{cf.name}</strong> will receive your co-founder request.</p>
        <button onClick={onClose} className="w-full py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-all min-h-[44px]">Done</button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="connect-title">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl modal-pop dm">
        <div className="flex items-center justify-between mb-6">
          <h3 id="connect-title" className="ss font-black text-slate-900 text-xl">Send Co-Founder Request</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-all" aria-label="Close">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>
        <div className="flex items-center gap-3 p-4 bg-violet-50 border border-violet-100 rounded-2xl mb-6">
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${cf.grad} flex items-center justify-center text-white font-bold ss flex-shrink-0`} aria-hidden="true">
            {cf.initials}
          </div>
          <div className="flex-1">
            <p className="ss font-bold text-slate-900">{cf.name}</p>
            <p className="text-xs text-slate-500">{cf.role}</p>
          </div>
          <div className="g-vi text-white text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0">{cf.matchScore}% match</div>
        </div>
        {error && <p className="text-xs text-red-600 bg-red-50 p-3 rounded-xl mb-4" role="alert">{error}</p>}
        <div className="space-y-4 mb-5">
          <div>
            <label htmlFor="idea-input" className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Your idea in one line</label>
            <input
              id="idea-input"
              type="text"
              className="inp"
              value={idea}
              onChange={e => setIdea(e.target.value)}
              placeholder="e.g. AI-powered personalised learning for Pakistan's students"
              maxLength={200}
            />
          </div>
          <div>
            <label htmlFor="why-input" className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Why do you see them as your co-founder?</label>
            <textarea
              id="why-input"
              rows={3}
              className="inp resize-none"
              value={why}
              onChange={e => setWhy(e.target.value)}
              placeholder="Reference their specific background..."
              maxLength={500}
            />
          </div>
        </div>
        <div className="bg-violet-50 border border-violet-100 rounded-xl p-3 mb-5 text-xs text-violet-700 leading-relaxed">
          <strong className="flex items-center gap-1 mb-1"><Zap className="w-3 h-3" aria-hidden="true" /> Tip:</strong>
          Lead with why your domain insight is the missing piece they need.
        </div>
        <button
          onClick={handleSend}
          disabled={sending}
          className="w-full g-vi text-white font-bold py-3.5 rounded-xl hover:opacity-90 transition-all shadow-lg shadow-violet-200 flex items-center justify-center gap-2 disabled:opacity-50 min-h-[44px]"
          aria-busy={sending}
        >
          {sending ? <><Loader className="w-4 h-4 animate-spin" aria-hidden="true" />Sending…</> : <><UserPlus className="w-4 h-4" aria-hidden="true" /> Send Co-Founder Request</>}
        </button>
      </div>
    </div>
  );
});

// ─── Message Modal (memoized) ────────────────────────────────────────────
const MessageModal = memo(({ cf, userId, onClose }) => {
  const navigate = useNavigate();
  const [msg, setMsg] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const handleSend = useCallback(async () => {
    if (!msg.trim()) return;
    setSending(true); setError('');
    try {
      await getOrCreateConversation(userId, cf.user_id);
      navigate('/messages');
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to open conversation');
      setSending(false);
    }
  }, [msg, userId, cf.user_id, navigate, onClose]);

  useEffect(() => {
    const handleEsc = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="message-title">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl modal-pop dm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${cf.grad} flex items-center justify-center text-white text-sm font-bold ss`} aria-hidden="true">
              {cf.initials}
            </div>
            <div>
              <p className="ss font-bold text-slate-900">{cf.name}</p>
              <p className="text-xs text-slate-400">{cf.role}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-all" aria-label="Close">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>
        {error && <p className="text-xs text-red-600 bg-red-50 p-3 rounded-xl mb-4" role="alert">{error}</p>}
        <textarea
          rows={4}
          value={msg}
          onChange={e => setMsg(e.target.value)}
          className="inp resize-none mb-4"
          placeholder={`Hi ${cf.name.split(' ')[0]}, I came across your profile on ScalScope...`}
          maxLength={1000}
          aria-label="Message"
        />
        <button
          onClick={handleSend}
          disabled={!msg.trim() || sending}
          className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all min-h-[44px]
            ${msg.trim() && !sending ? 'g-vi text-white shadow-lg shadow-violet-200 hover:opacity-90' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
          aria-busy={sending}
        >
          {sending ? <><Loader className="w-4 h-4 animate-spin" aria-hidden="true" />Opening…</> : <><MessageSquare className="w-4 h-4" aria-hidden="true" /> Open Chat</>}
        </button>
        <p className="text-xs text-slate-400 text-center mt-2">You'll be redirected to Messages.</p>
      </div>
    </div>
  );
});

// ─── CoFounder Card (memoized for performance) ───────────────────────────
const CoFounderCard = memo(({ cf, onView, onConnect, onMessage, onSave, isSaved }) => {
  const [showBreakdown, setShowBreakdown] = useState(false);

  return (
    <div
      className={`lift bg-white rounded-2xl p-6 border shadow-sm ${cf.matchScore >= 80 ? 'card-top border-violet-200' : 'border-slate-100'}`}
      style={{ contain: 'content' }}
    >
      {cf.matchScore >= 80 && (
        <div className="mb-4">
          <span className="g-vi text-white text-xs font-bold px-3 py-1.5 rounded-full inline-flex items-center gap-1">
            <Sparkles className="w-3 h-3" aria-hidden="true" /> Strong Match
          </span>
        </div>
      )}
      <div className="flex flex-col md:flex-row gap-5">
        <div className="flex-shrink-0">
          <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${cf.grad} flex items-center justify-center text-white font-black text-lg ss`} aria-hidden="true">
            {cf.initials}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="ss font-black text-slate-900 text-xl">{cf.name}</h3>
                {cf.verified && <CheckCircle className="w-4 h-4 text-violet-500 flex-shrink-0" aria-label="Verified profile" />}
                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">{cf.badge}</span>
              </div>
              <p className="text-sm font-semibold text-slate-600 mt-0.5">{cf.role}</p>
              <p className="text-xs text-violet-500 font-medium italic mt-0.5">{cf.tagline}</p>
            </div>
            <div className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 flex-shrink-0 ${cf.matchScore >= 80 ? 'g-vi text-white' : cf.matchScore >= 60 ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-600'}`}>
              <Zap className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="font-bold text-sm">{cf.matchScore}% Match</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 mb-3 text-xs">
            <span className="flex items-center gap-1.5 text-slate-500">
              <MapPin className="w-3 h-3" aria-hidden="true" />{cf.location}
            </span>
            <span className={`flex items-center gap-1.5 font-semibold ${cf.availDot === 'g' ? 'text-green-600' : 'text-amber-600'}`}>
              <div className={cf.availDot === 'g' ? 'dot-g' : 'dot-a'} aria-hidden="true" />{cf.availability}
            </span>
            <span className={`px-2.5 py-0.5 rounded-full font-bold text-xs ${cf.stageClass}`}>{cf.startupStage}</span>
          </div>
          {cf.interests.length > 0 && (
            <div className="flex items-center gap-1.5 mb-3 flex-wrap">
              <span className="text-xs text-slate-400">Interested in:</span>
              {cf.interests.slice(0, 3).map(t => <span key={t} className="int-tag">{t}</span>)}
            </div>
          )}
          {cf.skills.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {cf.skills.slice(0, 5).map(s => <span key={s} className="sk-tag">{s}</span>)}
            </div>
          )}
          {(cf.exp || cf.edu) && (
            <div className="flex flex-wrap gap-4 mb-4 text-xs text-slate-500">
              {cf.edu && <span className="flex items-center gap-1"><Award className="w-3.5 h-3.5 text-violet-400" aria-hidden="true" />{cf.edu}</span>}
              {cf.exp && <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-violet-400" aria-hidden="true" />{cf.exp}</span>}
            </div>
          )}
          <div className="mb-4"><CompatBars scores={cf.compatScore} /></div>

          {/* Match transparency - accessible toggle */}
          <div className="bg-violet-50 border border-violet-100 rounded-xl p-3 mb-4 text-xs text-violet-700 leading-relaxed">
            <button
              onClick={() => setShowBreakdown(!showBreakdown)}
              className="flex items-center justify-between w-full group text-left"
              aria-expanded={showBreakdown}
              aria-controls={`breakdown-${cf.id}`}
            >
              <span>
                <Zap className="w-3 h-3 inline mr-1 text-violet-500" aria-hidden="true" />
                <strong>Why matched: </strong>{cf.aiReason}
              </span>
              <ChevronRight className={`w-4 h-4 transition-transform md:hidden ${showBreakdown ? 'rotate-90' : ''}`} aria-hidden="true" />
            </button>
            <div
              id={`breakdown-${cf.id}`}
              className={`mt-3 space-y-2 ${showBreakdown ? 'block' : 'hidden md:block'}`}
            >
              {cf.compatScore.map((c, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-[10px] text-slate-500 w-24 flex-shrink-0">{c.label}</span>
                  <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${c.val >= 80 ? 'bg-emerald-500' : c.val >= 60 ? 'bg-violet-500' : 'bg-slate-400'}`}
                      style={{ width: `${c.val}%` }}
                      role="progressbar"
                      aria-valuenow={c.val}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    />
                  </div>
                  <span className="text-[10px] font-bold text-slate-700 w-8 text-right">{c.val}%</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onView(cf)}
              className="flex items-center gap-1.5 border-2 border-slate-200 text-slate-700 hover:border-violet-300 hover:text-violet-600 px-4 py-2 rounded-xl text-sm font-bold transition-all min-h-[44px]"
            >
              View Profile <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
            <button
              onClick={() => onConnect(cf)}
              className="flex items-center gap-1.5 g-vi text-white px-4 py-2 rounded-xl text-sm font-bold hover:opacity-90 transition-all shadow-md shadow-violet-200 min-h-[44px]"
            >
              <UserPlus className="w-3.5 h-3.5" aria-hidden="true" /> Connect
            </button>
            <button
              onClick={() => onMessage(cf)}
              className="flex items-center gap-1.5 border-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50 px-4 py-2 rounded-xl text-sm font-bold transition-all min-h-[44px]"
            >
              <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" /> Message
            </button>
            <button
              onClick={() => onSave(cf.id)}
              className={`flex items-center gap-1.5 border-2 px-4 py-2 rounded-xl text-sm font-bold transition-all min-h-[44px]
                ${isSaved ? 'border-rose-300 bg-rose-50 text-rose-600' : 'border-slate-200 text-slate-500 hover:border-rose-300 hover:text-rose-500'}`}
              aria-pressed={isSaved}
            >
              <Heart className={`w-3.5 h-3.5 ${isSaved ? 'fill-rose-500 text-rose-500' : ''}`} aria-hidden="true" />
              {isSaved ? 'Saved' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PAGE — OPTIMIZED VERSION
// ═══════════════════════════════════════════════════════════════════════════
export default function FindCoFoundersPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [founders, setFounders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchErr, setFetchErr] = useState('');

  const [query, setQuery] = useState('');
  const [fSkills, setFSkills] = useState([]);
  const [fInd, setFInd] = useState([]);
  const [fStage, setFStage] = useState('');
  const [fLoc, setFLoc] = useState([]);
  const [fAvail, setFAvail] = useState('');
  const [sortBy, setSortBy] = useState('match');
  const [profile, setProfile] = useState(null);
  const [connect, setConnect] = useState(null);
  const [message, setMessage] = useState(null);
  const [saved, setSaved] = useState(new Set());
  const [sbOpen, setSbOpen] = useState(false);

  // Debounce search input
  const debouncedQuery = useDebounce(query, 300);

  // ✅ Load matched co-founders with current user profile context
  const loadFounders = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setFetchErr('');

    // Timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      setFetchErr('Request timed out. Please check your connection.');
      setLoading(false);
    }, 10000);

    try {
      const currentUserProfile = await fetchStudentProfile(user.id);

      const matchedFounders = await fetchMatchedCoFounders(
        currentUserProfile,
        {
          skills: fSkills,
          industry: fInd[0],
          startupStage: fStage,
          location: fLoc[0],
          availability: fAvail,
          limit: 30,
        },
        { minScore: 35 }
      );

      const shaped = matchedFounders
        .filter(r => r.user_id !== user.id)
        .map(row => shapeCofounder(row, user.id));

      setFounders(shaped);

    } catch (err) {
      console.error('[loadFounders]', err);
      const userMsg = err.message?.includes('row-level security')
        ? "Permission denied. Please ensure your profile is complete."
        : err.message?.includes('connection')
          ? "Network issue. Please check your connection."
          : "Failed to load matches. Please try again.";
      setFetchErr(userMsg);
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  }, [user?.id, fSkills, fInd, fStage, fLoc, fAvail]);

  // Initial load + re-rank on filter changes
  useEffect(() => {
    loadFounders();
  }, [loadFounders]);

  // Cleanup: clear timeouts on unmount
  useEffect(() => {
    return () => {
      // Any pending timeouts will be cleared by individual components
    };
  }, []);

  const togArr = useCallback((arr, set, v) => {
    set(p => p.includes(v) ? p.filter(x => x !== v) : [...p, v]);
  }, []);

  const clearAll = useCallback(() => {
    setFSkills([]); setFInd([]); setFStage(''); setFLoc([]); setFAvail('');
  }, []);

  const activeN = useMemo(() =>
    fSkills.length + fInd.length + (fStage ? 1 : 0) + fLoc.length + (fAvail ? 1 : 0),
    [fSkills, fInd, fStage, fLoc, fAvail]
  );

  const togSave = useCallback(id => {
    setSaved(p => {
      const n = new Set(p);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }, []);

  // ✅ Client-side filtering + sorting (memoized for performance)
  const filtered = useMemo(() => {
    const q = debouncedQuery.toLowerCase();

    return founders
      .filter(cf => {
        return (
          (!q || cf.name.toLowerCase().includes(q)
            || cf.skills.some(s => s.toLowerCase().includes(q))
            || cf.interests.some(i => i.toLowerCase().includes(q))
            || cf.role.toLowerCase().includes(q)
            || cf.location.toLowerCase().includes(q))
          && (!fSkills.length || fSkills.some(s => cf.skills.includes(s)))
          && (!fInd.length || fInd.includes(cf.industry))
          && (!fStage || cf.startupStage === fStage)
          && (!fLoc.length || fLoc.includes(cf.location))
          && (!fAvail || cf.availability === fAvail)
        );
      })
      .map(cf => ({
        ...cf,
        _filterBonus: (fSkills.length && fSkills.some(s => cf.skills.includes(s)) ? 5 : 0) +
          (fInd.length && fInd.includes(cf.industry) ? 5 : 0)
      }))
      .sort((a, b) => {
        const scoreA = a.matchScore + (a._filterBonus || 0);
        const scoreB = b.matchScore + (b._filterBonus || 0);
        return sortBy === 'match' ? scoreB - scoreA :
          sortBy === 'skills' ? b.skills.length - a.skills.length :
            a.name.localeCompare(b.name);
      })
      .map(({ _filterBonus, ...cf }) => cf);
  }, [founders, debouncedQuery, fSkills, fInd, fStage, fLoc, fAvail, sortBy]);

  // Handlers for card actions (memoized)
  const handleView = useCallback((cf) => setProfile(cf), []);
  const handleConnect = useCallback((cf) => setConnect(cf), []);
  const handleMessage = useCallback((cf) => setMessage(cf), []);
  const handleSave = useCallback((id) => togSave(id), [togSave]);

  return (
    <div className="min-h-screen bg-[#faf8ff] pt-20 pb-16 dm">
      <style>{STYLES}</style>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <header className="mb-8 f0">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-600 uppercase tracking-widest bg-violet-50 border border-violet-100 px-3 py-1 rounded-full mb-3">
            <UserPlus className="w-3.5 h-3.5" aria-hidden="true" /> Co-Founder Matching
          </span>
          <h1 className="ss text-3xl md:text-4xl font-black text-slate-900 mb-2">Find Your Co-Founder</h1>
          <p className="text-slate-500 text-sm max-w-xl">The most important hire you'll ever make. Matches ranked by complementarity, commitment, vision, and work style.</p>
        </header>

        {/* Match Banner */}
        <div className="g-vi rounded-2xl p-5 mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 f1">
          <div className="w-11 h-11 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0" aria-hidden="true">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="ss font-bold text-white text-base">Smart Matching Based on Your Profile</p>
            <p className="text-violet-200 text-xs mt-0.5">Results ranked by skill complementarity and shared goals.</p>
          </div>
          <span className="bg-white/15 border border-white/20 text-white text-xs font-bold px-3 py-1.5 rounded-xl flex-shrink-0" aria-live="polite">
            {filtered.length} Matches Found
          </span>
        </div>

        {/* Error */}
        {fetchErr && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-2xl px-5 py-3 mb-6" role="alert">
            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" aria-hidden="true" />
            <p className="text-sm text-red-700 flex-1">{fetchErr}</p>
            <button onClick={loadFounders} className="flex items-center gap-1 text-xs font-bold text-red-600">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" /> Retry
            </button>
          </div>
        )}

        {/* Search + Sort + Refresh */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5 f3">
          <div className="flex-1 flex items-center bg-white border border-slate-200 rounded-xl px-4 gap-2 shadow-sm">
            <Search className="w-4 h-4 text-slate-400 flex-shrink-0" aria-hidden="true" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by skill, location, interest…"
              className="flex-1 py-3 text-sm outline-none bg-transparent text-slate-700 placeholder-slate-400 dm"
              aria-label="Search co-founders"
            />
          </div>
          <button
            onClick={() => setSbOpen(v => !v)}
            className="lg:hidden flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-600 shadow-sm min-h-[44px]"
            aria-expanded={sbOpen}
            aria-controls="filters-sidebar"
          >
            <Filter className="w-4 h-4" aria-hidden="true" /> Filters
            {activeN > 0 && <span className="g-vi text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{activeN}</span>}
          </button>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 outline-none shadow-sm dm min-h-[44px]"
            aria-label="Sort by"
          >
            <option value="match">Best Match</option>
            <option value="skills">Most Skills</option>
            <option value="name">Alphabetical</option>
          </select>
          <button
            onClick={loadFounders}
            className="flex items-center gap-1.5 text-xs font-semibold text-violet-600 hover:text-violet-700 transition-colors px-3 py-2 rounded-xl border border-violet-200 bg-violet-50 hover:bg-violet-100 min-h-[44px]"
            title="Refresh matches based on your updated profile"
            aria-label="Refresh matches"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
            Refresh
          </button>
        </div>

        <p className="text-sm text-slate-500 mb-5" aria-live="polite">
          Showing <span className="font-bold text-slate-900">{filtered.length}</span> co-founder{filtered.length !== 1 ? 's' : ''}
          {activeN > 0 && <span className="text-violet-600 font-medium"> · {activeN} filter{activeN > 1 ? 's' : ''} active</span>}
        </p>

        <div className="flex gap-7 items-start">
          {/* Sidebar - Mobile: toggle, Desktop: sticky */}
          <aside
            id="filters-sidebar"
            className={`w-60 flex-shrink-0 bg-white rounded-2xl border border-slate-100 shadow-sm p-5 ${sbOpen ? 'block' : 'hidden'} lg:block lg:sticky lg:top-24`}
            aria-label="Filters"
          >
            <div className="flex items-center justify-between mb-5">
              <p className="ss font-bold text-slate-900 text-sm">Filters</p>
              {activeN > 0 && <button onClick={clearAll} className="text-xs text-red-500 font-semibold hover:text-red-600 transition-colors">Clear all</button>}
            </div>
            <div className="filter-sec">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Skills</p>
              <div className="flex flex-wrap gap-1.5">
                {F_SKILLS.map(v => (
                  <Chip
                    key={v}
                    label={v}
                    on={fSkills.includes(v)}
                    onClick={() => togArr(fSkills, setFSkills, v)}
                  />
                ))}
              </div>
            </div>
            <div className="filter-sec">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Industry</p>
              <div className="space-y-2">
                {F_IND.slice(0, 6).map(v => (
                  <CheckRow
                    key={v}
                    label={v}
                    checked={fInd.includes(v)}
                    onClick={() => togArr(fInd, setFInd, v)}
                  />
                ))}
              </div>
            </div>
            <div className="filter-sec">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Startup Stage</p>
              <div className="space-y-2">
                {F_STAGE.map(v => (
                  <RadioRow
                    key={v}
                    label={v}
                    checked={fStage === v}
                    onClick={() => setFStage(p => p === v ? '' : v)}
                  />
                ))}
              </div>
            </div>
            <div className="filter-sec">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Location</p>
              <div className="flex flex-wrap gap-1.5">
                {F_LOC.map(v => (
                  <Chip
                    key={v}
                    label={v}
                    on={fLoc.includes(v)}
                    onClick={() => togArr(fLoc, setFLoc, v)}
                  />
                ))}
              </div>
            </div>
            <div className="filter-sec">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Availability</p>
              <div className="space-y-2">
                {F_AVAIL.map(v => (
                  <RadioRow
                    key={v}
                    label={v}
                    checked={fAvail === v}
                    onClick={() => setFAvail(p => p === v ? '' : v)}
                  />
                ))}
              </div>
            </div>
          </aside>

          {/* Cards */}
          <main className="flex-1 min-w-0 space-y-4" aria-label="Co-founder results">
            {loading ? (
              // Skeleton loading states
              <>
                <div className="shimmer h-48 rounded-2xl" />
                <div className="shimmer h-48 rounded-2xl" />
                <div className="shimmer h-48 rounded-2xl" />
              </>
            ) : filtered.length === 0 ? (
              // Empty state with CTAs
              <div className="bg-white rounded-2xl p-12 text-center border border-slate-100">
                <div className="w-16 h-16 bg-violet-50 rounded-full flex items-center justify-center mx-auto mb-4" aria-hidden="true">
                  <Users className="w-8 h-8 text-violet-500" />
                </div>
                <p className="ss font-bold text-slate-700 mb-2 text-lg">No co-founders match your filters</p>
                <p className="text-sm text-slate-500 mb-6 max-w-md mx-auto">
                  {founders.length === 0
                    ? "You're the only student looking for a co-founder right now. Complete your profile to appear in others' searches!"
                    : "Try broadening your filters or check back later as more students join."}
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={clearAll}
                    className="px-5 py-2.5 bg-violet-600 text-white rounded-xl font-semibold hover:bg-violet-700 transition-all min-h-[44px]"
                  >
                    Clear Filters
                  </button>
                  <button
                    onClick={() => navigate('/student-profile')}
                    className="px-5 py-2.5 border-2 border-violet-200 text-violet-700 rounded-xl font-semibold hover:bg-violet-50 transition-all min-h-[44px]"
                  >
                    Complete My Profile
                  </button>
                </div>
              </div>
            ) : (
              // Results list
              filtered.map((cf, idx) => (
                <CoFounderCard
                  key={cf.id}
                  cf={cf}
                  onView={handleView}
                  onConnect={handleConnect}
                  onMessage={handleMessage}
                  onSave={handleSave}
                  isSaved={saved.has(cf.id)}
                />
              ))
            )}
          </main>
        </div>
      </div>

      {/* Modals - Lazy rendered */}
      {profile && (
        <ProfilePanel
          cf={profile}
          onClose={() => setProfile(null)}
          onConnect={c => { setProfile(null); setConnect(c); }}
          onMessage={c => { setProfile(null); setMessage(c); }}
        />
      )}
      {connect && user && (
        <ConnectModal
          cf={connect}
          userId={user.id}
          onClose={() => setConnect(null)}
        />
      )}
      {message && user && (
        <MessageModal
          cf={message}
          userId={user.id}
          onClose={() => setMessage(null)}
        />
      )}
    </div>
  );
}