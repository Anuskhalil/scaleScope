import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import {
  fetchMentors,
  fetchStudentProfile,
  fetchSentRequests,
  sendConnectionRequest,
  getOrCreateConversation,
  sendMessage,
} from '../services/studentService';
import { rankMentors } from '../services/matchingService';
import {
  Search, Sparkles, MessageSquare,
  Zap, CheckCircle, Users, Clock, X, GraduationCap,
  ChevronRight, Filter, Building2,
  MapPin, Send, Loader,
  AlertTriangle, RefreshCw, ArrowLeft,
} from 'lucide-react';

// ─── Design system (move to global CSS in production) ───────────────────
const STYLES = `
  .ss  { font-family:'Syne',sans-serif; }
  .dm  { font-family:'DM Sans',sans-serif; }
  .lift { transition: transform .22s cubic-bezier(.22,.68,0,1.2), box-shadow .22s ease; will-change: transform; contain: content; }
  .lift:hover { transform: translateY(-3px); box-shadow: 0 16px 44px rgba(15,23,42,.09); }
  .g-ai { background: linear-gradient(135deg,#4f46e5,#7c3aed); }
  .card-top { border-color: #a5b4fc !important; background: linear-gradient(160deg,#fafafe 0%,#f5f3ff 100%); }
  .filter-sec { border-bottom:1px solid #e2e8f0; padding-bottom:18px; margin-bottom:18px; }
  .filter-sec:last-child { border-bottom:none; padding-bottom:0; margin-bottom:0; }
  .chip { display:inline-flex; align-items:center; padding:4px 11px; border-radius:9999px; font-size:11px; font-weight:600; cursor:pointer; border:1.5px solid #e2e8f0; background:#fff; color:#64748b; transition:all .14s; user-select: none; -webkit-tap-highlight-color: transparent; }
  .chip:hover { border-color:#a5b4fc; color:#4f46e5; }
  .chip.on { background:#eef2ff; border-color:#a5b4fc; color:#4f46e5; }
  .chip:active { transform: scale(.98); }
  .dot-g { width:7px;height:7px;border-radius:50%;background:#22c55e;flex-shrink:0; }
  .dot-a { width:7px;height:7px;border-radius:50%;background:#f59e0b;flex-shrink:0; }
  .slide-in { animation: si .28s cubic-bezier(.32,.72,0,1) both; }
  @keyframes si { from{opacity:0;transform:translateX(28px)} to{opacity:1;transform:none} }
  .tab-bar { border-bottom:2px solid #e2e8f0; display:flex; overflow-x:auto; scroll-behavior: smooth; }
  .tab-bar::-webkit-scrollbar { display:none; }
  .tab { padding:10px 16px; font-size:13px; font-weight:600; color:#64748b; cursor:pointer; border-bottom:2px solid transparent; margin-bottom:-2px; transition:all .14s; white-space:nowrap; font-family:'DM Sans',sans-serif; }
  .tab.on { color:#4f46e5; border-bottom-color:#4f46e5; }
  .tab:active { transform: scale(.98); }
  .exp-wrap { position:relative; padding-left:22px; }
  .exp-wrap::before { content:''; position:absolute; left:7px; top:10px; width:1.5px; bottom:0; background:linear-gradient(to bottom,#a5b4fc 60%,transparent); }
  .exp-dot { position:absolute; left:1px; top:6px; width:12px; height:12px; border-radius:50%; border:2px solid #a5b4fc; background:#fff; }
  @keyframes fu { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }
  .f0{animation:fu .32s ease both} .f1{animation:fu .32s .06s ease both} .f2{animation:fu .32s .12s ease both} .f3{animation:fu .32s .18s ease both} .f4{animation:fu .32s .24s ease both}
  @keyframes mp { from{opacity:0;transform:scale(.95)} to{opacity:1;transform:scale(1)} }
  .modal-pop { animation:mp .22s cubic-bezier(.34,1.4,.64,1) both; }
  .inp { width:100%; padding:10px 14px; border:1.5px solid #e2e8f0; border-radius:12px; font-size:13px; outline:none; font-family:'DM Sans',sans-serif; transition:border-color .14s; background:#fff; }
  .inp:focus { border-color:#6366f1; box-shadow: 0 0 0 3px rgba(79,70,229,.1); }
  .thin::-webkit-scrollbar { width:4px; }
  .thin::-webkit-scrollbar-thumb { background:#e2e8f0; border-radius:4px; }
  .shimmer { background:linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%); background-size:200% 100%; animation:sh 1.4s infinite; border-radius:16px; contain: content; }
  @keyframes sh { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
  /* Mobile optimizations */
  @media (max-width: 1024px) {
    .lift:hover { transform: none; box-shadow: none; }
    .chip:active { transform: scale(.95); }
  }
  @media (prefers-reduced-motion: reduce) {
    * { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; }
  }
`;

