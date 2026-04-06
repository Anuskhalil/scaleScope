// src/pages/founder/FounderDashboard.jsx
// Real Supabase data — startup overview, incoming requests, AI suggestions, messages

import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import {
  fetchFounderDashboardData, respondToConnectionRequest,
  getOrCreateConversation, calcFounderCompletion, formatCheckSize,
} from '../../services/founderService';
import RoleNavbar from '../../components/landing-page/RoleNavbar';
import {
  Rocket, Users, MessageSquare, ChevronRight, DollarSign, Zap,
  Target, ArrowUpRight, CheckCircle, Edit3, Award, Shield, MapPin,
  Loader, UserPlus, TrendingUp, Sparkles, Bell, Search, Briefcase,
  ChevronDown, ChevronUp, X,
} from 'lucide-react';

const CSS=`@import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800;900&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap');
.ss{font-family:'Syne',sans-serif}.dm{font-family:'DM Sans',sans-serif}
.g-fo{background:linear-gradient(135deg,#059669,#0891b2)}.g-dk{background:linear-gradient(135deg,#064e3b,#0c4a6e)}
.g-am{background:linear-gradient(135deg,#f59e0b,#ef4444)}
.page-bg{background-color:#f0fdf9;background-image:radial-gradient(circle,#a7f3d0 1px,transparent 1px);background-size:28px 28px}
.lift{transition:transform .22s cubic-bezier(.22,.68,0,1.2),box-shadow .22s ease}.lift:hover{transform:translateY(-3px);box-shadow:0 16px 48px rgba(5,150,105,.10)}
.qa{transition:all .2s cubic-bezier(.22,.68,0,1.2)}.qa:hover{transform:translateY(-2px) scale(1.025);box-shadow:0 10px 30px rgba(5,150,105,.18)}
.f0{animation:fu .35s ease both}.f1{animation:fu .35s .07s ease both}.f2{animation:fu .35s .14s ease both}.f3{animation:fu .35s .21s ease both}.f4{animation:fu .35s .28s ease both}
@keyframes fu{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
.prog{background:linear-gradient(90deg,#059669,#0891b2)}`;

