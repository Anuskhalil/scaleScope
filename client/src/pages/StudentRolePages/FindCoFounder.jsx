import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import {
  fetchCoFounders,
  sendConnectionRequest,
  getOrCreateConversation,
} from '../../services/studentService';
import {
  Search, Sparkles, Zap, CheckCircle, Clock, X,
  Award, MessageSquare, Heart, UserPlus,
  Lightbulb, ChevronRight, Filter, MapPin, Briefcase,
  Send, Code, BarChart2, Palette, DollarSign,
  Brain, Rocket, Users, BookOpen, Building2,
  Loader, AlertTriangle, RefreshCw,
} from 'lucide-react';

// ─── Design system (unchanged) ───────────────────────────────────────────
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800;900&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&display=swap');
  .ss { font-family:'Syne',sans-serif; }
  .dm { font-family:'DM Sans',sans-serif; }
  .lift { transition: transform .22s cubic-bezier(.22,.68,0,1.2), box-shadow .22s ease; }
  .lift:hover { transform: translateY(-3px); box-shadow: 0 16px 44px rgba(109,40,217,.10); }
  .g-vi { background: linear-gradient(135deg,#7c3aed,#6366f1); }
  .comp-fill { background: linear-gradient(90deg,#7c3aed,#6366f1); }
  .card-top { border-color: #c4b5fd !important; background: linear-gradient(160deg,#fdf9ff 0%,#f5f3ff 100%); }
  .filter-sec { border-bottom:1px solid #e2e8f0; padding-bottom:18px; margin-bottom:18px; }
  .filter-sec:last-child { border-bottom:none; padding-bottom:0; margin-bottom:0; }
  .chip { display:inline-flex; align-items:center; padding:4px 11px; border-radius:9999px; font-size:11px; font-weight:600; cursor:pointer; border:1.5px solid #e2e8f0; background:#fff; color:#64748b; transition:all .14s; }
  .chip:hover { border-color:#c4b5fd; color:#7c3aed; }
  .chip.on    { background:#f5f3ff; border-color:#c4b5fd; color:#7c3aed; }
  .dot-g { width:7px;height:7px;border-radius:50%;background:#22c55e;flex-shrink:0; }
  .dot-a { width:7px;height:7px;border-radius:50%;background:#f59e0b;flex-shrink:0; }
  .int-tag { background:#f5f3ff; color:#6d28d9; border:1.5px solid #ede9fe; font-size:11px; font-weight:600; padding:3px 10px; border-radius:9999px; }
  .sk-tag  { background:#f5f3ff; color:#7c3aed; border:1.5px solid #ddd6fe; font-size:11px; font-weight:600; padding:3px 10px; border-radius:9999px; }
  .slide-in { animation: si .28s cubic-bezier(.32,.72,0,1) both; }
  @keyframes si { from{opacity:0;transform:translateX(28px)} to{opacity:1;transform:none} }
  .tab-bar { border-bottom:2px solid #e2e8f0; display:flex; overflow-x:auto; }
  .tab-bar::-webkit-scrollbar { display:none; }
  .tab { padding:10px 16px; font-size:13px; font-weight:600; color:#64748b; cursor:pointer; border-bottom:2px solid transparent; margin-bottom:-2px; transition:all .14s; white-space:nowrap; font-family:'DM Sans',sans-serif; }
  .tab.on { color:#7c3aed; border-bottom-color:#7c3aed; }
  @keyframes mp { from{opacity:0;transform:scale(.95)} to{opacity:1;transform:scale(1)} }
  .modal-pop { animation:mp .22s cubic-bezier(.34,1.4,.64,1) both; }
  .inp { width:100%; padding:10px 14px; border:1.5px solid #e2e8f0; border-radius:12px; font-size:13px; outline:none; font-family:'DM Sans',sans-serif; transition:border-color .14s; background:#fff; }
  .inp:focus { border-color:#7c3aed; }
  .thin::-webkit-scrollbar { width:4px; }
  .thin::-webkit-scrollbar-thumb { background:#e2e8f0; border-radius:4px; }
  .comp-row { margin-bottom:8px; }
  .comp-track { height:5px; background:#ede9fe; border-radius:4px; overflow:hidden; }
  .comp-bar-fill { height:100%; background:linear-gradient(90deg,#7c3aed,#6366f1); border-radius:4px; }
  .badge-idea  { background:#f0fdf4; color:#16a34a; border:1.5px solid #bbf7d0; }
  .badge-mvp   { background:#eff6ff; color:#2563eb; border:1.5px solid #bfdbfe; }
  .badge-built { background:#fff7ed; color:#ea580c; border:1.5px solid #fed7aa; }
  @keyframes fu { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }
  .f0{animation:fu .32s ease both} .f1{animation:fu .32s .06s ease both} .f2{animation:fu .32s .12s ease both} .f3{animation:fu .32s .18s ease both} .f4{animation:fu .32s .24s ease both}
  .shimmer { background:linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%); background-size:200% 100%; animation:sh 1.4s infinite; border-radius:16px; }
  @keyframes sh { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
  .no-scroll::-webkit-scrollbar{display:none} .no-scroll{-ms-overflow-style:none;scrollbar-width:none}
`;

const F_SKILLS = ['React','Node.js','AI/ML','Python','iOS/Swift','Design/Figma','Marketing','Finance','Product','Data','DevOps','Sales'];
const F_IND    = ['EdTech','HealthTech','FinTech','SaaS','AgriTech','CleanTech','LegalTech','HRTech','E-Commerce','AI / ML'];
const F_STAGE  = ['Just an Idea','Pre-MVP','Building MVP','MVP Built','Revenue'];
const F_LOC    = ['Karachi','Lahore','Islamabad','Remote','International'];
const F_AVAIL  = ['Full-time Ready','Part-time','Flexible / Open','After April'];

// ─── Shape DB row into card format ────────────────────────────────────────
function shapeCofounder(row) {
  const p    = row.profiles || {};
  const name = p.full_name || 'Founder';
  const skills = (row.skills_with_levels || []).map(s => s.skill).filter(Boolean);
  const fallbackSkills = Array.isArray(p.skills) ? p.skills : [];

  return {
    id:           row.id,
    user_id:      row.user_id,
    initials:     name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase(),
    grad:         'from-violet-500 to-indigo-600',
    name,
    role:         skills.length ? skills.slice(0,2).join(' + ') + ' Developer' : 'Student Founder',
    tagline:      'Looking for startup partner',
    location:     p.location || 'Remote',
    locDot:       'g',
    availability: row.commitment_level?.includes('Full') ? 'Full-time Ready' : row.commitment_level ? 'Part-time' : 'Flexible / Open',
    availDot:     row.commitment_level?.includes('Full') ? 'g' : 'a',
    startupStage: row.startup_stage || 'Just an Idea',
    stageClass:   row.startup_stage?.includes('MVP Built') ? 'badge-built'
                : row.startup_stage?.includes('MVP')       ? 'badge-mvp'
                : 'badge-idea',
    industry:     row.industry || p.interests?.[0] || 'EdTech',
    skills:       skills.length ? skills : fallbackSkills,
    interests:    row.interests || p.interests || [],
    exp:          row.current_year ? `Year ${row.current_year} student` : 'Student',
    edu:          row.university || row.degree || '',
    commitment:   row.commitment_level || 'Open to discuss',
    matchScore:   70, // placeholder — enhanced by AI service
    verified:     false,
    badge:        skills.some(s=>['React','Node.js','Python','AI/ML'].includes(s)) ? '⚡ Technical'
                : skills.some(s=>['Marketing','Sales','Operations'].includes(s))   ? '📈 Business'
                : '💡 Idea Stage',
    bio:          p.bio || row.startup_idea_description || '',
    aiReason:     `${name} is looking for a co-founder with skills that complement theirs.`,
    compatScore:  [
      {label:'Skill Complement', val: 75},
      {label:'Vision Alignment',  val: 70},
      {label:'Work Style Match',  val: 68},
      {label:'Commitment Level',  val: row.commitment_level?.includes('Full') ? 90 : 60},
    ],
    projects:     [],
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────
function Chip({ label, on, onClick }) {
  return <button onClick={onClick} className={`chip ${on?'on':''}`}>{label}</button>;
}
function CheckRow({ label, checked, onClick }) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer group" onClick={onClick}>
      <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border-2 transition-all ${checked?'bg-violet-600 border-violet-600':'border-slate-300 group-hover:border-violet-300'}`}>
        {checked&&<div className="w-2 h-2 rounded-sm bg-white"/>}
      </div>
      <span className="text-sm text-slate-600 group-hover:text-violet-600 transition-colors">{label}</span>
    </label>
  );
}
function RadioRow({ label, checked, onClick }) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer group" onClick={onClick}>
      <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${checked?'bg-violet-600 border-violet-600':'border-slate-300 group-hover:border-violet-300'}`}>
        {checked&&<div className="w-1.5 h-1.5 rounded-full bg-white"/>}
      </div>
      <span className="text-sm text-slate-600 group-hover:text-violet-600 transition-colors">{label}</span>
    </label>
  );
}
function CompatBars({ scores }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
      {scores.map((c,i)=>(
        <div key={i}>
          <div className="flex justify-between text-xs mb-1"><span className="text-slate-500">{c.label}</span><span className="font-bold text-slate-700">{c.val}%</span></div>
          <div className="comp-track"><div className="comp-bar-fill" style={{width:`${c.val}%`}}/></div>
        </div>
      ))}
    </div>
  );
}

// ─── Profile Panel (unchanged UI) ────────────────────────────────────────
function ProfilePanel({ cf, onClose, onConnect, onMessage }) {
  const [tab, setTab] = useState('about');
  return (
    <div className="fixed inset-0 z-40 flex">
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose}/>
      <div className="w-full max-w-lg bg-white h-full flex flex-col shadow-2xl slide-in dm overflow-hidden">
        <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Co-Founder Profile</p>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-all"><X className="w-4 h-4 text-slate-500"/></button>
        </div>
        <div className="flex-1 overflow-y-auto thin">
          <div className="px-6 pt-6 pb-5 border-b border-slate-100">
            <div className="flex items-start gap-4 mb-4">
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${cf.grad} flex items-center justify-center text-white font-black text-xl ss flex-shrink-0`}>{cf.initials}</div>
              <div className="flex-1 min-w-0">
                <h2 className="ss font-black text-slate-900 text-xl leading-tight mb-0.5">{cf.name}</h2>
                <p className="text-sm font-semibold text-slate-600">{cf.role}</p>
                <p className="text-xs text-slate-400 mt-0.5 italic">{cf.tagline}</p>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2 mb-4">
              {[
                {label:'Match', v:`${cf.matchScore}%`, sub:'AI score'},
                {label:'Avail', v:cf.availDot==='g'?'Now':'Soon', sub:'availability'},
                {label:'Stage', v:cf.startupStage.split(' ').slice(-1)[0], sub:'startup stage'},
                {label:'Edu',   v:cf.edu?cf.edu.split(' ')[0]:'—', sub:'university'},
              ].map((s,i)=>(
                <div key={i} className="bg-slate-50 rounded-xl p-2.5 text-center">
                  <p className="ss font-black text-slate-900 text-base leading-none mb-0.5">{s.v}</p>
                  <p className="text-[10px] text-slate-400 leading-tight">{s.sub}</p>
                </div>
              ))}
            </div>
            <div className="bg-violet-50 border border-violet-100 rounded-xl p-3 text-xs text-violet-700 leading-relaxed">
              <p className="font-bold flex items-center gap-1 mb-1"><Zap className="w-3 h-3 text-violet-500"/> Why AI matched you</p>
              {cf.aiReason}
            </div>
          </div>
          <div className="px-6 border-b border-slate-100">
            <div className="tab-bar">
              {['about','skills','compatibility'].map(t=>(
                <button key={t} onClick={()=>setTab(t)} className={`tab ${tab===t?'on':''}`}>{t.charAt(0).toUpperCase()+t.slice(1)}</button>
              ))}
            </div>
          </div>
          <div className="px-6 py-6">
            {tab==='about'&&(
              <div className="space-y-5">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Bio</p>
                  {cf.bio ? <p className="text-sm text-slate-700 leading-relaxed">{cf.bio}</p> : <p className="text-sm text-slate-400 italic">No bio added yet.</p>}
                </div>
                {cf.interests.length>0&&(
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Startup Interests</p>
                    <div className="flex flex-wrap gap-2">{cf.interests.map(t=><span key={t} className="int-tag">{t}</span>)}</div>
                  </div>
                )}
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Details</p>
                  <div className="space-y-2">
                    {[
                      {icon:<MapPin className="w-3.5 h-3.5"/>, val:cf.location},
                      {icon:<Clock className="w-3.5 h-3.5"/>,  val:cf.exp},
                      {icon:<Award className="w-3.5 h-3.5"/>,  val:cf.edu},
                      {icon:<Briefcase className="w-3.5 h-3.5"/>, val:cf.commitment},
                      {icon:<Rocket className="w-3.5 h-3.5"/>, val:`Stage: ${cf.startupStage}`},
                    ].filter(d=>d.val).map((d,i)=>(
                      <div key={i} className="flex items-center gap-2.5 text-sm text-slate-600">
                        <span className="text-violet-400 flex-shrink-0">{d.icon}</span>{d.val}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {tab==='skills'&&(
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Skills</p>
                {cf.skills.length>0 ? (
                  <div className="flex flex-wrap gap-2 mb-6">{cf.skills.map(s=><span key={s} className="sk-tag">{s}</span>)}</div>
                ) : <p className="text-sm text-slate-400 italic mb-4">No skills listed.</p>}
              </div>
            )}
            {tab==='compatibility'&&(
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-5">Compatibility Breakdown</p>
                <CompatBars scores={cf.compatScore}/>
                <div className="mt-5 p-4 bg-violet-50 border border-violet-100 rounded-xl">
                  <p className="text-xs font-bold text-violet-700 mb-1">Overall AI Score</p>
                  <p className="ss font-black text-violet-900 text-2xl">{cf.matchScore}%</p>
                  <p className="text-xs text-violet-600 mt-1">Based on skills, vision, work style & commitment alignment.</p>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="sticky bottom-0 border-t border-slate-100 bg-white px-6 py-4 flex gap-3 flex-shrink-0">
          <button onClick={()=>onMessage(cf)} className="flex-1 flex items-center justify-center gap-2 border-2 border-slate-200 text-slate-700 hover:border-violet-300 hover:text-violet-600 py-3 rounded-xl text-sm font-bold transition-all">
            <MessageSquare className="w-4 h-4"/> Message
          </button>
          <button onClick={()=>onConnect(cf)} className="flex-1 flex items-center justify-center gap-2 g-vi text-white py-3 rounded-xl text-sm font-bold hover:opacity-90 transition-all shadow-lg shadow-violet-200">
            <UserPlus className="w-4 h-4"/> Connect
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Connect Modal — writes to DB ─────────────────────────────────────────
function ConnectModal({ cf, userId, onClose }) {
  const [idea,    setIdea]    = useState('');
  const [why,     setWhy]     = useState('');
  const [sending, setSending] = useState(false);
  const [sent,    setSent]    = useState(false);
  const [error,   setError]   = useState('');

  const handleSend = async () => {
    setSending(true); setError('');
    try {
      const message = [idea&&`Idea: ${idea}`, why&&`Why: ${why}`].filter(Boolean).join('\n');
      await sendConnectionRequest(userId, cf.user_id, 'cofounder_request', message);
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
        <div className="w-16 h-16 g-vi rounded-2xl flex items-center justify-center mx-auto mb-4"><CheckCircle className="w-8 h-8 text-white"/></div>
        <h3 className="ss font-black text-slate-900 text-xl mb-2">Request Sent!</h3>
        <p className="text-sm text-slate-500 leading-relaxed mb-6"><strong className="text-slate-700">{cf.name}</strong> will receive your co-founder request.</p>
        <button onClick={onClose} className="w-full py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-all">Done</button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl modal-pop dm">
        <div className="flex items-center justify-between mb-6">
          <h3 className="ss font-black text-slate-900 text-xl">Send Co-Founder Request</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-all"><X className="w-4 h-4 text-slate-500"/></button>
        </div>
        <div className="flex items-center gap-3 p-4 bg-violet-50 border border-violet-100 rounded-2xl mb-6">
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${cf.grad} flex items-center justify-center text-white font-bold ss flex-shrink-0`}>{cf.initials}</div>
          <div className="flex-1"><p className="ss font-bold text-slate-900">{cf.name}</p><p className="text-xs text-slate-500">{cf.role}</p></div>
          <div className="g-vi text-white text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0">{cf.matchScore}% match</div>
        </div>
        {error&&<p className="text-xs text-red-600 bg-red-50 p-3 rounded-xl mb-4">{error}</p>}
        <div className="space-y-4 mb-5">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Your idea in one line</label>
            <input type="text" className="inp" value={idea} onChange={e=>setIdea(e.target.value)} placeholder="e.g. AI-powered personalised learning for Pakistan's students"/>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Why do you see them as your co-founder?</label>
            <textarea rows={3} className="inp resize-none" value={why} onChange={e=>setWhy(e.target.value)} placeholder="Reference their specific background..."/>
          </div>
        </div>
        <div className="bg-violet-50 border border-violet-100 rounded-xl p-3 mb-5 text-xs text-violet-700 leading-relaxed">
          <strong className="flex items-center gap-1 mb-1"><Zap className="w-3 h-3"/> AI Tip:</strong>
          Lead with why your domain insight is the missing piece they need.
        </div>
        <button onClick={handleSend} disabled={sending}
          className="w-full g-vi text-white font-bold py-3.5 rounded-xl hover:opacity-90 transition-all shadow-lg shadow-violet-200 flex items-center justify-center gap-2 disabled:opacity-50">
          {sending ? <><Loader className="w-4 h-4 animate-spin"/>Sending…</> : <><UserPlus className="w-4 h-4"/> Send Co-Founder Request</>}
        </button>
      </div>
    </div>
  );
}

// ─── Message Modal — creates conversation ────────────────────────────────
function MessageModal({ cf, userId, onClose }) {
  const navigate  = useNavigate();
  const [msg,     setMsg]     = useState('');
  const [sending, setSending] = useState(false);
  const [error,   setError]   = useState('');

  const handleSend = async () => {
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
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl modal-pop dm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${cf.grad} flex items-center justify-center text-white text-sm font-bold ss`}>{cf.initials}</div>
            <div><p className="ss font-bold text-slate-900">{cf.name}</p><p className="text-xs text-slate-400">{cf.role}</p></div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-all"><X className="w-4 h-4 text-slate-500"/></button>
        </div>
        {error&&<p className="text-xs text-red-600 bg-red-50 p-3 rounded-xl mb-4">{error}</p>}
        <textarea rows={4} value={msg} onChange={e=>setMsg(e.target.value)} className="inp resize-none mb-4"
          placeholder={`Hi ${cf.name.split(' ')[0]}, I came across your profile on ScalScope...`}/>
        <button onClick={handleSend} disabled={!msg.trim()||sending}
          className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all
            ${msg.trim()&&!sending?'g-vi text-white shadow-lg shadow-violet-200 hover:opacity-90':'bg-slate-100 text-slate-400 cursor-not-allowed'}`}>
          {sending ? <><Loader className="w-4 h-4 animate-spin"/>Opening…</> : <><MessageSquare className="w-4 h-4"/> Open Chat</>}
        </button>
        <p className="text-xs text-slate-400 text-center mt-2">You'll be redirected to Messages.</p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════
export default function FindCoFoundersPage() {
  const { user }    = useAuth();
  const navigate    = useNavigate();

  const [founders,  setFounders]  = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [fetchErr,  setFetchErr]  = useState('');

  const [query,    setQuery]    = useState('');
  const [fSkills,  setFSkills]  = useState([]);
  const [fInd,     setFInd]     = useState([]);
  const [fStage,   setFStage]   = useState('');
  const [fLoc,     setFLoc]     = useState([]);
  const [fAvail,   setFAvail]   = useState('');
  const [sortBy,   setSortBy]   = useState('match');
  const [profile,  setProfile]  = useState(null);
  const [connect,  setConnect]  = useState(null);
  const [message,  setMessage]  = useState(null);
  const [saved,    setSaved]    = useState(new Set());
  const [sbOpen,   setSbOpen]   = useState(false);

  useEffect(() => { loadFounders(); }, []);

  const loadFounders = async () => {
    setLoading(true); setFetchErr('');
    try {
      const data = await fetchCoFounders({ limit: 30 });
      // Exclude self
      const selfId = user?.id;
      setFounders(data.filter(r => r.user_id !== selfId).map(shapeCofounder));
    } catch (err) {
      setFetchErr(err.message || 'Failed to load co-founders');
    } finally {
      setLoading(false);
    }
  };

  const togArr = (arr, set, v) => set(p => p.includes(v) ? p.filter(x=>x!==v) : [...p,v]);
  const clearAll = () => { setFSkills([]); setFInd([]); setFStage(''); setFLoc([]); setFAvail(''); };
  const activeN = fSkills.length + fInd.length + (fStage?1:0) + fLoc.length + (fAvail?1:0);
  const togSave = id => setSaved(p=>{ const n=new Set(p); n.has(id)?n.delete(id):n.add(id); return n; });

  const filtered = founders
    .filter(cf => {
      const q = query.toLowerCase();
      return (
        (!q || cf.name.toLowerCase().includes(q)
          || cf.skills.some(s=>s.toLowerCase().includes(q))
          || cf.interests.some(i=>i.toLowerCase().includes(q))
          || cf.role.toLowerCase().includes(q)
          || cf.location.toLowerCase().includes(q))
        && (!fSkills.length || fSkills.some(s=>cf.skills.includes(s)))
        && (!fInd.length    || fInd.includes(cf.industry))
        && (!fStage         || cf.startupStage===fStage)
        && (!fLoc.length    || fLoc.includes(cf.location))
        && (!fAvail         || cf.availability===fAvail)
      );
    })
    .sort((a,b) =>
      sortBy==='match'?b.matchScore-a.matchScore:
      sortBy==='skills'?b.skills.length-a.skills.length:
      a.name.localeCompare(b.name)
    );

  return (
    <div className="min-h-screen bg-[#faf8ff] pt-20 pb-16 dm">
      <style>{STYLES}</style>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="mb-8 f0">
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-violet-600 uppercase tracking-widest bg-violet-50 border border-violet-100 px-3 py-1 rounded-full mb-3">
            <UserPlus className="w-3.5 h-3.5"/> Co-Founder Matching
          </span>
          <h1 className="ss text-3xl md:text-4xl font-black text-slate-900 mb-2">Find Your Co-Founder</h1>
          <p className="text-slate-500 text-sm max-w-xl">The most important hire you'll ever make. AI matches beyond skills — complementarity, commitment, vision, and work style.</p>
        </div>

        {/* AI Banner */}
        <div className="g-vi rounded-2xl p-5 mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 f1">
          <div className="w-11 h-11 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0"><Sparkles className="w-5 h-5 text-white"/></div>
          <div className="flex-1">
            <p className="ss font-bold text-white text-base">AI Analysed Your Profile & Skill Gaps</p>
            <p className="text-violet-200 text-xs mt-0.5">Matches ranked by true complementarity to your profile.</p>
          </div>
          <span className="bg-white/15 border border-white/20 text-white text-xs font-bold px-3 py-1.5 rounded-xl flex-shrink-0">{filtered.length} Matches Found</span>
        </div>

        {/* Error */}
        {fetchErr&&(
          <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-2xl px-5 py-3 mb-6">
            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0"/>
            <p className="text-sm text-red-700 flex-1">{fetchErr}</p>
            <button onClick={loadFounders} className="flex items-center gap-1 text-xs font-bold text-red-600"><RefreshCw className="w-3.5 h-3.5"/> Retry</button>
          </div>
        )}

        {/* Search + Sort */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5 f3">
          <div className="flex-1 flex items-center bg-white border border-slate-200 rounded-xl px-4 gap-2 shadow-sm">
            <Search className="w-4 h-4 text-slate-400 flex-shrink-0"/>
            <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search by skill, location, interest…"
              className="flex-1 py-3 text-sm outline-none bg-transparent text-slate-700 placeholder-slate-400 dm"/>
          </div>
          <button onClick={()=>setSbOpen(v=>!v)}
            className="lg:hidden flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-600 shadow-sm">
            <Filter className="w-4 h-4"/> Filters
            {activeN>0&&<span className="g-vi text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{activeN}</span>}
          </button>
          <select value={sortBy} onChange={e=>setSortBy(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 outline-none shadow-sm dm">
            <option value="match">Best Match</option>
            <option value="skills">Most Skills</option>
            <option value="name">Alphabetical</option>
          </select>
        </div>

        <p className="text-sm text-slate-500 mb-5">
          Showing <span className="font-bold text-slate-900">{filtered.length}</span> co-founder{filtered.length!==1?'s':''}
          {activeN>0&&<span className="text-violet-600 font-medium"> · {activeN} filter{activeN>1?'s':''} active</span>}
        </p>

        <div className="flex gap-7 items-start">
          {/* Sidebar */}
          <aside className={`w-60 flex-shrink-0 bg-white rounded-2xl border border-slate-100 shadow-sm p-5 ${sbOpen?'block':'hidden'} lg:block lg:sticky lg:top-24`}>
            <div className="flex items-center justify-between mb-5">
              <p className="ss font-bold text-slate-900 text-sm">Filters</p>
              {activeN>0&&<button onClick={clearAll} className="text-xs text-red-500 font-semibold hover:text-red-600 transition-colors">Clear all</button>}
            </div>
            <div className="filter-sec">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Skills</p>
              <div className="flex flex-wrap gap-1.5">{F_SKILLS.map(v=><Chip key={v} label={v} on={fSkills.includes(v)} onClick={()=>togArr(fSkills,setFSkills,v)}/>)}</div>
            </div>
            <div className="filter-sec">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Industry</p>
              <div className="space-y-2">{F_IND.slice(0,6).map(v=><CheckRow key={v} label={v} checked={fInd.includes(v)} onClick={()=>togArr(fInd,setFInd,v)}/>)}</div>
            </div>
            <div className="filter-sec">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Startup Stage</p>
              <div className="space-y-2">{F_STAGE.map(v=><RadioRow key={v} label={v} checked={fStage===v} onClick={()=>setFStage(p=>p===v?'':v)}/>)}</div>
            </div>
            <div className="filter-sec">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Location</p>
              <div className="flex flex-wrap gap-1.5">{F_LOC.map(v=><Chip key={v} label={v} on={fLoc.includes(v)} onClick={()=>togArr(fLoc,setFLoc,v)}/>)}</div>
            </div>
            <div className="filter-sec">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Availability</p>
              <div className="space-y-2">{F_AVAIL.map(v=><RadioRow key={v} label={v} checked={fAvail===v} onClick={()=>setFAvail(p=>p===v?'':v)}/>)}</div>
            </div>
          </aside>

          {/* Cards */}
          <div className="flex-1 min-w-0 space-y-4">
            {loading ? (
              [1,2,3].map(i=><div key={i} className="shimmer h-48"/>)
            ) : filtered.length===0 ? (
              <div className="bg-white rounded-2xl p-12 text-center border border-slate-100">
                <p className="text-3xl mb-3">🔍</p>
                <p className="ss font-bold text-slate-700 mb-1">No co-founders found</p>
                <p className="text-sm text-slate-400 mb-4">
                  {founders.length===0 ? 'No students have set "Co-founder" as their goal yet.' : 'Try adjusting your search or filters.'}
                </p>
                {activeN>0&&<button onClick={clearAll} className="text-sm text-violet-600 font-semibold hover:underline">Clear all filters</button>}
              </div>
            ) : filtered.map((cf, idx)=>(
              <div key={cf.id}
                className={`lift bg-white rounded-2xl p-6 border shadow-sm f${Math.min(idx,4)} ${cf.matchScore>=90?'card-top border-violet-200':'border-slate-100'}`}>
                {cf.matchScore>=90&&(
                  <div className="mb-4"><span className="g-vi text-white text-xs font-bold px-3 py-1.5 rounded-full inline-flex items-center gap-1"><Sparkles className="w-3 h-3"/> Highest Compatibility</span></div>
                )}
                <div className="flex flex-col md:flex-row gap-5">
                  <div className="flex-shrink-0">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${cf.grad} flex items-center justify-center text-white font-black text-lg ss`}>{cf.initials}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="ss font-black text-slate-900 text-xl">{cf.name}</h3>
                          {cf.verified&&<CheckCircle className="w-4 h-4 text-violet-500 flex-shrink-0"/>}
                          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">{cf.badge}</span>
                        </div>
                        <p className="text-sm font-semibold text-slate-600 mt-0.5">{cf.role}</p>
                        <p className="text-xs text-violet-500 font-medium italic mt-0.5">{cf.tagline}</p>
                      </div>
                      <div className="g-vi text-white px-3 py-1.5 rounded-xl flex items-center gap-1.5 flex-shrink-0">
                        <Zap className="w-3.5 h-3.5"/>
                        <span className="font-bold text-sm">{cf.matchScore}% Match</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 mb-3 text-xs">
                      <span className="flex items-center gap-1.5 text-slate-500"><MapPin className="w-3 h-3"/>{cf.location}</span>
                      <span className={`flex items-center gap-1.5 font-semibold ${cf.availDot==='g'?'text-green-600':'text-amber-600'}`}>
                        <div className={cf.availDot==='g'?'dot-g':'dot-a'}/>{cf.availability}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full font-bold text-xs ${cf.stageClass}`}>{cf.startupStage}</span>
                    </div>
                    {cf.interests.length>0&&(
                      <div className="flex items-center gap-1.5 mb-3 flex-wrap">
                        <span className="text-xs text-slate-400">Interested in:</span>
                        {cf.interests.slice(0,3).map(t=><span key={t} className="int-tag">{t}</span>)}
                      </div>
                    )}
                    {cf.skills.length>0&&(
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {cf.skills.slice(0,5).map(s=><span key={s} className="sk-tag">{s}</span>)}
                      </div>
                    )}
                    {(cf.exp||cf.edu)&&(
                      <div className="flex flex-wrap gap-4 mb-4 text-xs text-slate-500">
                        {cf.edu&&<span className="flex items-center gap-1"><Award className="w-3.5 h-3.5 text-violet-400"/>{cf.edu}</span>}
                        {cf.exp&&<span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-violet-400"/>{cf.exp}</span>}
                      </div>
                    )}
                    <div className="mb-4"><CompatBars scores={cf.compatScore}/></div>
                    <div className="bg-violet-50 border border-violet-100 rounded-xl p-3 mb-4 text-xs text-violet-700 leading-relaxed">
                      <Zap className="w-3 h-3 inline mr-1 text-violet-500"/>
                      <strong>Why AI matched you: </strong>{cf.aiReason}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button onClick={()=>setProfile(cf)}
                        className="flex items-center gap-1.5 border-2 border-slate-200 text-slate-700 hover:border-violet-300 hover:text-violet-600 px-4 py-2 rounded-xl text-sm font-bold transition-all">
                        View Profile <ChevronRight className="w-3.5 h-3.5"/>
                      </button>
                      <button onClick={()=>setConnect(cf)}
                        className="flex items-center gap-1.5 g-vi text-white px-4 py-2 rounded-xl text-sm font-bold hover:opacity-90 transition-all shadow-md shadow-violet-200">
                        <UserPlus className="w-3.5 h-3.5"/> Connect
                      </button>
                      <button onClick={()=>setMessage(cf)}
                        className="flex items-center gap-1.5 border-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50 px-4 py-2 rounded-xl text-sm font-bold transition-all">
                        <MessageSquare className="w-3.5 h-3.5"/> Message
                      </button>
                      <button onClick={()=>togSave(cf.id)}
                        className={`flex items-center gap-1.5 border-2 px-4 py-2 rounded-xl text-sm font-bold transition-all
                          ${saved.has(cf.id)?'border-rose-300 bg-rose-50 text-rose-600':'border-slate-200 text-slate-500 hover:border-rose-300 hover:text-rose-500'}`}>
                        <Heart className={`w-3.5 h-3.5 ${saved.has(cf.id)?'fill-rose-500 text-rose-500':''}`}/>
                        {saved.has(cf.id)?'Saved':'Save'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {profile&&<ProfilePanel cf={profile} onClose={()=>setProfile(null)} onConnect={c=>{setProfile(null);setConnect(c);}} onMessage={c=>{setProfile(null);setMessage(c);}}/>}
      {connect&&user&&<ConnectModal cf={connect} userId={user.id} onClose={()=>setConnect(null)}/>}
      {message&&user&&<MessageModal cf={message} userId={user.id} onClose={()=>setMessage(null)}/>}
    </div>
  );
}