// ─── Constants (frozen to prevent mutation) ────────────────────────────
const F_IND = Object.freeze(['EdTech', 'HealthTech', 'FinTech', 'SaaS', 'AgriTech', 'CleanTech', 'LegalTech', 'HRTech']);
const F_EXP = Object.freeze(['Product', 'Fundraising', 'Growth', 'Technical', 'Legal', 'Marketing', 'Design', 'Sales']);
const F_YRS = Object.freeze(['1–3 yrs', '3–7 yrs', '7–15 yrs', '15+ yrs']);
const F_LOC = Object.freeze(['Karachi', 'Lahore', 'Islamabad', 'Remote', 'International']);

// ─── Performance Hooks ─────────────────────────────────────────────────
function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

// ─── Helper Functions ──────────────────────────────────────────────────
const initials = (name) => {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
};

// ✅ Shape mentor data with real scores + connection status
const shapeMentor = (row, connStatus) => {
  const p = row.profiles || {};
  const yearsExp = typeof row.years_experience === 'number' 
    ? row.years_experience 
    : parseInt(row.years_experience) || 0;

  const expBand = yearsExp >= 15 ? '15+ yrs'
    : yearsExp >= 7 ? '7–15 yrs'
    : yearsExp >= 3 ? '3–7 yrs'
    : '1–3 yrs';

  return {
    id: row.id,
    user_id: row.user_id,
    initials: initials(p.full_name),
    grad: 'from-indigo-500 to-violet-500',
    name: p.full_name || 'Mentor',
    title: row.current_role || 'Mentor',
    company: row.current_company || row.companies_worked?.[0] || '',
    location: p.location || 'Remote',
    industry: row.expertise_areas?.[0] || '',
    expertise: row.expertise_areas || [],
    yearsExp,
    expBand,
    mentorshipAreas: row.can_help_with || [],
    isProBono: row.is_pro_bono || false,
    hourlyRate: row.hourly_rate || null,
    matchScore: row._matchScore || 0,
    aiReason: row._matchReasons?.[0] || 'Mentorship match',
    avatar: p.avatar_url || null,
    bio: p.bio || '',
    experience: (row.companies_worked || []).map(c => ({ company: c })),
    sessionTypes: row.available_for || [],
    slots: [],
    connStatus: connStatus || null,
  };
};

// ─── Memoized UI Components ────────────────────────────────────────────
const MatchBar = memo(({ score }) => {
  const col = score >= 70 ? '#4f46e5' : score >= 50 ? '#7c3aed' : '#94a3b8';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden" role="progressbar" aria-valuenow={score} aria-valuemin={0} aria-valuemax={100}>
        <div style={{ width: `${score}%`, background: `linear-gradient(90deg,${col},${col}bb)` }} className="h-full rounded-full" />
      </div>
      <span className="text-xs font-bold tabular-nums" style={{ color: col }}>{score}%</span>
    </div>
  );
});

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
    <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border-2 transition-all ${checked ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 group-hover:border-indigo-300'}`} role="checkbox" aria-checked={checked}>
      {checked && <div className="w-2 h-2 rounded-sm bg-white" />}
    </div>
    <span className="text-sm text-slate-600 group-hover:text-indigo-600 transition-colors">{label}</span>
  </label>
));