const GRADS=['from-violet-500 to-indigo-500','from-emerald-500 to-teal-500','from-rose-500 to-pink-500','from-amber-500 to-orange-500','from-blue-500 to-indigo-500'];
const gradFor=id=>GRADS[(id||'').charCodeAt?.(0)%GRADS.length]||GRADS[0];
const initials=n=>(n||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
const timeAgo=iso=>{if(!iso)return'';const s=(Date.now()-new Date(iso))/1000;if(s<60)return'just now';if(s<3600)return`${Math.floor(s/60)}m ago`;if(s<86400)return`${Math.floor(s/3600)}h ago`;return`${Math.floor(s/86400)}d ago`;};
const reqLabel=type=>({cofounder_request:{label:'Co-Founder',color:'text-violet-600',bg:'bg-violet-50',b:'border-violet-200'},mentor_request:{label:'Mentor',color:'text-indigo-600',bg:'bg-indigo-50',b:'border-indigo-200'},investor_contact:{label:'Investor',color:'text-emerald-600',bg:'bg-emerald-50',b:'border-emerald-200'}}[type]||{label:type,color:'text-slate-600',bg:'bg-slate-50',b:'border-slate-200'});

export default function FounderDashboard(){
  const{user}=useAuth();const navigate=useNavigate();
  const[profile,setProfile]=useState({});const[fp,setFp]=useState({});
  const[requests,setRequests]=useState([]);const[conversations,setConversations]=useState([]);
  const[mentors,setMentors]=useState([]);const[investors,setInvestors]=useState([]);
  const[pageLoading,setPageLoading]=useState(true);
  const[responding,setResponding]=useState({});
  const[showMoreM,setShowMoreM]=useState(false);const[showMoreI,setShowMoreI]=useState(false);

  const load=useCallback(async()=>{
    if(!user)return;
    try{
      const d=await fetchFounderDashboardData(user.id);
      setProfile(d.profile);setFp(d.founderProfile);setRequests(d.requests);
      setConversations((d.conversations||[]).map(c=>{
        const parts=c.conversation_participants||[];
        const other=parts.find(p=>p.user_id!==user.id)?.profiles||{};
        return{id:c.id,other,lastAt:c.last_message_at};
      }));
      setMentors(d.mentors);setInvestors(d.investors);
    }catch(err){console.error('[Dashboard]',err);}
    finally{setPageLoading(false);}
  },[user]);
  useEffect(()=>{load();},[load]);

  const handleRespond=async(reqId,status)=>{
    setResponding(p=>({...p,[reqId]:status}));
    try{await respondToConnectionRequest(reqId,status);setRequests(prev=>prev.filter(r=>r.id!==reqId));}
    catch(err){alert(err.message);setResponding(p=>({...p,[reqId]:null}));}
  };
  const handleMsg=async(targetId)=>{
    try{await getOrCreateConversation(user.id,targetId);navigate('/messages');}catch(err){console.error(err);}
  };

  if(pageLoading)return(<><style>{CSS}</style><div className="min-h-screen page-bg flex items-center justify-center"><div className="text-center"><div className="w-12 h-12 g-fo rounded-2xl flex items-center justify-center mx-auto mb-4"><Rocket className="w-6 h-6 text-white"/></div><p className="ss font-bold text-slate-900 text-lg">Loading Dashboard…</p></div></div></>);

  const firstName=profile.full_name?.split(' ')[0]||'Founder';
  const startupName=fp.company_name||fp.idea_title||null;
  const stage=fp.startup_stage||fp.company_stage||null;
  const completion=calcFounderCompletion(profile,fp);
  const industry=(fp.industry||'').toLowerCase();

  const rankedMentors=[...mentors].sort((a,b)=>{
    const am=(a.expertise_areas||[]).some(e=>e.toLowerCase().includes(industry));
    const bm=(b.expertise_areas||[]).some(e=>e.toLowerCase().includes(industry));
    return(bm?1:0)-(am?1:0);
  });
  const rankedInvestors=[...investors].sort((a,b)=>{
    const fs=(fp.funding_stage||'').toLowerCase();
    const am=(a.preferred_stages||[]).some(s=>s.toLowerCase().includes(fs));
    const bm=(b.preferred_stages||[]).some(s=>s.toLowerCase().includes(fs));
    return(bm?1:0)-(am?1:0);
  });

  const milestones=[
    {label:'Complete founder profile',done:completion>=60,xp:50},
    {label:'Describe your startup',done:!!(fp.problem_solving||fp.problem_statement),xp:40},
    {label:'Add pitch deck',done:!!fp.pitch_deck_url,xp:30},
    {label:'Connect with a mentor',done:conversations.some(c=>c.other?.user_type==='mentor'),xp:50},
    {label:'Reach out to an investor',done:conversations.some(c=>c.other?.user_type==='investor'),xp:80},
  ];
  const xp=milestones.filter(m=>m.done).reduce((s,m)=>s+m.xp,0);

  return(<><style>{CSS}</style><RoleNavbar/>
    <div className="min-h-screen page-bg dm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">

        {/* HERO */}
        <div className="g-dk rounded-3xl border border-emerald-900 px-7 py-8 md:px-10 mb-6 relative overflow-hidden text-white f0">
          <div className="absolute -right-16 -top-16 w-64 h-64 rounded-full opacity-10 blur-3xl" style={{background:'radial-gradient(circle,#34d399,transparent)'}}/>
          <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-white/10 text-white/80"><Rocket className="w-3.5 h-3.5"/> Founder</span>
                {requests.length>0&&<span className="inline-flex items-center gap-1 text-xs font-bold text-white bg-red-500 px-2.5 py-1 rounded-full"><Bell className="w-3 h-3"/> {requests.length} request{requests.length!==1?'s':''}</span>}
              </div>
              <h1 className="ss font-black text-3xl md:text-4xl leading-none mb-2">{startupName?`${startupName} 🚀`:`Welcome, ${firstName} 👋`}</h1>
              <p className="text-sm text-white/70 max-w-lg">{startupName?`${stage||'Early stage'} · ${fp.industry||'Startup'} · Profile ${completion}% complete`:'Build your startup profile to get matched with investors, mentors, and talent.'}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link to="/founder-profile" className="qa g-fo text-white flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm shadow-lg"><Edit3 className="w-4 h-4"/> {startupName?'Edit Startup':'Build Profile'}</Link>
              <Link to="/find-investors" className="qa flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm bg-white/10 border-2 border-white/20 text-white hover:bg-white/20"><DollarSign className="w-4 h-4"/> Investors</Link>
              <Link to="/find-mentors" className="qa flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm bg-white/10 border-2 border-white/20 text-white hover:bg-white/20"><Users className="w-4 h-4"/> Mentors</Link>
            </div>
          </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 f1">
          {[{label:'Profile',value:`${completion}%`,sub:completion>=80?'Looking strong':'Fill in more',grad:'from-emerald-500 to-teal-500',Icon:Shield},{label:'XP',value:`${xp}`,sub:`${milestones.filter(m=>m.done).length}/${milestones.length} goals`,grad:'from-amber-400 to-orange-500',Icon:Award},{label:'Requests',value:`${requests.length}`,sub:'Need response',grad:'from-violet-500 to-indigo-500',Icon:Bell},{label:'Messages',value:`${conversations.length}`,sub:'Total threads',grad:'from-blue-500 to-indigo-500',Icon:MessageSquare}].map((s,i)=>(
            <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100 lift">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.grad} flex items-center justify-center text-white mb-3`}><s.Icon className="w-5 h-5"/></div>
              <p className="ss text-2xl font-black text-slate-900">{s.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
              <p className="text-xs text-emerald-600 font-semibold mt-1">{s.sub}</p>
            </div>))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">

            {/* INCOMING REQUESTS */}
            {requests.length>0&&(
              <div className="bg-white rounded-2xl shadow-sm border border-slate-100 f1">
                <div className="flex items-center justify-between px-6 pt-6 pb-3">
                  <h2 className="ss font-bold text-slate-900 text-lg flex items-center gap-2"><Bell className="w-5 h-5 text-emerald-500"/>Incoming Requests<span className="text-sm bg-emerald-100 text-emerald-700 px-2.5 py-0.5 rounded-full font-bold">{requests.length}</span></h2>
                </div>
                <div className="px-6 pb-6 space-y-3">
                  {requests.map(req=>{
                    const rl=reqLabel(req.type);const isRes=responding[req.id];
                    return(<div key={req.id} className={`p-4 rounded-2xl border-2 ${rl.b} ${rl.bg}`}>
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradFor(req.sender?.id)} flex items-center justify-center text-white text-xs font-bold ss flex-shrink-0`}>{initials(req.sender?.full_name)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-0.5">
                            <p className="font-semibold text-slate-900 text-sm ss">{req.sender?.full_name||'Someone'}</p>
                            <span className="text-xs text-slate-400 flex-shrink-0">{timeAgo(req.created_at)}</span>
                          </div>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full bg-white border ${rl.b} ${rl.color}`}>{rl.label}</span>
                          {req.message&&<p className="text-xs text-slate-600 mt-2 italic">"{req.message}"</p>}
                        </div>
                      </div>
                      {!isRes&&(<div className="flex gap-2 mt-3">
                        <button onClick={()=>handleRespond(req.id,'accepted')} className="flex-1 py-2 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 flex items-center justify-center gap-1.5"><CheckCircle className="w-3.5 h-3.5"/> Accept</button>
                        <button onClick={()=>handleMsg(req.sender?.id)} className="flex-1 py-2 border-2 border-slate-200 text-slate-600 text-xs font-bold rounded-xl hover:border-emerald-200 hover:text-emerald-600 flex items-center justify-center gap-1.5"><MessageSquare className="w-3.5 h-3.5"/> Message</button>
                        <button onClick={()=>handleRespond(req.id,'rejected')} className="px-3 py-2 border-2 border-red-100 text-red-500 text-xs font-bold rounded-xl hover:bg-red-50"><X className="w-3.5 h-3.5"/></button>
                      </div>)}
                      {isRes&&<p className={`text-xs font-bold mt-2 flex items-center gap-1 ${isRes==='accepted'?'text-emerald-600':'text-red-500'}`}><CheckCircle className="w-3.5 h-3.5"/>{isRes==='accepted'?'Accepted!':'Declined'}</p>}
                    </div>);})}
                </div>
              </div>)}

            {/* SUGGESTED MENTORS */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 f2">
              <div className="flex items-center justify-between px-6 pt-6 pb-3">
                <div><p className="text-xs font-bold text-emerald-500 uppercase tracking-widest mb-0.5">✨ AI matched</p><h2 className="ss font-bold text-slate-900 text-lg">Suggested Mentors</h2></div>
                <Link to="/find-mentors" className="text-xs font-semibold text-emerald-600 flex items-center gap-1">All<ChevronRight className="w-3.5 h-3.5"/></Link>
              </div>
              <div className="px-6 pb-6">
                {mentors.length===0?(<div className="py-8 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200"><p className="text-slate-400 text-sm mb-3">No mentors yet.</p><Link to="/find-mentors" className="g-fo text-white text-xs font-bold px-4 py-2 rounded-xl inline-flex">Find Mentors</Link></div>):(
                  <><div className="space-y-3">
                    {(showMoreM?rankedMentors:rankedMentors.slice(0,3)).map((m,i)=>{
                      const p=m.profiles||{};return(
                      <div key={m.id||i} className="flex items-start gap-3 p-4 border border-slate-100 rounded-2xl hover:border-emerald-100 transition-all lift">
                        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradFor(m.user_id)} flex items-center justify-center text-white font-bold text-sm ss flex-shrink-0`}>{initials(p.full_name)}</div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-900 text-sm ss">{p.full_name||'Mentor'}</p>
                          <p className="text-xs text-slate-500">{m.current_role||'Mentor'}{m.current_company?` · ${m.current_company}`:''}</p>
                          {(m.expertise_areas||[]).length>0&&<div className="flex flex-wrap gap-1.5 mt-2">{m.expertise_areas.slice(0,3).map((e,j)=><span key={j} className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">{e}</span>)}</div>}
                          {m.is_pro_bono&&<span className="text-xs text-emerald-600 font-semibold mt-1 block">Pro Bono ✓</span>}
                        </div>
                        <button onClick={()=>handleMsg(m.user_id)} className="flex-shrink-0 text-xs font-bold text-white g-fo px-3 py-2 rounded-xl hover:opacity-90">Message</button>
                      </div>);})}</div>
                    {rankedMentors.length>3&&<button onClick={()=>setShowMoreM(p=>!p)} className="w-full mt-3 py-2.5 text-sm font-semibold text-emerald-600 hover:bg-emerald-50 rounded-xl flex items-center justify-center gap-1.5">{showMoreM?<><ChevronUp className="w-4 h-4"/>Show less</>:<><ChevronDown className="w-4 h-4"/>See {rankedMentors.length-3} more</>}</button>}
                  </>)}
              </div>
            </div>

            {/* SUGGESTED INVESTORS */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 f3">
              <div className="flex items-center justify-between px-6 pt-6 pb-3">
                <div><p className="text-xs font-bold text-emerald-500 uppercase tracking-widest mb-0.5">💰 matched to your stage</p><h2 className="ss font-bold text-slate-900 text-lg">Suggested Investors</h2></div>
                <Link to="/find-investors" className="text-xs font-semibold text-emerald-600 flex items-center gap-1">All<ChevronRight className="w-3.5 h-3.5"/></Link>
              </div>
              <div className="px-6 pb-6">
                {investors.length===0?(<div className="py-8 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200"><p className="text-slate-400 text-sm mb-3">No investors yet.</p><Link to="/find-investors" className="g-fo text-white text-xs font-bold px-4 py-2 rounded-xl inline-flex">Find Investors</Link></div>):(
                  <><div className="space-y-3">
                    {(showMoreI?rankedInvestors:rankedInvestors.slice(0,3)).map((inv,i)=>{
                      const p=inv.profiles||{};return(
                      <div key={inv.id||i} className="flex items-start gap-3 p-4 border border-slate-100 rounded-2xl hover:border-emerald-100 transition-all lift">
                        <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradFor(inv.profile_id)} flex items-center justify-center text-white font-bold text-sm ss flex-shrink-0`}>{initials(p.full_name||inv.fund_name)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-slate-900 text-sm ss truncate">{p.full_name||inv.fund_name||'Investor'}</p>
                            {inv.is_verified&&<span className="text-xs text-blue-600 font-bold bg-blue-50 px-1.5 py-0.5 rounded-full flex-shrink-0">✓</span>}
                          </div>
                          <p className="text-xs text-slate-500">{inv.investor_type||'Investor'}</p>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {(inv.preferred_stages||[]).slice(0,2).map((s,j)=><span key={j} className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-medium">{s}</span>)}
                            {(inv.check_range_min||inv.check_range_max)&&<span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{formatCheckSize(inv.check_range_min,inv.check_range_max)}</span>}
                          </div>
                        </div>
                        <button onClick={()=>handleMsg(inv.profile_id)} className="flex-shrink-0 text-xs font-bold text-white g-fo px-3 py-2 rounded-xl hover:opacity-90">Pitch</button>
                      </div>);})}</div>
                    {rankedInvestors.length>3&&<button onClick={()=>setShowMoreI(p=>!p)} className="w-full mt-3 py-2.5 text-sm font-semibold text-emerald-600 hover:bg-emerald-50 rounded-xl flex items-center justify-center gap-1.5">{showMoreI?<><ChevronUp className="w-4 h-4"/>Show less</>:<><ChevronDown className="w-4 h-4"/>See {rankedInvestors.length-3} more</>}</button>}
                  </>)}
              </div>
            </div>

            {/* MESSAGES */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 f4">
              <div className="flex items-center justify-between px-6 pt-6 pb-3">
                <h2 className="ss font-bold text-slate-900 text-lg flex items-center gap-2"><MessageSquare className="w-5 h-5 text-blue-500"/>Messages</h2>
                <Link to="/messages" className="text-xs font-semibold text-emerald-600 flex items-center gap-1">Open<ChevronRight className="w-3.5 h-3.5"/></Link>
              </div>
              <div className="px-6 pb-6">
                {conversations.length>0?(
                  <div className="space-y-2">{conversations.slice(0,5).map(c=>(
                    <Link key={c.id} to="/messages" className="flex items-center gap-3 p-3.5 rounded-2xl hover:bg-slate-50 transition-all">
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${gradFor(c.other.id)} flex items-center justify-center text-white text-xs font-bold ss flex-shrink-0`}>{initials(c.other.full_name)}</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-slate-900 text-sm ss">{c.other.full_name||'Unknown'}</p>
                        <p className="text-xs text-slate-400 capitalize">{c.other.user_type||'User'}</p>
                      </div>
                      <span className="text-xs text-slate-400">{timeAgo(c.lastAt)}</span>
                    </Link>))}</div>
                ):(<div className="py-6 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200"><p className="text-slate-400 text-sm">No messages yet.</p></div>)}
              </div>
            </div>
          </div>

          {/* SIDEBAR */}
          <div className="space-y-5">
            {/* Startup card */}
            <div className="g-dk rounded-2xl p-6 text-white relative overflow-hidden f0 lift">
              <div className="absolute -right-6 -bottom-6 w-28 h-28 bg-white/10 rounded-full"/>
              <div className="relative">
                <div className="flex items-center justify-between mb-4"><h3 className="ss font-bold text-lg">My Startup</h3><Rocket className="w-5 h-5 text-emerald-400"/></div>
                {startupName?(<><p className="ss font-black text-2xl mb-1">{startupName}</p>
                  <div className="flex gap-2 flex-wrap mb-4">
                    {stage&&<span className="text-xs bg-white/20 px-2.5 py-0.5 rounded-full font-semibold">{stage}</span>}
                    {fp.industry&&<span className="text-xs bg-white/20 px-2.5 py-0.5 rounded-full font-semibold">{fp.industry}</span>}
                  </div></>
                ):(<p className="text-white/60 text-sm mb-4">Build your startup profile to get matched.</p>)}
                <div className="flex justify-between text-sm mb-1.5"><span className="text-white/60">Profile</span><span className="font-bold">{completion}%</span></div>
                <div className="h-2 bg-white/20 rounded-full overflow-hidden mb-4"><div className="h-full bg-white rounded-full" style={{width:`${completion}%`}}/></div>
                <Link to="/founder-profile" className="flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 text-white text-sm font-semibold py-2.5 rounded-xl transition-all"><Edit3 className="w-4 h-4"/>{startupName?'Edit Profile':'Build Profile'}</Link>
              </div>
            </div>

            {/* Milestones */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 f1">
              <div className="flex items-center justify-between mb-4"><h3 className="ss font-bold text-slate-900">Progress</h3><span className="text-xs text-slate-400">{xp} XP</span></div>
              <div className="space-y-2">{milestones.map((m,i)=>(
                <div key={i} className={`flex items-center gap-2.5 p-2.5 rounded-xl ${m.done?'bg-emerald-50':'bg-slate-50'}`}>
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${m.done?'bg-emerald-100':'bg-slate-200'}`}>{m.done?'✓':'○'}</span>
                  <p className={`text-xs font-medium flex-1 ${m.done?'text-slate-400 line-through':'text-slate-700'}`}>{m.label}</p>
                  {m.done&&<span className="text-xs text-emerald-600 font-bold">+{m.xp}</span>}
                </div>))}</div>
            </div>

            {/* Quick actions */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 f2">
              <h3 className="ss font-bold text-slate-900 mb-4">Quick Actions</h3>
              <div className="space-y-0.5">{[
                {Icon:DollarSign,label:'Find Investors',to:'/find-investors',col:'text-emerald-600'},
                {Icon:Users,label:'Find Mentors',to:'/find-mentors',col:'text-indigo-600'},
                {Icon:Briefcase,label:'Find Team',to:'/find-team',col:'text-violet-600'},
                {Icon:Search,label:'Discover',to:'/discover',col:'text-blue-600'},
                {Icon:MessageSquare,label:'Messages',to:'/messages',col:'text-slate-500'},
              ].map(({Icon,label,to,col},i)=>(
                <Link key={i} to={to} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-all group">
                  <Icon className={`w-4 h-4 ${col}`}/><span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 flex-1">{label}</span>
                  <span className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500">→</span>
                </Link>))}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </>);
}