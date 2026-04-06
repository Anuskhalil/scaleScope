// src/pages/MentorRolePages/FindFoundersPage.jsx
// Mentor browses: Startups (founders) | Students with Ideas
// CTA: Offer Help → connection_request(type='mentor_offer') | Message

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import {
  fetchFoundersForMentor, fetchStudentsWithIdeas, fetchMentorProfile,
  rankFoundersForMentor, rankStudentsForMentor,
  sendConnectionRequest, getOrCreateConversation,
} from '../../services/mentorService';
import {
  Search, Sparkles, Rocket, GraduationCap, MessageSquare,
  Zap, CheckCircle, MapPin, Filter, Loader, AlertTriangle,
  RefreshCw, ChevronRight, X, Send, Lightbulb, Target,
} from 'lucide-react';

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800;900&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap');
  .ss{font-family:'Syne',sans-serif}.dm{font-family:'DM Sans',sans-serif}
  .lift{transition:transform .22s cubic-bezier(.22,.68,0,1.2),box-shadow .22s ease}
  .lift:hover{transform:translateY(-3px);box-shadow:0 16px 44px rgba(5,150,105,.09)}
  .g-ment{background:linear-gradient(135deg,#059669,#0891b2)}
  .page-bg{background-color:#f0fdf9;background-image:radial-gradient(circle,#6ee7b7 1px,transparent 1px);background-size:28px 28px}
  .chip{display:inline-flex;align-items:center;padding:3px 10px;border-radius:999px;font-size:11px;font-weight:600;cursor:pointer;border:1.5px solid #e2e8f0;background:#fff;color:#64748b;transition:all .14s}
  .chip:hover{border-color:#6ee7b7;color:#065f46}
  .chip.on{background:#ecfdf5;border-color:#6ee7b7;color:#065f46}
  .filter-panel{border-bottom:1px solid #f3f4f6;padding-bottom:16px;margin-bottom:16px}
  .filter-panel:last-child{border-bottom:none;padding-bottom:0;margin-bottom:0}
  .slide-in{animation:si .28s cubic-bezier(.32,.72,0,1) both}
  @keyframes si{from{opacity:0;transform:translateX(24px)}to{opacity:1;transform:none}}
  .f0{animation:fu .32s ease both}.f1{animation:fu .32s .06s ease both}.f2{animation:fu .32s .12s ease both}
  @keyframes fu{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
  .shimmer{background:linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%);background-size:200% 100%;animation:sh 1.4s infinite;border-radius:12px}
  @keyframes sh{0%{background-position:200% 0}100%{background-position:-200% 0}}
  .modal-pop{animation:mp .22s cubic-bezier(.34,1.4,.64,1) both}
  @keyframes mp{from{opacity:0;transform:scale(.95)}to{opacity:1;transform:scale(1)}}
  .inp{width:100%;padding:10px 14px;border:1.5px solid #e2e8f0;border-radius:12px;font-size:13px;outline:none;font-family:'DM Sans',sans-serif;transition:border-color .14s;background:#fff}
  .inp:focus{border-color:#059669}
  .ai-badge{display:inline-flex;align-items:center;gap:3px;padding:2px 8px;border-radius:999px;font-size:10px;font-weight:700;background:linear-gradient(135deg,#059669,#0891b2);color:#fff}
`;

const INDUSTRIES = ['EdTech','HealthTech','FinTech','SaaS','AgriTech','CleanTech','LegalTech','HRTech','AI / ML','Social Impact'];
const STAGES     = ['Just an Idea','Researching','Building MVP','MVP Built','Growing'];
const HELP_AREAS = ['Fundraising','Marketing','Technical','Product','Legal','Finance','Design','Sales'];

function initials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}
function gradFor(id) {
  const g = ['from-emerald-500 to-teal-500','from-indigo-500 to-violet-500',
             'from-amber-500 to-orange-500','from-rose-500 to-pink-500',
             'from-blue-500 to-cyan-500','from-violet-500 to-purple-500'];
  return g[((id || '').charCodeAt?.(0) || 0) % g.length];
}

// ── Founder card ──────────────────────────────────────────────────────────
function FounderCard({ founder, onOffer, onMessage, offerState, isTop }) {
  const p          = founder.profiles || {};
  const startupName= founder.company_name || founder.idea_title || 'Startup';
  const stage      = founder.startup_stage || founder.company_stage || '';
  const score      = founder._score || 0;
  const reason     = founder._matchReason || '';

  return (
    <div className={`bg-white rounded-2xl border shadow-sm lift ${isTop ? 'border-emerald-200 bg-gradient-to-br from-white to-emerald-50/30' : 'border-slate-100'}`}>
      <div className="p-5">
        <div className="flex items-start gap-3 mb-3">
          <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradFor(founder.user_id)} flex items-center justify-center text-white font-bold text-sm ss flex-shrink-0`}>
            {initials(p.full_name)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              <p className="font-bold text-slate-900 ss text-sm leading-tight">{p.full_name || '—'}</p>
              {score >= 40 && <span className="ai-badge flex-shrink-0"><Sparkles className="w-2.5 h-2.5" />Recommended</span>}
            </div>
            <p className="text-xs font-bold text-emerald-700 ss">{startupName}</p>
            {p.location && <p className="text-xs text-slate-400 flex items-center gap-0.5 mt-0.5"><MapPin className="w-3 h-3" />{p.location}</p>}
          </div>
          {stage && <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full font-medium flex-shrink-0">{stage}</span>}
        </div>

        {reason && <p className="text-xs text-emerald-600 italic mb-2">"{reason}"</p>}

        {(founder.problem_solving || founder.problem_statement) && (
          <p className="text-xs text-slate-600 leading-relaxed mb-3 line-clamp-2">
            {founder.problem_solving || founder.problem_statement}
          </p>
        )}

        {founder.industry && (
          <span className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-100 px-2.5 py-1 rounded-full font-medium mr-1.5 mb-2 inline-block">
            {founder.industry}
          </span>
        )}

        {(founder.help_needed || []).length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            <span className="text-xs text-slate-400 mr-0.5">Needs:</span>
            {founder.help_needed.slice(0, 3).map((h, i) => (
              <span key={i} className="text-xs bg-amber-50 text-amber-700 border border-amber-100 px-2 py-0.5 rounded-full font-medium">{h}</span>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <button onClick={onMessage}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 border-2 border-slate-200 text-slate-600 hover:border-emerald-200 hover:text-emerald-600 rounded-xl text-xs font-bold transition-all">
            <MessageSquare className="w-3.5 h-3.5" /> Message
          </button>
          <button onClick={onOffer} disabled={offerState === 'sent' || offerState === 'sending'}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              offerState === 'sent'    ? 'bg-emerald-50 text-emerald-600 border-2 border-emerald-200' :
              offerState === 'sending' ? 'g-ment text-white opacity-70 cursor-wait' :
              'g-ment text-white hover:opacity-90'
            }`}>
            {offerState === 'sent'    ? <><CheckCircle className="w-3.5 h-3.5" />Offered</> :
             offerState === 'sending' ? <Loader className="w-3.5 h-3.5 animate-spin" /> :
             <><Zap className="w-3.5 h-3.5" />Offer Help</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Student card ──────────────────────────────────────────────────────────
function StudentCard({ student, onOffer, onMessage, offerState }) {
  const p     = student.profiles || {};
  const idea  = student.startup_idea_description;
  const score = student._score || 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm lift">
      <div className="p-5">
        <div className="flex items-start gap-3 mb-3">
          <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradFor(student.user_id)} flex items-center justify-center text-white font-bold text-sm ss flex-shrink-0`}>
            {initials(p.full_name)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="font-bold text-slate-900 ss text-sm">{p.full_name || '—'}</p>
              {score >= 25 && <span className="ai-badge flex-shrink-0"><Sparkles className="w-2.5 h-2.5" />Recommended</span>}
            </div>
            {p.location && <p className="text-xs text-slate-400 flex items-center gap-0.5"><MapPin className="w-3 h-3" />{p.location}</p>}
            {student.commitment_level && <p className="text-xs text-indigo-600 font-medium mt-0.5">{student.commitment_level}</p>}
          </div>
        </div>

        {student._matchReason && <p className="text-xs text-emerald-600 italic mb-2">"{student._matchReason}"</p>}

        {idea && (
          <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl mb-3">
            <p className="text-xs font-bold text-indigo-500 uppercase mb-1">💡 Startup Idea</p>
            <p className="text-xs text-slate-700 line-clamp-2">{idea}</p>
          </div>
        )}

        {(student.help_needed || []).length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            <span className="text-xs text-slate-400">Needs:</span>
            {student.help_needed.slice(0, 3).map((h, i) => (
              <span key={i} className="text-xs bg-amber-50 text-amber-700 border border-amber-100 px-2 py-0.5 rounded-full font-medium">{h}</span>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <button onClick={onMessage}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 border-2 border-slate-200 text-slate-600 hover:border-emerald-200 hover:text-emerald-600 rounded-xl text-xs font-bold transition-all">
            <MessageSquare className="w-3.5 h-3.5" /> Message
          </button>
          <button onClick={onOffer} disabled={offerState === 'sent' || offerState === 'sending'}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
              offerState === 'sent'    ? 'bg-emerald-50 text-emerald-600 border-2 border-emerald-200' :
              offerState === 'sending' ? 'g-ment text-white opacity-70 cursor-wait' :
              'g-ment text-white hover:opacity-90'
            }`}>
            {offerState === 'sent'    ? <><CheckCircle className="w-3.5 h-3.5" />Offered</> :
             offerState === 'sending' ? <Loader className="w-3.5 h-3.5 animate-spin" /> :
             <><Zap className="w-3.5 h-3.5" />Offer Help</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
export default function FindFoundersPage() {
  const { user }   = useAuth();
  const navigate   = useNavigate();

  const [tab,        setTab]        = useState('founders');
  const [founders,   setFounders]   = useState([]);
  const [students,   setStudents]   = useState([]);
  const [myProfile,  setMyProfile]  = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [search,     setSearch]     = useState('');
  const [industryF,  setIndustryF]  = useState('');
  const [stageF,     setStageF]     = useState('');
  const [helpF,      setHelpF]      = useState('');
  const [offerStates,setOfferStates]= useState({});
  const [msgModal,   setMsgModal]   = useState(null);
  const [msgText,    setMsgText]    = useState('');
  const [sending,    setSending]    = useState(false);
  const [showFilters,setShowFilters]= useState(false);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true); setError('');
    try {
      const [{ mentorProfile }, fData, sData] = await Promise.all([
        fetchMentorProfile(user.id),
        fetchFoundersForMentor({ industry: industryF, stage: stageF }),
        fetchStudentsWithIdeas({ helpArea: helpF }),
      ]);
      setMyProfile(mentorProfile);
      setFounders(rankFoundersForMentor(fData, mentorProfile));
      setStudents(rankStudentsForMentor(sData, mentorProfile));
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [user, industryF, stageF, helpF]);

  useEffect(() => { load(); }, []);

  const handleOffer = async (targetId) => {
    if (offerStates[targetId]) return;
    setOfferStates(p => ({ ...p, [targetId]: 'sending' }));
    try {
      await sendConnectionRequest(user.id, targetId, 'mentor_offer');
      setOfferStates(p => ({ ...p, [targetId]: 'sent' }));
    } catch (e) {
      if (!e.message?.includes('23505')) alert(e.message);
      else setOfferStates(p => ({ ...p, [targetId]: 'sent' }));
    }
  };

  const handleMessage = (person) => {
    const name = person.profiles?.full_name?.split(' ')[0] || 'there';
    setMsgModal({ ...person, _name: name });
    setMsgText(`Hi ${name}, I'm a mentor specialising in [YOUR EXPERTISE]. I came across your profile and think I could help with [SPECIFIC AREA]. Would you be open to a quick chat?`);
  };

  const handleSendMessage = async () => {
    if (!msgModal || !msgText.trim() || sending) return;
    setSending(true);
    try {
      await sendConnectionRequest(user.id, msgModal.user_id, 'mentor_offer', msgText.trim());
      setOfferStates(p => ({ ...p, [msgModal.user_id]: 'sent' }));
      setMsgModal(null); setMsgText('');
      navigate('/messages');
    } catch (e) {
      if (!e.message?.includes('23505')) alert(e.message);
      else { setMsgModal(null); navigate('/messages'); }
    } finally { setSending(false); }
  };

  const handleApplyFilters = () => load();

  // Client-side text search
  const shownFounders = founders.filter(f => {
    if (!search) return true;
    const q = search.toLowerCase();
    return [f.profiles?.full_name, f.company_name, f.idea_title,
            f.industry, f.problem_solving, ...(f.help_needed || [])]
      .filter(Boolean).join(' ').toLowerCase().includes(q);
  });
  const shownStudents = students.filter(s => {
    if (!search) return true;
    const q = search.toLowerCase();
    return [s.profiles?.full_name, s.startup_idea_description, ...(s.help_needed || [])]
      .filter(Boolean).join(' ').toLowerCase().includes(q);
  });

  return (
    <>
      <style>{CSS}</style>
      <div className="min-h-screen page-bg dm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">

          {/* Header */}
          <div className="mb-8 f0">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-700 bg-emerald-100 px-3 py-1.5 rounded-full mb-3">
              <Target className="w-3.5 h-3.5" /> Find Founders
            </div>
            <h1 className="ss font-black text-4xl text-slate-900 mb-2">Find Founders & Students</h1>
            <p className="text-slate-600 text-lg max-w-xl">
              Builders who need your specific expertise. AI-ranked by relevance to your profile.
            </p>
          </div>

          <div className="grid lg:grid-cols-4 gap-6">

            {/* Filters sidebar */}
            <aside className="lg:col-span-1 f1">
              <button onClick={() => setShowFilters(!showFilters)}
                className="lg:hidden w-full flex items-center justify-between p-3.5 bg-white rounded-xl border border-emerald-100 mb-3 shadow-sm font-semibold text-sm text-slate-700">
                <span className="flex items-center gap-2"><Filter className="w-4 h-4 text-emerald-500" />Filters</span>
                <ChevronRight className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-90' : ''}`} />
              </button>

              <div className={`bg-white rounded-2xl border border-emerald-100/60 shadow-sm p-5 ${showFilters ? 'block' : 'hidden lg:block'}`}>
                {tab === 'founders' && (
                  <>
                    <div className="filter-panel">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Industry</p>
                      <div className="flex flex-wrap gap-1.5">
                        {['', ...INDUSTRIES].map(ind => (
                          <button key={ind} onClick={() => setIndustryF(ind === industryF ? '' : ind)}
                            className={`chip ${industryF === ind && ind ? 'on' : ''}`}>
                            {ind || 'Any'}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="filter-panel">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Stage</p>
                      <div className="space-y-1.5">
                        {['', ...STAGES].map(s => (
                          <button key={s} onClick={() => setStageF(s === stageF ? '' : s)}
                            className={`w-full text-left text-sm py-2 px-3 rounded-xl transition-all font-medium ${stageF === s && s ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}>
                            {s || 'All Stages'}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {tab === 'students' && (
                  <div className="filter-panel">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Help Needed</p>
                    <div className="flex flex-wrap gap-1.5">
                      {['', ...HELP_AREAS].map(h => (
                        <button key={h} onClick={() => setHelpF(h === helpF ? '' : h)}
                          className={`chip ${helpF === h && h ? 'on' : ''}`}>
                          {h || 'Any'}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <button onClick={handleApplyFilters}
                  className="w-full py-2.5 g-ment text-white rounded-xl text-sm font-bold hover:opacity-90 transition-all">
                  Apply Filters
                </button>

                {(industryF || stageF || helpF) && (
                  <button onClick={() => { setIndustryF(''); setStageF(''); setHelpF(''); load(); }}
                    className="w-full mt-2 flex items-center justify-center gap-2 py-2.5 text-xs font-semibold text-rose-500 hover:bg-red-50 rounded-xl transition-all">
                    <X className="w-3.5 h-3.5" /> Clear Filters
                  </button>
                )}
              </div>
            </aside>

            {/* Main content */}
            <div className="lg:col-span-3 f2">
              {/* Tabs */}
              <div className="flex gap-3 mb-5">
                {[
                  { id: 'founders', label: `Startups & Founders`, count: founders.length, Icon: Rocket },
                  { id: 'students', label: `Students with Ideas`,  count: students.length, Icon: GraduationCap },
                ].map(t => (
                  <button key={t.id} onClick={() => setTab(t.id)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${tab === t.id ? 'g-ment text-white shadow' : 'bg-white text-slate-600 border border-slate-200 hover:border-emerald-200'}`}>
                    <t.Icon className="w-4 h-4" />{t.label}
                    {!loading && <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${tab === t.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>{t.count}</span>}
                  </button>
                ))}
              </div>

              {/* Search */}
              <div className="flex items-center gap-3 mb-5">
                <div className="flex-1 relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input className="inp pl-10" placeholder="Search by name, industry, idea, or help needed…"
                    value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <button onClick={load} className="p-2.5 bg-white border border-emerald-100 rounded-xl text-slate-500 hover:text-emerald-600 hover:border-emerald-200 transition-all">
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {error && (
                <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl px-5 py-4 mb-5">
                  <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-700 flex-1">{error}</p>
                  <button onClick={load}><RefreshCw className="w-4 h-4 text-red-400" /></button>
                </div>
              )}

              {loading ? (
                <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3">
                      <div className="flex gap-3"><div className="shimmer w-11 h-11 flex-shrink-0" /><div className="flex-1 space-y-2"><div className="shimmer h-4 w-28" /><div className="shimmer h-3 w-20" /></div></div>
                      <div className="shimmer h-3 w-full" /><div className="shimmer h-3 w-4/5" />
                      <div className="flex gap-2"><div className="shimmer h-8 flex-1" /><div className="shimmer h-8 flex-1" /></div>
                    </div>
                  ))}
                </div>
              ) : tab === 'founders' ? (
                shownFounders.length === 0 ? (
                  <div className="py-20 text-center">
                    <Rocket className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                    <h3 className="ss font-bold text-slate-900 text-xl mb-2">No founders found</h3>
                    <p className="text-slate-500 text-sm">{industryF || stageF || search ? 'Try clearing filters' : 'Founders will appear here once they join ScalScope.'}</p>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {shownFounders.map((f, i) => (
                      <div key={f.id || i} className="slide-in" style={{ animationDelay: `${Math.min(i, 8) * 0.05}s` }}>
                        <FounderCard founder={f} isTop={i < 3}
                          onOffer={() => handleOffer(f.user_id)}
                          onMessage={() => handleMessage(f)}
                          offerState={offerStates[f.user_id]} />
                      </div>
                    ))}
                  </div>
                )
              ) : (
                shownStudents.length === 0 ? (
                  <div className="py-20 text-center">
                    <GraduationCap className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                    <h3 className="ss font-bold text-slate-900 text-xl mb-2">No students found</h3>
                    <p className="text-slate-500 text-sm">{helpF || search ? 'Try clearing filters' : 'Students with startup ideas appear here.'}</p>
                  </div>
                ) : (
                  <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {shownStudents.map((s, i) => (
                      <div key={s.id || i} className="slide-in" style={{ animationDelay: `${Math.min(i, 8) * 0.05}s` }}>
                        <StudentCard student={s}
                          onOffer={() => handleOffer(s.user_id)}
                          onMessage={() => handleMessage(s)}
                          offerState={offerStates[s.user_id]} />
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Message modal */}
      {msgModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-7 max-w-md w-full shadow-2xl modal-pop">
            <div className="flex items-center justify-between mb-4">
              <h3 className="ss font-black text-xl text-slate-900">Offer Help to {msgModal._name}</h3>
              <button onClick={() => setMsgModal(null)} className="p-1.5 hover:bg-slate-100 rounded-xl text-slate-400"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-xs text-slate-400 mb-3">A personalised message gets 3× the response rate. Edit the template below.</p>
            <textarea className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl text-sm outline-none resize-none focus:border-emerald-400 transition-colors"
              rows={6} value={msgText} onChange={e => setMsgText(e.target.value)} maxLength={500} />
            <p className="text-xs text-slate-400 text-right mt-1 mb-4">{msgText.length}/500</p>
            <div className="flex gap-3">
              <button onClick={() => setMsgModal(null)} className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200">Cancel</button>
              <button onClick={handleSendMessage} disabled={!msgText.trim() || sending}
                className="flex-1 py-3 g-ment text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50">
                {sending ? <Loader className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" />Send & Offer</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}