// ─── Profile Panel (memoized + accessible) ─────────────────────────────
const ProfilePanel = memo(({ mentor, onClose, onRequest, onMessage }) => {
  const [tab, setTab] = useState('about');
  
  useEffect(() => {
    const handleEsc = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-40 flex" role="dialog" aria-modal="true" aria-labelledby="mentor-profile-title">
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="w-full max-w-lg bg-white h-full flex flex-col shadow-2xl slide-in dm overflow-hidden">
        <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <p id="mentor-profile-title" className="text-xs font-bold text-slate-400 uppercase tracking-widest">Mentor Profile</p>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-all min-h-[44px]" aria-label="Close profile">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto thin">
          <div className="px-6 pt-6 pb-5 border-b border-slate-100">
            <div className="flex items-start gap-4 mb-4">
              {mentor.avatar ? (
                <img src={mentor.avatar} alt={mentor.name} className="w-16 h-16 rounded-2xl object-cover flex-shrink-0" loading="lazy" />
              ) : (
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${mentor.grad} flex items-center justify-center text-white font-black text-xl ss flex-shrink-0`} aria-hidden="true">{mentor.initials}</div>
              )}
              <div className="flex-1 min-w-0">
                <h2 className="ss font-black text-slate-900 text-xl leading-tight">{mentor.name}</h2>
                <p className="text-sm text-slate-600 font-medium">{mentor.title}</p>
                {mentor.company && <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1"><Building2 className="w-3 h-3" aria-hidden="true" />{mentor.company}</p>}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                { label: 'Exp', v: `${mentor.yearsExp}yr`, sub: 'experience' },
                { label: 'Areas', v: mentor.mentorshipAreas.length || 0, sub: 'topics' },
                { label: 'Match', v: `${mentor.matchScore}%`, sub: 'AI score' },
              ].map((s, i) => (
                <div key={i} className="bg-slate-50 rounded-xl p-2.5 text-center">
                  <p className="ss font-black text-slate-900 text-base leading-none mb-0.5">{s.v}</p>
                  <p className="text-[10px] text-slate-400 leading-tight">{s.sub}</p>
                </div>
              ))}
            </div>
            {mentor.aiReason && (
              <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-xs text-indigo-700 leading-relaxed">
                <p className="font-bold flex items-center gap-1 mb-1"><Zap className="w-3 h-3 text-indigo-500" aria-hidden="true" />Why AI matched you</p>
                {mentor.aiReason}
              </div>
            )}
          </div>
          <div className="px-6 border-b border-slate-100">
            <div className="tab-bar" role="tablist">
              {['about', 'experience', 'topics'].map(t => (
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
                  {mentor.bio ? <p className="text-sm text-slate-700 leading-relaxed">{mentor.bio}</p> : <p className="text-sm text-slate-400 italic">No bio added yet.</p>}
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Details</p>
                  <div className="flex flex-wrap gap-2">
                    <span className="flex items-center gap-1.5 text-xs bg-slate-100 text-slate-600 px-3 py-1.5 rounded-full"><MapPin className="w-3 h-3" aria-hidden="true" />{mentor.location}</span>
                    <span className="flex items-center gap-1.5 text-xs bg-slate-100 text-slate-600 px-3 py-1.5 rounded-full"><Clock className="w-3 h-3" aria-hidden="true" />{mentor.yearsExp} yrs experience</span>
                  </div>
                </div>
                {mentor.expertise.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Expertise</p>
                    <div className="flex flex-wrap gap-1.5">
                      {mentor.expertise.map((e, i) => (
                        <span key={i} className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-full font-medium">{e}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            {tab === 'experience' && (
              <div role="tabpanel" id="panel-experience" aria-labelledby="tab-experience">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-5">Companies Worked</p>
                {mentor.experience.length > 0 ? (
                  <div className="space-y-4">
                    {mentor.experience.map((e, i) => (
                      <div key={i} className="exp-wrap">
                        <div className="exp-dot" aria-hidden="true" />
                        <p className="text-xs font-semibold text-indigo-600 flex items-center gap-1"><Building2 className="w-3 h-3" aria-hidden="true" />{e.company}</p>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-sm text-slate-400 italic">No company history added.</p>}
              </div>
            )}
            {tab === 'topics' && (
              <div role="tabpanel" id="panel-topics" aria-labelledby="tab-topics">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Mentorship Topics</p>
                {mentor.mentorshipAreas.length > 0 ? (
                  <div className="space-y-2">
                    {mentor.mentorshipAreas.map((t, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-indigo-50 border border-transparent rounded-xl transition-all">
                        <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0" aria-hidden="true"><CheckCircle className="w-3.5 h-3.5" /></div>
                        <p className="text-sm font-medium text-slate-700">{t}</p>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-sm text-slate-400 italic">No topics listed.</p>}
              </div>
            )}
          </div>
        </div>
        <div className="border-t border-slate-100 bg-white px-6 py-4 flex gap-3 flex-shrink-0">
          <button onClick={() => onMessage(mentor)}
            className="flex-1 flex items-center justify-center gap-2 border-2 border-slate-200 text-slate-700 hover:border-indigo-300 hover:text-indigo-600 py-3 rounded-xl text-sm font-bold transition-all min-h-[44px]">
            <MessageSquare className="w-4 h-4" aria-hidden="true" /> Message
          </button>
          {mentor.connStatus === 'accepted' ? (
            <div className="flex-1 flex items-center justify-center gap-2 bg-emerald-50 border-2 border-emerald-200 text-emerald-700 py-3 rounded-xl text-sm font-bold min-h-[44px]">
              <CheckCircle className="w-4 h-4" aria-hidden="true" /> Connected
            </div>
          ) : mentor.connStatus === 'pending' ? (
            <div className="flex-1 flex items-center justify-center gap-2 bg-amber-50 border-2 border-amber-200 text-amber-700 py-3 rounded-xl text-sm font-bold min-h-[44px]">
              <Clock className="w-4 h-4" aria-hidden="true" /> Pending
            </div>
          ) : (
            <button onClick={() => onRequest(mentor)}
              className="flex-1 flex items-center justify-center gap-2 g-ai text-white py-3 rounded-xl text-sm font-bold hover:opacity-90 transition-all shadow-lg shadow-indigo-200 min-h-[44px]">
              <Send className="w-4 h-4" aria-hidden="true" /> Request Mentorship
            </button>
          )}
        </div>
      </div>
    </div>
  );
});

// ─── Request Modal (memoized + accessible) ─────────────────────────────
const RequestModal = memo(({ mentor, userId, onClose }) => {
  const [note, setNote] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [alreadySent, setAlreadySent] = useState(false);
  const [error, setError] = useState('');

  const handleSend = useCallback(async () => {
    setSending(true);
    setError('');
    try {
      const result = await sendConnectionRequest(userId, mentor.user_id, 'mentor_request', note);
      if (result?.alreadySent) {
        setAlreadySent(true);
        return;
      }
      setSent(true);
    } catch (err) {
      setError(err.message || 'Failed to send request');
    } finally {
      setSending(false);
    }
  }, [note, userId, mentor.user_id]);

  useEffect(() => {
    const handleEsc = (e) => e.key === 'Escape' && !sent && !alreadySent && onClose();
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose, sent, alreadySent]);

  if (alreadySent) return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="already-sent-title">
      <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl modal-pop">
        <div className="w-16 h-16 bg-amber-50 border-2 border-amber-200 rounded-2xl flex items-center justify-center mx-auto mb-4" aria-hidden="true">
          <Clock className="w-8 h-8 text-amber-600" />
        </div>
        <h3 id="already-sent-title" className="ss font-black text-slate-900 text-xl mb-2">Already Requested</h3>
        <p className="text-sm text-slate-500 leading-relaxed mb-6">You've already sent a mentorship request to <strong className="text-slate-700">{mentor.name}</strong>. Wait for them to respond.</p>
        <button onClick={onClose} className="w-full py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-all min-h-[44px]">Close</button>
      </div>
    </div>
  );

  if (sent) return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="sent-title">
      <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl modal-pop">
        <div className="w-16 h-16 g-ai rounded-2xl flex items-center justify-center mx-auto mb-4" aria-hidden="true"><CheckCircle className="w-8 h-8 text-white" /></div>
        <h3 id="sent-title" className="ss font-black text-slate-900 text-xl mb-2">Request Sent!</h3>
        <p className="text-sm text-slate-500 leading-relaxed mb-6"><strong className="text-slate-700">{mentor.name}</strong> will respond within 48 hours.</p>
        <button onClick={onClose} className="w-full py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-all min-h-[44px]">Close</button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="request-title">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl modal-pop dm">
        <div className="flex items-center justify-between mb-6">
          <h3 id="request-title" className="ss font-black text-slate-900 text-xl">Request Mentorship</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-all min-h-[44px]" aria-label="Close">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>
        <div className="flex items-center gap-3 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl mb-6">
          {mentor.avatar ? (
            <img src={mentor.avatar} alt={mentor.name} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" loading="lazy" />
          ) : (
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${mentor.grad} flex items-center justify-center text-white font-bold ss flex-shrink-0`} aria-hidden="true">{mentor.initials}</div>
          )}
          <div className="flex-1"><p className="ss font-bold text-slate-900">{mentor.name}</p><p className="text-xs text-slate-500">{mentor.title}</p></div>
          <div className="text-right flex-shrink-0"><p className="text-xs font-bold text-indigo-600">{mentor.matchScore}% match</p></div>
        </div>
        {error && <p className="text-xs text-red-600 bg-red-50 p-3 rounded-xl mb-4" role="alert">{error}</p>}
        <div className="space-y-4 mb-6">
          <div>
            <label htmlFor="mentor-note" className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">What do you want to cover?</label>
            <textarea 
              id="mentor-note"
              rows={4} 
              value={note} 
              onChange={e => setNote(e.target.value)} 
              className="inp resize-none"
              placeholder="e.g. Preparing for pre-seed raise, product-market fit validation..."
              maxLength={500}
            />
          </div>
        </div>
        <button 
          onClick={handleSend} 
          disabled={sending}
          className="w-full g-ai text-white font-bold py-3.5 rounded-xl hover:opacity-90 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 disabled:opacity-50 min-h-[44px]"
          aria-busy={sending}
        >
          {sending ? <><Loader className="w-4 h-4 animate-spin" aria-hidden="true" />Sending…</> : <><Send className="w-4 h-4" aria-hidden="true" /> Send Request</>}
        </button>
      </div>
    </div>
  );
});

