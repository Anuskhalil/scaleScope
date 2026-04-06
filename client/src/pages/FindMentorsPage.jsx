import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import {
  fetchMentors,
  sendConnectionRequest,
  getConnectionStatus,
  getOrCreateConversation,
} from '../services/studentService';
import {
  Search, Sparkles, Star, MessageSquare,
  Zap, CheckCircle, Users, Clock, X, GraduationCap,
  Award, ChevronRight, Filter, Building2,
  MapPin, Briefcase, Send, BookOpen, Loader,
  AlertTriangle, RefreshCw,
} from 'lucide-react';

// ─── Design system (unchanged from previous version) ─────────────────────
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800;900&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&display=swap');
  .ss  { font-family:'Syne',sans-serif; }
  .dm  { font-family:'DM Sans',sans-serif; }
  .lift { transition: transform .22s cubic-bezier(.22,.68,0,1.2), box-shadow .22s ease; }
  .lift:hover { transform: translateY(-3px); box-shadow: 0 16px 44px rgba(15,23,42,.09); }
  .g-ai { background: linear-gradient(135deg,#4f46e5,#7c3aed); }
  .card-top { border-color: #a5b4fc !important; background: linear-gradient(160deg,#fafafe 0%,#f5f3ff 100%); }
  .filter-sec { border-bottom:1px solid #e2e8f0; padding-bottom:18px; margin-bottom:18px; }
  .filter-sec:last-child { border-bottom:none; padding-bottom:0; margin-bottom:0; }
  .chip { display:inline-flex; align-items:center; padding:4px 11px; border-radius:9999px; font-size:11px; font-weight:600; cursor:pointer; border:1.5px solid #e2e8f0; background:#fff; color:#64748b; transition:all .14s; }
  .chip:hover { border-color:#a5b4fc; color:#4f46e5; }
  .chip.on    { background:#eef2ff; border-color:#a5b4fc; color:#4f46e5; }
  .star-fill { fill:#f59e0b; color:#f59e0b; }
  .star-off  { fill:#e2e8f0; color:#e2e8f0; }
  .dot-g { width:7px;height:7px;border-radius:50%;background:#22c55e;flex-shrink:0; }
  .dot-a { width:7px;height:7px;border-radius:50%;background:#f59e0b;flex-shrink:0; }
  .slide-in { animation: si .28s cubic-bezier(.32,.72,0,1) both; }
  @keyframes si { from{opacity:0;transform:translateX(28px)} to{opacity:1;transform:none} }
  .tab-bar { border-bottom:2px solid #e2e8f0; display:flex; overflow-x:auto; }
  .tab-bar::-webkit-scrollbar { display:none; }
  .tab { padding:10px 16px; font-size:13px; font-weight:600; color:#64748b; cursor:pointer; border-bottom:2px solid transparent; margin-bottom:-2px; transition:all .14s; white-space:nowrap; font-family:'DM Sans',sans-serif; }
  .tab.on { color:#4f46e5; border-bottom-color:#4f46e5; }
  .exp-wrap { position:relative; padding-left:22px; }
  .exp-wrap::before { content:''; position:absolute; left:7px; top:10px; width:1.5px; bottom:0; background:linear-gradient(to bottom,#a5b4fc 60%,transparent); }
  .exp-dot { position:absolute; left:1px; top:6px; width:12px; height:12px; border-radius:50%; border:2px solid #a5b4fc; background:#fff; }
  .slot { border:1.5px solid #e2e8f0; border-radius:10px; padding:8px 11px; }
  .slot.free  { border-color:#a7f3d0; background:#f0fdf4; color:#059669; }
  .slot.taken { border-color:#e2e8f0; background:#f8fafc; color:#94a3b8; text-decoration:line-through; }
  @keyframes fu { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }
  .f0{animation:fu .32s ease both} .f1{animation:fu .32s .06s ease both} .f2{animation:fu .32s .12s ease both} .f3{animation:fu .32s .18s ease both} .f4{animation:fu .32s .24s ease both}
  @keyframes mp { from{opacity:0;transform:scale(.95)} to{opacity:1;transform:scale(1)} }
  .modal-pop { animation:mp .22s cubic-bezier(.34,1.4,.64,1) both; }
  .inp { width:100%; padding:10px 14px; border:1.5px solid #e2e8f0; border-radius:12px; font-size:13px; outline:none; font-family:'DM Sans',sans-serif; transition:border-color .14s; background:#fff; }
  .inp:focus { border-color:#6366f1; }
  .thin::-webkit-scrollbar { width:4px; }
  .thin::-webkit-scrollbar-thumb { background:#e2e8f0; border-radius:4px; }
  .shimmer { background:linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%); background-size:200% 100%; animation:sh 1.4s infinite; border-radius:16px; }
  @keyframes sh { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
`;

const F_IND = ['EdTech','HealthTech','FinTech','SaaS','AgriTech','CleanTech','LegalTech','HRTech'];
const F_EXP = ['Product','Fundraising','Growth','Technical','Legal','Marketing','Design','Sales'];
const F_YRS = ['1–3 yrs','3–7 yrs','7–15 yrs','15+ yrs'];
const F_LOC = ['Karachi','Lahore','Islamabad','Remote','International'];

// ─── Shape a DB row into the card format ──────────────────────────────────
function shapementor(row) {
  const p = row.profiles || {};
  return {
    id:               row.id,
    user_id:          row.user_id,
    initials:         (p.full_name||'M').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase(),
    grad:             'from-indigo-500 to-violet-500',
    name:             p.full_name             || 'Mentor',
    title:            (row.current_role?.[0]) || 'Mentor',
    company:          (row.current_company?.[0]||row.companies_worked?.[0]) || '',
    location:         p.location              || 'Remote',
    industry:         row.expertise_areas?.[0] || '',
    yearsExp:         row.years_experience    || 0,
    expBand:          row.years_experience >= 15 ? '15+ yrs'
                    : row.years_experience >= 7  ? '7–15 yrs'
                    : row.years_experience >= 3  ? '3–7 yrs'
                    : '1–3 yrs',
    expertise:        row.expertise_areas     || [],
    mentorshipAreas:  row.can_help_with        || [],
    rating:           4.8,     // placeholder until we add a ratings table
    reviews:          0,
    sessions:         0,
    availability:     row.available_for?.length ? 'Available' : 'Check availability',
    availDot:         row.available_for?.length ? 'g' : 'a',
    matchScore:       75,      // placeholder — real AI score from studentAIService
    verified:         true,
    aiReason:         `${p.full_name||'This mentor'} has expertise in ${(row.expertise_areas||[]).slice(0,2).join(' and ')}.`,
    bio:              p.bio || '',
    achievements:     [],
    experience:       (row.companies_worked||[]).map(c=>({role:'',company:c,period:'',desc:''})),
    sessionTypes:     ['1:1 Video'],
    slots:            [],
  };
}

// ─── Stars helper ─────────────────────────────────────────────────────────
function Stars({ r }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1,2,3,4,5].map(i=>(
        <Star key={i} className={`w-3.5 h-3.5 ${i<=Math.round(r)?'star-fill':'star-off'}`}/>
      ))}
    </span>
  );
}

function MatchBar({ score }) {
  const col = score>=90?'#4f46e5':score>=80?'#7c3aed':'#94a3b8';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div style={{width:`${score}%`,background:`linear-gradient(90deg,${col},${col}bb)`}} className="h-full rounded-full"/>
      </div>
      <span className="text-xs font-bold tabular-nums" style={{color:col}}>{score}%</span>
    </div>
  );
}

function Chip({ label, on, onClick }) {
  return <button onClick={onClick} className={`chip ${on?'on':''}`}>{label}</button>;
}
function CheckRow({ label, checked, onClick }) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer group" onClick={onClick}>
      <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border-2 transition-all ${checked?'bg-indigo-600 border-indigo-600':'border-slate-300 group-hover:border-indigo-300'}`}>
        {checked&&<div className="w-2 h-2 rounded-sm bg-white"/>}
      </div>
      <span className="text-sm text-slate-600 group-hover:text-indigo-600 transition-colors">{label}</span>
    </label>
  );
}

// ─── Profile slide-over (unchanged UI) ───────────────────────────────────
function ProfilePanel({ mentor, onClose, onRequest, onMessage }) {
  const [tab, setTab] = useState('about');
  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose}/>
      <div className="w-full max-w-lg bg-white h-full flex flex-col shadow-2xl slide-in dm overflow-hidden">
        <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Mentor Profile</p>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-all"><X className="w-4 h-4 text-slate-500"/></button>
        </div>
        <div className="flex-1 overflow-y-auto thin">
          <div className="px-6 pt-6 pb-5 border-b border-slate-100">
            <div className="flex items-start gap-4 mb-4">
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${mentor.grad} flex items-center justify-center text-white font-black text-xl ss flex-shrink-0`}>{mentor.initials}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h2 className="ss font-black text-slate-900 text-xl leading-tight">{mentor.name}</h2>
                  {mentor.verified&&<CheckCircle className="w-4 h-4 text-indigo-500 flex-shrink-0"/>}
                </div>
                <p className="text-sm text-slate-600 font-medium">{mentor.title}</p>
                <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1"><Building2 className="w-3 h-3"/>{mentor.company}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[
                {label:'Exp', v:`${mentor.yearsExp}yr`, sub:'experience'},
                {label:'Areas', v:mentor.mentorshipAreas.length||0, sub:'topics'},
                {label:'Match', v:`${mentor.matchScore}%`, sub:'AI score'},
              ].map((s,i)=>(
                <div key={i} className="bg-slate-50 rounded-xl p-2.5 text-center">
                  <p className="ss font-black text-slate-900 text-base leading-none mb-0.5">{s.v}</p>
                  <p className="text-[10px] text-slate-400 leading-tight">{s.sub}</p>
                </div>
              ))}
            </div>
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 text-xs text-indigo-700 leading-relaxed">
              <p className="font-bold flex items-center gap-1 mb-1"><Zap className="w-3 h-3 text-indigo-500"/>Why AI matched you</p>
              {mentor.aiReason}
            </div>
          </div>
          <div className="px-6 border-b border-slate-100">
            <div className="tab-bar">
              {['about','experience','topics'].map(t=>(
                <button key={t} onClick={()=>setTab(t)} className={`tab ${tab===t?'on':''}`}>{t.charAt(0).toUpperCase()+t.slice(1)}</button>
              ))}
            </div>
          </div>
          <div className="px-6 py-6">
            {tab==='about'&&(
              <div className="space-y-5">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Bio</p>
                  {mentor.bio ? (
                    <p className="text-sm text-slate-700 leading-relaxed">{mentor.bio}</p>
                  ) : <p className="text-sm text-slate-400 italic">No bio added yet.</p>}
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Details</p>
                  <div className="flex flex-wrap gap-2">
                    <span className="flex items-center gap-1.5 text-xs bg-slate-100 text-slate-600 px-3 py-1.5 rounded-full"><MapPin className="w-3 h-3"/>{mentor.location}</span>
                    <span className="flex items-center gap-1.5 text-xs bg-slate-100 text-slate-600 px-3 py-1.5 rounded-full"><Clock className="w-3 h-3"/>{mentor.yearsExp} yrs experience</span>
                  </div>
                </div>
              </div>
            )}
            {tab==='experience'&&(
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-5">Companies Worked</p>
                {mentor.experience.length>0 ? (
                  <div className="space-y-4">
                    {mentor.experience.map((e,i)=>(
                      <div key={i} className="exp-wrap">
                        <div className="exp-dot"/>
                        <p className="text-xs font-semibold text-indigo-600 flex items-center gap-1"><Building2 className="w-3 h-3"/>{e.company}</p>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-sm text-slate-400 italic">No company history added.</p>}
              </div>
            )}
            {tab==='topics'&&(
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Mentorship Topics</p>
                {mentor.mentorshipAreas.length>0 ? (
                  <div className="space-y-2">
                    {mentor.mentorshipAreas.map((t,i)=>(
                      <div key={i} className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-indigo-50 border border-transparent rounded-xl transition-all">
                        <div className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0"><CheckCircle className="w-3.5 h-3.5"/></div>
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
          <button onClick={()=>onMessage(mentor)}
            className="flex-1 flex items-center justify-center gap-2 border-2 border-slate-200 text-slate-700 hover:border-indigo-300 hover:text-indigo-600 py-3 rounded-xl text-sm font-bold transition-all">
            <MessageSquare className="w-4 h-4"/> Message
          </button>
          <button onClick={()=>onRequest(mentor)}
            className="flex-1 flex items-center justify-center gap-2 g-ai text-white py-3 rounded-xl text-sm font-bold hover:opacity-90 transition-all shadow-lg shadow-indigo-200">
            <Send className="w-4 h-4"/> Request Mentorship
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Request Modal — now writes to DB ────────────────────────────────────
function RequestModal({ mentor, userId, onClose }) {
  const [note,      setNote]     = useState('');
  const [sending,   setSending]  = useState(false);
  const [sent,      setSent]     = useState(false);
  const [error,     setError]    = useState('');

  const handleSend = async () => {
    setSending(true); setError('');
    try {
      await sendConnectionRequest(userId, mentor.user_id, 'mentor_request', note);
      setSent(true);
    } catch (err) {
      setError(err.message || 'Failed to send request');
    } finally {
      setSending(false);
    }
  };

  if (sent) return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl modal-pop">
        <div className="w-16 h-16 g-ai rounded-2xl flex items-center justify-center mx-auto mb-4"><CheckCircle className="w-8 h-8 text-white"/></div>
        <h3 className="ss font-black text-slate-900 text-xl mb-2">Request Sent!</h3>
        <p className="text-sm text-slate-500 leading-relaxed mb-6"><strong className="text-slate-700">{mentor.name}</strong> will respond within 48 hours.</p>
        <button onClick={onClose} className="w-full py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-all">Close</button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl modal-pop dm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="ss font-black text-slate-900 text-xl">Request Mentorship</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-all"><X className="w-4 h-4 text-slate-500"/></button>
        </div>
        <div className="flex items-center gap-3 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl mb-6">
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${mentor.grad} flex items-center justify-center text-white font-bold ss flex-shrink-0`}>{mentor.initials}</div>
          <div className="flex-1"><p className="ss font-bold text-slate-900">{mentor.name}</p><p className="text-xs text-slate-500">{mentor.title}</p></div>
          <div className="text-right flex-shrink-0"><p className="text-xs font-bold text-indigo-600">{mentor.matchScore}% match</p></div>
        </div>
        {error && <p className="text-xs text-red-600 bg-red-50 p-3 rounded-xl mb-4">{error}</p>}
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">What do you want to cover?</label>
            <textarea rows={4} value={note} onChange={e=>setNote(e.target.value)} className="inp resize-none"
              placeholder="e.g. Preparing for pre-seed raise, product-market fit validation..."/>
          </div>
        </div>
        <button onClick={handleSend} disabled={sending}
          className="w-full g-ai text-white font-bold py-3.5 rounded-xl hover:opacity-90 transition-all shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 disabled:opacity-50">
          {sending ? <><Loader className="w-4 h-4 animate-spin"/>Sending…</> : <><Send className="w-4 h-4"/> Send Request</>}
        </button>
      </div>
    </div>
  );
}

// ─── Message Modal — creates conversation + navigates ────────────────────
function MessageModal({ mentor, userId, onClose }) {
  const navigate  = useNavigate();
  const [msg,     setMsg]     = useState('');
  const [sending, setSending] = useState(false);
  const [error,   setError]   = useState('');

  const handleSend = async () => {
    if (!msg.trim()) return;
    setSending(true); setError('');
    try {
      await getOrCreateConversation(userId, mentor.user_id);
      navigate('/messages');
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to open conversation');
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl modal-pop dm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${mentor.grad} flex items-center justify-center text-white text-sm font-bold ss`}>{mentor.initials}</div>
            <div><p className="ss font-bold text-slate-900">{mentor.name}</p><p className="text-xs text-slate-400">{mentor.title}</p></div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-all"><X className="w-4 h-4 text-slate-500"/></button>
        </div>
        {error && <p className="text-xs text-red-600 bg-red-50 p-3 rounded-xl mb-4">{error}</p>}
        <textarea rows={4} value={msg} onChange={e=>setMsg(e.target.value)} className="inp resize-none mb-4"
          placeholder={`Hi ${mentor.name.split(' ')[0]}, I came across your profile on ScalScope...`}/>
        <button onClick={handleSend} disabled={!msg.trim()||sending}
          className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all
            ${msg.trim()&&!sending?'g-ai text-white shadow-lg shadow-indigo-200 hover:opacity-90':'bg-slate-100 text-slate-400 cursor-not-allowed'}`}>
          {sending ? <><Loader className="w-4 h-4 animate-spin"/>Opening…</> : <><MessageSquare className="w-4 h-4"/> Open Chat</>}
        </button>
        <p className="text-xs text-slate-400 text-center mt-2">You'll be redirected to Messages to continue the conversation.</p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════
export default function FindMentorsPage() {
  const { user }  = useAuth();
  const navigate  = useNavigate();

  const [mentors,   setMentors]   = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [fetchErr,  setFetchErr]  = useState('');

  const [query,    setQuery]    = useState('');
  const [fInd,     setFInd]     = useState([]);
  const [fExp,     setFExp]     = useState([]);
  const [fYrs,     setFYrs]     = useState([]);
  const [fLoc,     setFLoc]     = useState([]);
  const [sortBy,   setSortBy]   = useState('match');
  const [profile,  setProfile]  = useState(null);
  const [request,  setRequest]  = useState(null);
  const [message,  setMessage]  = useState(null);
  const [sbOpen,   setSbOpen]   = useState(false);

  // ── Fetch mentors from DB ────────────────────────────────────────────
  useEffect(() => {
    loadMentors();
  }, []);

  const loadMentors = async () => {
    setLoading(true); setFetchErr('');
    try {
      const data = await fetchMentors({ limit: 30 });
      setMentors(data.map(shapementor));
    } catch (err) {
      setFetchErr(err.message || 'Failed to load mentors');
    } finally {
      setLoading(false);
    }
  };

  const tog = (arr, set, v) => set(p => p.includes(v) ? p.filter(x=>x!==v) : [...p,v]);
  const clearAll = () => { setFInd([]); setFExp([]); setFYrs([]); setFLoc([]); };
  const activeN = fInd.length + fExp.length + fYrs.length + fLoc.length;

  const filtered = mentors
    .filter(m => {
      const q = query.toLowerCase();
      return (
        (!q || m.name.toLowerCase().includes(q)
          || m.expertise.some(e=>e.toLowerCase().includes(q))
          || m.mentorshipAreas.some(a=>a.toLowerCase().includes(q)))
        && (!fInd.length || fInd.includes(m.industry))
        && (!fExp.length || fExp.some(e=>m.expertise.includes(e)))
        && (!fYrs.length || fYrs.includes(m.expBand))
        && (!fLoc.length || fLoc.includes(m.location))
      );
    })
    .sort((a,b) =>
      sortBy==='match'?b.matchScore-a.matchScore:
      sortBy==='rating'?b.rating-a.rating:
      b.sessions-a.sessions
    );

  return (
    <div className="min-h-screen bg-[#f7f8fc] pt-20 pb-16 dm">
      <style>{STYLES}</style>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-8 f0">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-500 uppercase tracking-widest bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full mb-3">
            <GraduationCap className="w-3.5 h-3.5"/> Find a Mentor
          </span>
          <h1 className="ss text-3xl md:text-4xl font-black text-slate-900 mb-2">Find Your Perfect Mentor</h1>
          <p className="text-slate-500 text-sm max-w-xl">AI ranks mentors by how relevant they truly are for your stage, gaps, and goals.</p>
        </div>

        {/* AI Banner */}
        <div className="g-ai rounded-2xl p-5 mb-7 flex flex-col sm:flex-row items-start sm:items-center gap-4 f1">
          <div className="w-11 h-11 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-5 h-5 text-white"/>
          </div>
          <div className="flex-1">
            <p className="ss font-bold text-white text-base">AI-Powered Mentor Matching</p>
            <p className="text-indigo-200 text-xs mt-0.5">Results ranked by relevance to your startup stage and skill gaps.</p>
          </div>
          <span className="bg-white/15 border border-white/20 text-white text-xs font-bold px-3 py-1.5 rounded-xl flex-shrink-0">
            <Zap className="w-3.5 h-3.5 inline mr-1"/>{filtered.length} mentors
          </span>
        </div>

        {/* Error banner */}
        {fetchErr && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-2xl px-5 py-3 mb-6">
            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0"/>
            <p className="text-sm text-red-700 flex-1">{fetchErr}</p>
            <button onClick={loadMentors} className="flex items-center gap-1 text-xs font-bold text-red-600 hover:text-red-800">
              <RefreshCw className="w-3.5 h-3.5"/> Retry
            </button>
          </div>
        )}

        {/* Search + Sort */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5 f2">
          <div className="flex-1 flex items-center bg-white border border-slate-200 rounded-xl px-4 gap-2 shadow-sm">
            <Search className="w-4 h-4 text-slate-400 flex-shrink-0"/>
            <input value={query} onChange={e=>setQuery(e.target.value)}
              placeholder="Search by name, skill, industry…"
              className="flex-1 py-3 text-sm outline-none bg-transparent text-slate-700 placeholder-slate-400 dm"/>
          </div>
          <button onClick={()=>setSbOpen(v=>!v)}
            className="lg:hidden flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-600 shadow-sm">
            <Filter className="w-4 h-4"/> Filters
            {activeN>0&&<span className="g-ai text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{activeN}</span>}
          </button>
          <select value={sortBy} onChange={e=>setSortBy(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 outline-none shadow-sm dm">
            <option value="match">Best Match</option>
            <option value="rating">Highest Rated</option>
            <option value="sessions">Most Sessions</option>
          </select>
        </div>

        <p className="text-sm text-slate-500 mb-5 f2">
          Showing <span className="font-bold text-slate-900">{filtered.length}</span> mentor{filtered.length!==1?'s':''}
          {activeN>0&&<span className="text-indigo-600 font-medium"> · {activeN} filter{activeN>1?'s':''} active</span>}
        </p>

        <div className="flex gap-7 items-start">
          {/* Sidebar */}
          <aside className={`w-60 flex-shrink-0 bg-white rounded-2xl border border-slate-100 shadow-sm p-5 ${sbOpen?'block':'hidden'} lg:block lg:sticky lg:top-24`}>
            <div className="flex items-center justify-between mb-5">
              <p className="ss font-bold text-slate-900 text-sm">Filters</p>
              {activeN>0&&<button onClick={clearAll} className="text-xs text-red-500 font-semibold hover:text-red-600 transition-colors">Clear all</button>}
            </div>
            <div className="filter-sec">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Industry</p>
              <div className="space-y-2">{F_IND.slice(0,6).map(v=><CheckRow key={v} label={v} checked={fInd.includes(v)} onClick={()=>tog(fInd,setFInd,v)}/>)}</div>
            </div>
            <div className="filter-sec">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Expertise</p>
              <div className="flex flex-wrap gap-1.5">{F_EXP.slice(0,8).map(v=><Chip key={v} label={v} on={fExp.includes(v)} onClick={()=>tog(fExp,setFExp,v)}/>)}</div>
            </div>
            <div className="filter-sec">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Experience</p>
              <div className="space-y-2">
                {F_YRS.map(v=>(
                  <label key={v} className="flex items-center gap-2.5 cursor-pointer group" onClick={()=>tog(fYrs,setFYrs,v)}>
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${fYrs.includes(v)?'bg-indigo-600 border-indigo-600':'border-slate-300 group-hover:border-indigo-300'}`}>
                      {fYrs.includes(v)&&<div className="w-1.5 h-1.5 rounded-full bg-white"/>}
                    </div>
                    <span className="text-sm text-slate-600 group-hover:text-indigo-600 transition-colors">{v}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="filter-sec">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Location</p>
              <div className="flex flex-wrap gap-1.5">{F_LOC.map(v=><Chip key={v} label={v} on={fLoc.includes(v)} onClick={()=>tog(fLoc,setFLoc,v)}/>)}</div>
            </div>
          </aside>

          {/* Cards */}
          <div className="flex-1 min-w-0 space-y-4">
            {loading ? (
              [1,2,3].map(i=><div key={i} className="shimmer h-48"/>)
            ) : filtered.length===0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-slate-100">
                <p className="text-3xl mb-3">🔍</p>
                <p className="ss font-bold text-slate-700 mb-1">No mentors found</p>
                <p className="text-sm text-slate-400 mb-4">
                  {mentors.length===0 ? 'No mentors have joined yet. Check back soon!' : 'Try adjusting your search or filters.'}
                </p>
                {activeN>0&&<button onClick={clearAll} className="text-sm text-indigo-600 font-semibold hover:underline">Clear all filters</button>}
              </div>
            ) : filtered.map((m, i)=>(
              <div key={m.id}
                className={`lift bg-white rounded-2xl p-6 border shadow-sm f${Math.min(i,4)} ${m.matchScore>=90?'card-top border-indigo-200':'border-slate-100'}`}>
                {m.matchScore>=90&&(
                  <div className="mb-4"><span className="g-ai text-white text-xs font-bold px-3 py-1 rounded-full inline-flex items-center gap-1"><Sparkles className="w-3 h-3"/> Top AI Match</span></div>
                )}
                <div className="flex flex-col md:flex-row gap-5">
                  <div className="flex-shrink-0">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${m.grad} flex items-center justify-center text-white font-black text-lg ss`}>{m.initials}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="ss font-black text-slate-900 text-xl">{m.name}</h3>
                          {m.verified&&<CheckCircle className="w-4 h-4 text-indigo-500 flex-shrink-0"/>}
                        </div>
                        <p className="text-sm text-slate-600 font-medium">{m.title}</p>
                        {m.company&&<p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1"><Building2 className="w-3 h-3"/>{m.company}</p>}
                      </div>
                      <div className="g-ai text-white px-3 py-1.5 rounded-xl flex items-center gap-1.5 flex-shrink-0">
                        <Zap className="w-3.5 h-3.5"/>
                        <span className="font-bold text-sm">{m.matchScore}% Match</span>
                      </div>
                    </div>
                    <div className="mb-3 max-w-xs"><MatchBar score={m.matchScore}/></div>
                    <div className="flex flex-wrap items-center gap-4 mb-3">
                      <span className="text-xs font-semibold text-slate-500 flex items-center gap-1"><Clock className="w-3.5 h-3.5"/>{m.yearsExp} yrs exp</span>
                      <span className={`text-xs font-semibold flex items-center gap-1.5 ${m.availDot==='g'?'text-green-600':'text-amber-600'}`}>
                        <div className={m.availDot==='g'?'dot-g':'dot-a'}/>{m.availability}
                      </span>
                      <span className="flex items-center gap-1 text-xs bg-slate-50 border border-slate-200 text-slate-500 px-2.5 py-1 rounded-full">
                        <MapPin className="w-3 h-3"/>{m.location}
                      </span>
                    </div>
                    {m.mentorshipAreas.length>0&&(
                      <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                        <span className="text-xs text-slate-400">Mentors on:</span>
                        {m.mentorshipAreas.slice(0,3).map(t=>(
                          <span key={t} className="text-xs bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-medium">{t}</span>
                        ))}
                        {m.mentorshipAreas.length>3&&<span className="text-xs text-slate-400">+{m.mentorshipAreas.length-3} more</span>}
                      </div>
                    )}
                    <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 mb-4 text-xs text-indigo-700 leading-relaxed">
                      <Zap className="w-3 h-3 inline mr-1 text-indigo-500"/>
                      <strong>Why AI matched you: </strong>{m.aiReason}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={()=>setProfile(m)}
                        className="flex items-center gap-1.5 border-2 border-slate-200 text-slate-700 hover:border-indigo-300 hover:text-indigo-600 px-4 py-2 rounded-xl text-sm font-bold transition-all">
                        View Profile <ChevronRight className="w-3.5 h-3.5"/>
                      </button>
                      <button onClick={()=>setRequest(m)}
                        className="flex items-center gap-1.5 g-ai text-white px-4 py-2 rounded-xl text-sm font-bold hover:opacity-90 transition-all shadow-md shadow-indigo-200">
                        <Send className="w-3.5 h-3.5"/> Request Mentorship
                      </button>
                      <button onClick={()=>setMessage(m)}
                        className="flex items-center gap-1.5 border-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50 px-4 py-2 rounded-xl text-sm font-bold transition-all">
                        <MessageSquare className="w-3.5 h-3.5"/> Message
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {profile&&<ProfilePanel mentor={profile} onClose={()=>setProfile(null)} onRequest={m=>{setProfile(null);setRequest(m);}} onMessage={m=>{setProfile(null);setMessage(m);}}/>}
      {request&&user&&<RequestModal mentor={request} userId={user.id} onClose={()=>setRequest(null)}/>}
      {message&&user&&<MessageModal mentor={message} userId={user.id} onClose={()=>setMessage(null)}/>}
    </div>
  );
}