// ─── Message Modal (memoized + accessible) ─────────────────────────────
const MessageModal = memo(({ mentor, userId, onClose }) => {
  const navigate = useNavigate();
  const [msg, setMsg] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const handleSend = useCallback(async () => {
    if (!msg.trim()) return;
    setSending(true);
    setError('');
    try {
      const conversationId = await getOrCreateConversation(userId, mentor.user_id);
      await sendMessage(conversationId, userId, msg.trim());
      navigate('/messages');
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to open conversation');
      setSending(false);
    }
  }, [msg, userId, mentor.user_id, navigate, onClose]);

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
            {mentor.avatar ? (
              <img src={mentor.avatar} alt={mentor.name} className="w-10 h-10 rounded-xl object-cover" loading="lazy" />
            ) : (
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${mentor.grad} flex items-center justify-center text-white text-sm font-bold ss`} aria-hidden="true">{mentor.initials}</div>
            )}
            <div><p className="ss font-bold text-slate-900">{mentor.name}</p><p className="text-xs text-slate-400">{mentor.title}</p></div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-all min-h-[44px]" aria-label="Close">
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>
        {error && <p className="text-xs text-red-600 bg-red-50 p-3 rounded-xl mb-4" role="alert">{error}</p>}
        <textarea 
          rows={4} 
          value={msg} 
          onChange={e => setMsg(e.target.value)} 
          className="inp resize-none mb-4"
          placeholder={`Hi ${mentor.name.split(' ')[0]}, I came across your profile on ScaleScope...`}
          maxLength={1000}
          aria-label="Message"
        />
        <button 
          onClick={handleSend} 
          disabled={!msg.trim() || sending}
          className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all min-h-[44px]
            ${msg.trim() && !sending ? 'g-ai text-white shadow-lg shadow-indigo-200 hover:opacity-90' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
          aria-busy={sending}
        >
          {sending ? <><Loader className="w-4 h-4 animate-spin" aria-hidden="true" />Opening…</> : <><MessageSquare className="w-4 h-4" aria-hidden="true" /> Send & Open Chat</>}
        </button>
        <p className="text-xs text-slate-400 text-center mt-2">Your message will be sent, then you'll be redirected to Messages.</p>
      </div>
    </div>
  );
});

// ─── Mentor Card (memoized for performance) ────────────────────────────
const MentorCard = memo(({ m, onView, onRequest, onMessage }) => {
  return (
    <div 
      key={m.id}
      className={`lift bg-white rounded-2xl p-6 border shadow-sm ${m.matchScore >= 50 ? 'card-top border-indigo-200' : 'border-slate-100'}`}
      style={{ contain: 'content' }}
    >
      {m.matchScore >= 70 && (
        <div className="mb-4">
          <span className="g-ai text-white text-xs font-bold px-3 py-1 rounded-full inline-flex items-center gap-1">
            <Sparkles className="w-3 h-3" aria-hidden="true" /> Top AI Match
          </span>
        </div>
      )}
      <div className="flex flex-col md:flex-row gap-5">
        <div className="flex-shrink-0">
          {m.avatar ? (
            <img src={m.avatar} alt={m.name} className="w-14 h-14 rounded-2xl object-cover" loading="lazy" />
          ) : (
            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${m.grad} flex items-center justify-center text-white font-black text-lg ss`} aria-hidden="true">{m.initials}</div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
            <div>
              <h3 className="ss font-black text-slate-900 text-xl">{m.name}</h3>
              <p className="text-sm text-slate-600 font-medium">{m.title}</p>
              {m.company && <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1"><Building2 className="w-3 h-3" aria-hidden="true" />{m.company}</p>}
            </div>
            <div className="g-ai text-white px-3 py-1.5 rounded-xl flex items-center gap-1.5 flex-shrink-0">
              <Zap className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="font-bold text-sm">{m.matchScore}% Match</span>
            </div>
          </div>
          <div className="mb-3 max-w-xs"><MatchBar score={m.matchScore} /></div>
          <div className="flex flex-wrap items-center gap-4 mb-3">
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1"><Clock className="w-3.5 h-3.5" aria-hidden="true" />{m.yearsExp} yrs exp</span>
            <span className={`text-xs font-semibold flex items-center gap-1.5 ${m.sessionTypes.length > 0 ? 'text-green-600' : 'text-amber-600'}`}>
              <div className={m.sessionTypes.length > 0 ? 'dot-g' : 'dot-a'} aria-hidden="true" />{m.sessionTypes.length > 0 ? 'Available' : 'Check availability'}
            </span>
            {m.isProBono && (
              <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full">
                Free Mentorship
              </span>
            )}
            {!m.isProBono && m.hourlyRate && (
              <span className="text-xs font-semibold text-slate-500 flex items-center gap-1 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-full">
                ${m.hourlyRate}/hr
              </span>
            )}
            <span className="flex items-center gap-1 text-xs bg-slate-50 border border-slate-200 text-slate-500 px-2.5 py-1 rounded-full">
              <MapPin className="w-3 h-3" aria-hidden="true" />{m.location}
            </span>
          </div>
          {m.mentorshipAreas.length > 0 && (
            <div className="flex items-center gap-1.5 mb-3 flex-wrap">
              <span className="text-xs text-slate-400">Mentors on:</span>
              {m.mentorshipAreas.slice(0, 3).map(t => (
                <span key={t} className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-medium">{t}</span>
              ))}
              {m.mentorshipAreas.length > 3 && <span className="text-xs text-slate-400">+{m.mentorshipAreas.length - 3} more</span>}
            </div>
          )}
          {m.aiReason && (
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 mb-4 text-xs text-indigo-700 leading-relaxed">
              <Zap className="w-3 h-3 inline mr-1 text-indigo-500" aria-hidden="true" />
              <strong>Why AI matched you: </strong>{m.aiReason}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            <button onClick={() => onView(m)}
              className="flex items-center gap-1.5 border-2 border-slate-200 text-slate-700 hover:border-indigo-300 hover:text-indigo-600 px-4 py-2 rounded-xl text-sm font-bold transition-all min-h-[44px]">
              View Profile <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
            {m.connStatus === 'accepted' ? (
              <div className="flex items-center gap-1.5 bg-emerald-50 border-2 border-emerald-200 text-emerald-700 px-4 py-2 rounded-xl text-sm font-bold min-h-[44px]">
                <CheckCircle className="w-3.5 h-3.5" aria-hidden="true" /> Connected
              </div>
            ) : m.connStatus === 'pending' ? (
              <div className="flex items-center gap-1.5 bg-amber-50 border-2 border-amber-200 text-amber-700 px-4 py-2 rounded-xl text-sm font-bold min-h-[44px]">
                <Clock className="w-3.5 h-3.5" aria-hidden="true" /> Request Pending
              </div>
            ) : (
              <>
                <button onClick={() => onRequest(m)}
                  className="flex items-center gap-1.5 g-ai text-white px-4 py-2 rounded-xl text-sm font-bold hover:opacity-90 transition-all shadow-md shadow-indigo-200 min-h-[44px]">
                  <Send className="w-3.5 h-3.5" aria-hidden="true" /> Request Mentorship
                </button>
                <button onClick={() => onMessage(m)}
                  className="flex items-center gap-1.5 border-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50 px-4 py-2 rounded-xl text-sm font-bold transition-all min-h-[44px]">
                  <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" /> Message
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PAGE — OPTIMIZED VERSION
// ═══════════════════════════════════════════════════════════════════════════
export default function FindMentorsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchErr, setFetchErr] = useState('');

  const [query, setQuery] = useState('');
  const [fInd, setFInd] = useState([]);
  const [fExp, setFExp] = useState([]);
  const [fYrs, setFYrs] = useState([]);
  const [fLoc, setFLoc] = useState([]);
  const [sortBy, setSortBy] = useState('match');
  const [profile, setProfile] = useState(null);
  const [request, setRequest] = useState(null);
  const [message, setMessage] = useState(null);
  const [sbOpen, setSbOpen] = useState(false);

  // Debounce search input
  const debouncedQuery = useDebounce(query, 300);

  // ✅ Load mentors with real AI matching + connection status
  const loadMentors = useCallback(async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setFetchErr('');

    const timeoutId = setTimeout(() => {
      setFetchErr('Request timed out. Please check your connection.');
      setLoading(false);
    }, 10000);

    try {
      // 1. Get student profile for matching
      const studentProfile = await fetchStudentProfile(user.id);

      // 2. Fetch raw mentors from DB
      const rawData = await fetchMentors({ limit: 50 });

      // 3. Score and rank with matchingService (personalized to student profile)
      const ranked = rankMentors(rawData, studentProfile, { limit: 50 });

      // 4. Get connection status in ONE query (not N queries)
      const sentReqs = await fetchSentRequests(user.id);
      const statusMap = {};
      for (const req of sentReqs) {
        if (req.status === 'pending') statusMap[req.receiver_id] = 'pending';
        else if (req.status === 'accepted') statusMap[req.receiver_id] = 'accepted';
      }

      // 5. Shape into card format with real scores + status
      setMentors(ranked.map(m => shapeMentor(m, statusMap[m.user_id])));

    } catch (err) {
      console.error('[FindMentors] load:', err);
      const userMsg = err.message?.includes('row-level security')
        ? "Permission denied. Please ensure your profile is complete."
        : err.message?.includes('connection')
          ? "Network issue. Please check your connection."
          : "Failed to load mentors. Please try again.";
      setFetchErr(userMsg);
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  }, [user?.id]);

  // Initial load
  useEffect(() => {
    loadMentors();
  }, [loadMentors]);

  // Cleanup
  useEffect(() => {
    return () => {
      // Any pending timeouts will be cleared by individual components
    };
  }, []);

  // Filter toggle handlers (memoized)
  const tog = useCallback((arr, set, v) => {
    set(p => p.includes(v) ? p.filter(x => x !== v) : [...p, v]);
    setSbOpen(false);
  }, []);
  
  const clearAll = useCallback(() => { 
    setFInd([]); setFExp([]); setFYrs([]); setFLoc([]); setSbOpen(false); 
  }, []);
  
  const activeN = useMemo(() => 
    fInd.length + fExp.length + fYrs.length + fLoc.length,
    [fInd, fExp, fYrs, fLoc]
  );

  // ✅ Client-side filtering + sorting (memoized for performance)
  const filtered = useMemo(() => {
    const q = debouncedQuery.toLowerCase();
    
    return mentors
      .filter(m => {
        return (
          (!q || m.name.toLowerCase().includes(q)
            || m.expertise.some(e => e.toLowerCase().includes(q))
            || m.mentorshipAreas.some(a => a.toLowerCase().includes(q)))
          // Check ALL expertise areas, not just first
          && (!fInd.length || fInd.some(ind => m.expertise.some(e => e.toLowerCase().includes(ind.toLowerCase()))))
          && (!fExp.length || fExp.some(e => m.expertise.map(x => x.toLowerCase()).includes(e.toLowerCase())))
          && (!fYrs.length || fYrs.includes(m.expBand))
          // Use includes() for location, not exact match
          && (!fLoc.length || fLoc.some(loc => m.location.toLowerCase().includes(loc.toLowerCase())))
        );
      })
      // Real sort options that actually work
      .sort((a, b) =>
        sortBy === 'match' ? b.matchScore - a.matchScore
          : sortBy === 'experience' ? b.yearsExp - a.yearsExp
            : 0
      );
  }, [mentors, debouncedQuery, fInd, fExp, fYrs, fLoc, sortBy]);

  // Handlers for card actions (memoized)
  const handleView = useCallback((m) => setProfile(m), []);
  const handleRequest = useCallback((m) => setRequest(m), []);
  const handleMessage = useCallback((m) => setMessage(m), []);

  return (
    <div className="min-h-screen bg-[#f7f8fc] pt-20 pb-16 dm">
      <style>{STYLES}</style>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Back to dashboard */}
        <header className="mb-4 f0">
          <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600 transition-colors">
            <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Back to Dashboard
          </Link>
        </header>

        {/* Header */}
        <div className="mb-8 f0">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-500 uppercase tracking-widest bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full mb-3">
            <GraduationCap className="w-3.5 h-3.5" aria-hidden="true" /> Find a Mentor
          </span>
          <h1 className="ss text-3xl md:text-4xl font-black text-slate-900 mb-2">Find Your Perfect Mentor</h1>
          <p className="text-slate-500 text-sm max-w-xl">AI ranks mentors by how relevant they truly are for your stage, gaps, and goals.</p>
        </div>

        {/* AI Banner */}
        <div className="g-ai rounded-2xl p-5 mb-7 flex flex-col sm:flex-row items-start sm:items-center gap-4 f1">
          <div className="w-11 h-11 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0" aria-hidden="true">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="ss font-bold text-white text-base">AI-Powered Mentor Matching</p>
            <p className="text-indigo-200 text-xs mt-0.5">Results ranked by relevance to your startup stage and skill gaps.</p>
          </div>
          <span className="bg-white/15 border border-white/20 text-white text-xs font-bold px-3 py-1.5 rounded-xl flex-shrink-0" aria-live="polite">
            <Zap className="w-3.5 h-3.5 inline mr-1" aria-hidden="true" />{filtered.length} mentors
          </span>
        </div>

        {/* Error banner */}
        {fetchErr && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-2xl px-5 py-3 mb-6" role="alert">
            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" aria-hidden="true" />
            <p className="text-sm text-red-700 flex-1">{fetchErr}</p>
            <button onClick={loadMentors} className="flex items-center gap-1 text-xs font-bold text-red-600 hover:text-red-800 min-h-[44px]">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" /> Retry
            </button>
          </div>
        )}

        {/* Search + Sort */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5 f2">
          <div className="flex-1 flex items-center bg-white border border-slate-200 rounded-xl px-4 gap-2 shadow-sm">
            <Search className="w-4 h-4 text-slate-400 flex-shrink-0" aria-hidden="true" />
            <input 
              value={query} 
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by name, skill, industry…"
              className="flex-1 py-3 text-sm outline-none bg-transparent text-slate-700 placeholder-slate-400 dm"
              aria-label="Search mentors"
            />
          </div>
          <button 
            onClick={() => setSbOpen(v => !v)}
            className="lg:hidden flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-600 shadow-sm min-h-[44px]"
            aria-expanded={sbOpen}
            aria-controls="filters-sidebar"
          >
            <Filter className="w-4 h-4" aria-hidden="true" /> Filters
            {activeN > 0 && <span className="g-ai text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{activeN}</span>}
          </button>
          <select 
            value={sortBy} 
            onChange={e => setSortBy(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 outline-none shadow-sm dm min-h-[44px]"
            aria-label="Sort by"
          >
            <option value="match">Best Match</option>
            <option value="experience">Most Experienced</option>
          </select>
        </div>

        <p className="text-sm text-slate-500 mb-5" aria-live="polite">
          Showing <span className="font-bold text-slate-900">{filtered.length}</span> mentor{filtered.length !== 1 ? 's' : ''}
          {activeN > 0 && <span className="text-indigo-600 font-medium"> · {activeN} filter{activeN > 1 ? 's' : ''} active</span>}
        </p>

        <div className="flex gap-7 items-start">
          {/* Sidebar */}
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
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Industry</p>
              <div className="space-y-2">
                {F_IND.slice(0, 6).map(v => (
                  <CheckRow 
                    key={v} 
                    label={v} 
                    checked={fInd.includes(v)} 
                    onClick={() => tog(fInd, setFInd, v)} 
                  />
                ))}
              </div>
            </div>
            <div className="filter-sec">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Expertise</p>
              <div className="flex flex-wrap gap-1.5">
                {F_EXP.slice(0, 8).map(v => (
                  <Chip 
                    key={v} 
                    label={v} 
                    on={fExp.includes(v)} 
                    onClick={() => tog(fExp, setFExp, v)} 
                  />
                ))}
              </div>
            </div>
            <div className="filter-sec">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Experience</p>
              <div className="space-y-2">
                {F_YRS.map(v => (
                  <label key={v} className="flex items-center gap-2.5 cursor-pointer group" onClick={() => tog(fYrs, setFYrs, v)}>
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${fYrs.includes(v) ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 group-hover:border-indigo-300'}`} role="radio" aria-checked={fYrs.includes(v)}>
                      {fYrs.includes(v) && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <span className="text-sm text-slate-600 group-hover:text-indigo-600 transition-colors">{v}</span>
                  </label>
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
                    onClick={() => tog(fLoc, setFLoc, v)} 
                  />
                ))}
              </div>
            </div>
          </aside>

          {/* Cards */}
          <main className="flex-1 min-w-0 space-y-4" aria-label="Mentor results">
            {loading ? (
              <>
                <div className="shimmer h-48 rounded-2xl" />
                <div className="shimmer h-48 rounded-2xl" />
                <div className="shimmer h-48 rounded-2xl" />
              </>
            ) : filtered.length === 0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-slate-100">
                <p className="text-3xl mb-3" aria-hidden="true">🔍</p>
                <p className="ss font-bold text-slate-700 mb-1">No mentors found</p>
                <p className="text-sm text-slate-400 mb-4">
                  {mentors.length === 0 ? 'No mentors have joined yet. Check back soon!' : 'Try adjusting your search or filters.'}
                </p>
                {activeN > 0 && <button onClick={clearAll} className="text-sm text-indigo-600 font-semibold hover:underline">Clear all filters</button>}
              </div>
            ) : (
              filtered.map((m, i) => (
                <MentorCard
                  key={m.id}
                  m={m}
                  onView={handleView}
                  onRequest={handleRequest}
                  onMessage={handleMessage}
                />
              ))
            )}
          </main>
        </div>
      </div>

      {/* Modals - Lazy rendered */}
      {profile && (
        <ProfilePanel 
          mentor={profile} 
          onClose={() => setProfile(null)} 
          onRequest={m => { setProfile(null); setRequest(m); }} 
          onMessage={m => { setProfile(null); setMessage(m); }} 
        />
      )}
      {request && user && (
        <RequestModal 
          mentor={request} 
          userId={user.id} 
          onClose={() => setRequest(null)} 
        />
      )}
      {message && user && (
        <MessageModal 
          mentor={message} 
          userId={user.id} 
          onClose={() => setMessage(null)} 
        />
      )}
    </div>
  );
}