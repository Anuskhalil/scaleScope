import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../auth/AuthContext';
import {
  fetchConversations, fetchMentors, fetchCoFounders, fetchIncomingRequests,
  sendConnectionRequest, getConnectionStatus, respondToRequest,
} from '../../services/studentService';
import {
  Rocket, Users, MessageSquare, ChevronRight, UserPlus,
  Zap, Target, ArrowUpRight, CheckCircle,
  Clock, GraduationCap, Award, Lightbulb, Bell,
  Shield, Edit3, MapPin, Activity,
  Send, ChevronDown, ChevronUp, Search,
  ArrowRight, Sparkles, Brain,
  Video, Inbox, UserCheck, UserX, Loader, Megaphone, Calendar, DollarSign,
} from 'lucide-react';

// ✅ HELPER: Get signed URL for private bucket
const getSignedUrl = async (avatarPath) => {
  if (!avatarPath) return null;
  if (avatarPath.startsWith('http')) return avatarPath;

  let cleanPath = avatarPath;
  if (cleanPath.startsWith('avatars/')) {
    cleanPath = cleanPath.replace('avatars/', '');
  }

  try {
    const { data } = await supabase.storage
      .from('avatars')
      .createSignedUrl(cleanPath, 3600);
    return data?.signedUrl || null;
  } catch {
    return null;
  }
};

// ✅ HELPER: Batch convert multiple avatar paths to signed URLs
const batchGetSignedUrls = async (items, avatarKeyPath) => {
  return Promise.all(
    items.map(async (item) => {
      const keys = avatarKeyPath.split('.');
      let avatarPath = item;
      for (const key of keys) {
        avatarPath = avatarPath?.[key];
      }

      const signedUrl = await getSignedUrl(avatarPath);

      // Deep clone and set the signed URL at the right path
      const clone = JSON.parse(JSON.stringify(item));
      let target = clone;
      for (let i = 0; i < keys.length - 1; i++) {
        if (!target[keys[i]]) target[keys[i]] = {};
        target = target[keys[i]];
      }
      target[keys[keys.length - 1]] = signedUrl;
      return clone;
    })
  );
};

const CSS = `
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
  @keyframes fu{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
  .qa{transition:all .2s cubic-bezier(.22,.68,0,1.2)}
  .qa:hover{transform:translateY(-2px) scale(1.025);box-shadow:0 10px 30px rgba(79,70,229,.18)}
  .journey-item{border:2px solid #e2e8f0;border-radius:14px;padding:14px 16px;transition:all .2s}
  .journey-item.done{border-color:#a7f3d0;background:#f0fdf4}
  .journey-item.active{border-color:#a5b4fc;background:#eef2ff}
  .journey-item.pending{opacity:.55}
  .unread-dot{animation:udot 2s ease-in-out infinite}
  @keyframes udot{0%,100%{box-shadow:0 0 0 0 rgba(79,70,229,.5)}50%{box-shadow:0 0 0 5px rgba(79,70,229,0)}}
  @media(max-width:1023px){
    .sidebar-profile-card{order:-3}
    .sidebar-requests-card{order:-2}
  }
`;

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

// ✅ shapeMentor - avatar is now already a signed URL (set before calling)
function shapeMentor(r) {
  const p = r.profiles || {};
  return {
    id: r.id, user_id: r.user_id, name: p.full_name || 'Mentor', init: initials(p.full_name),
    grad: 'from-violet-500 to-indigo-500', role: r.current_role || r.current_company || 'Mentor',
    expertise: (r.expertise_areas || []).slice(0, 3), location: p.location || 'Remote',
    available: !!(r.available_for?.length), avatar: p.avatar_url,
    why: `Expert in ${(r.expertise_areas || []).slice(0, 2).join(' & ') || 'mentorship'}.`,
  };
}

// ✅ shapeCofounder - avatar is now already a signed URL
function shapeCofounder(r, currentUserId) {
  const p = r.profiles || {};
  const skills = (r.skills_with_levels || []).map(s => s.skill || s).filter(Boolean);
  return {
    id: r.id, user_id: r.user_id, name: p.full_name || 'Co-Founder', init: initials(p.full_name),
    grad: 'from-indigo-500 to-violet-500', role: skills.slice(0, 2).join(' + ') || 'Student Builder',
    skills: skills.slice(0, 3), location: p.location || 'Remote',
    commitment: r.commitment_level || 'Flexible', idea: r.has_startup_idea, avatar: p.avatar_url,
    why: r.has_startup_idea ? 'Has a startup idea — looking for co-founder.' : 'Actively looking to build together.',
  };
}

function Shimmer({ h = 'h-16' }) { return <div className={`sh ${h} w-full`} />; }
function Card({ children, className = '' }) { return <div className={`bg-white rounded-2xl shadow-sm border border-slate-100 ${className}`}>{children}</div>; }
function SectionHead({ title, icon, linkTo, linkLabel }) {
  return (
    <div className="flex items-center justify-between px-5 sm:px-6 pt-5 sm:pt-6 pb-3">
      <h2 className="font-bold text-slate-900 text-base sm:text-lg flex items-center gap-2">{icon}{title}</h2>
      {linkLabel && linkTo && (
        <Link to={linkTo} className="text-xs text-indigo-600 font-semibold flex items-center gap-1 hover:gap-2 transition-all">
          {linkLabel}<ChevronRight className="w-3.5 h-3.5" />
        </Link>
      )}
    </div>
  );
}

function Avatar({ name, avatar, grad, size = 'md' }) {
  const sizeMap = { sm: 'w-8 h-8 text-xs rounded-lg', md: 'w-10 h-10 text-sm rounded-xl', lg: 'w-11 h-11 text-sm rounded-xl', xl: 'w-14 h-14 text-lg rounded-2xl' };
  if (avatar) return <img src={avatar} alt={name || ''} className={`${sizeMap[size]} object-cover flex-shrink-0`} loading="lazy" />;
  return <div className={`${sizeMap[size]} bg-gradient-to-br ${grad} flex items-center justify-center text-white font-bold flex-shrink-0`}>{initials(name)}</div>;
}

function PeopleCard({ item, accentClass, ctaClass, ctaLabel, onConnect, onMessage, connectionStatus }) {
  const isPending = connectionStatus?.status === 'pending' && connectionStatus?.isSender;
  const isAccepted = connectionStatus?.status === 'accepted';
  return (
    <div className="border border-slate-100 rounded-2xl p-4 hover:border-indigo-100 hover:shadow-md transition-all lift">
      <div className="flex items-start gap-3 mb-3">
        <Avatar name={item.name} avatar={item.avatar} grad={item.grad} size="lg" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900 text-sm leading-snug">{item.name}</p>
          <p className="text-xs text-slate-500 truncate">{item.role}</p>
          {item.location && <p className="text-xs text-slate-400 flex items-center gap-0.5 mt-0.5"><MapPin className="w-3 h-3" />{item.location}</p>}
        </div>
        {item.available !== undefined && <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1 ${item.available ? 'bg-emerald-400' : 'bg-slate-300'}`} />}
      </div>
      {(item.expertise || item.skills || []).length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {(item.expertise || item.skills).slice(0, 3).map((t, i) => (
            <span key={i} className={`text-xs px-2 py-0.5 rounded-full font-medium ${accentClass}`}>{t}</span>
          ))}
        </div>
      )}
      {item.why && (
        <div className={`flex items-start gap-1.5 p-2.5 rounded-xl mb-3 ${accentClass}`}>
          <Sparkles className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 opacity-70" />
          <p className="text-xs leading-relaxed italic">{item.why}</p>
        </div>
      )}
      <div className="flex flex-col sm:flex-row gap-2">
        <button onClick={onMessage} className="flex-1 flex items-center justify-center gap-1.5 py-2 border-2 border-slate-200 text-slate-600 hover:border-indigo-200 hover:text-indigo-600 rounded-xl text-xs font-bold transition-all">
          <MessageSquare className="w-3.5 h-3.5" /> Message
        </button>
        {isAccepted ? (
          <div className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-emerald-50 border-2 border-emerald-200 text-emerald-700 rounded-xl text-xs font-bold">
            <CheckCircle className="w-3.5 h-3.5" /> Connected
          </div>
        ) : isPending ? (
          <div className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-amber-50 border-2 border-amber-200 text-amber-700 rounded-xl text-xs font-bold">
            <Clock className="w-3.5 h-3.5" /> Pending
          </div>
        ) : (
          <button onClick={onConnect} className={`flex-1 flex items-center justify-center gap-1.5 py-2 ${ctaClass} text-white rounded-xl text-xs font-bold hover:opacity-90 transition-all`}>
            <UserPlus className="w-3.5 h-3.5" /> {ctaLabel}
          </button>
        )}
      </div>
    </div>
  );
}

function PendingRequestCard({ req, onAccept, onDecline, loading }) {
  const sender = req.sender || {};
  const typeLabel = req.type === 'mentor_request' ? 'Mentorship Request' : 'Co-Founder Request';
  // ✅ avatar is already a signed URL now
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-indigo-50/60 border border-indigo-100">
      <Avatar name={sender.full_name} avatar={sender.avatar_url} grad={roleGrad(sender.user_type)} size="md" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-slate-900 text-sm">{sender.full_name || 'Someone'}</p>
        <p className="text-xs text-slate-500">{typeLabel}{sender.location ? ` · ${sender.location}` : ''}</p>
        {req.message && <p className="text-xs text-slate-600 mt-1 italic truncate">"{req.message}"</p>}
        <div className="flex gap-2 mt-2">
          <button onClick={() => onAccept(req.id)} disabled={loading} className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50">
            <UserCheck className="w-3 h-3" /> Accept
          </button>
          <button onClick={() => onDecline(req.id)} disabled={loading} className="flex items-center gap-1 px-3 py-1.5 bg-white text-slate-600 text-xs font-bold rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50">
            <UserX className="w-3 h-3" /> Decline
          </button>
        </div>
      </div>
      <span className="text-xs text-slate-400 flex-shrink-0">{timeAgo(req.created_at)}</span>
    </div>
  );
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [sp, setSp] = useState(null);
  const [activities, setActivities] = useState([]);
  const [convos, setConvos] = useState([]);
  const [mentors, setMentors] = useState([]);
  const [coFounders, setCoFounders] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [hasConnectedMentor, setHasConnectedMentor] = useState(false);
  const [connectionStatuses, setConnectionStatuses] = useState({});
  const [opportunities, setOpportunities] = useState([]);

  // ✅ NEW: Separate state for current user's avatar
  const [currentUserAvatarUrl, setCurrentUserAvatarUrl] = useState(null);

  const [pageLoading, setPageLoading] = useState(true);
  const [connsLoading, setConnsLoading] = useState(false);
  const [journeySaving, setJourneySaving] = useState(null);
  const [requestActionLoading, setRequestActionLoading] = useState(null);
  const [showMore, setShowMore] = useState({ mentors: false, cf: false, opps: false });

  const loadAll = useCallback(async () => {
    if (!user) return;
    try {
      const [profRes, actRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
        supabase.from('student_activities').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(8),
      ]);
      setProfile(profRes.data || {});
      setActivities(actRes.data || []);

      // ✅ Get signed URL for current user's avatar
      if (profRes.data?.avatar_url) {
        const signedUrl = await getSignedUrl(profRes.data.avatar_url);
        setCurrentUserAvatarUrl(signedUrl);
      }

      const { data: spData } = await supabase.from('student_profiles').select('*').eq('user_id', user.id).maybeSingle();
      setSp(spData || {});

      const { data: mentorConn } = await supabase
        .from('connection_requests')
        .select('id')
        .or(`and(sender_id.eq.${user.id},type.eq.mentor_request,status.eq.accepted),and(receiver_id.eq.${user.id},type.eq.mentor_request,status.eq.accepted)`)
        .maybeSingle();
      setHasConnectedMentor(!!mentorConn);
      setPageLoading(false);

      setConnsLoading(true);
      try {
        const [convData, mentorData, cfData, reqData, oppData] = await Promise.all([
          fetchConversations(user.id).catch(() => []),
          fetchMentors({ limit: 6 }).catch(() => []),
          fetchCoFounders({ limit: 6 }).catch(() => []),
          fetchIncomingRequests(user.id).catch(() => []),
          supabase.from('opportunities').select('*').eq('is_active', true).order('deadline', { ascending: true }).limit(5).then(r => r.data || []).catch(() => []),
        ]);

        // ✅ Convert ALL avatar paths to signed URLs in parallel
        const [mentorsWithUrls, cfWithUrls, reqsWithUrls, convsWithUrls] = await Promise.all([
          batchGetSignedUrls(mentorData, 'profiles.avatar_url'),
          batchGetSignedUrls(cfData, 'profiles.avatar_url'),
          batchGetSignedUrls(reqData, 'sender.avatar_url'),
          batchGetSignedUrls(convData, 'otherUser.avatar_url'),
        ]);

        setConvos(convsWithUrls);
        setMentors(mentorsWithUrls.map(shapeMentor));
        setCoFounders(cfWithUrls.filter(r => r.user_id !== user.id).map(r => shapeCofounder(r, user.id)));
        setIncomingRequests(reqsWithUrls);
        setOpportunities(oppData);

        const statuses = {};
        for (const m of mentorsWithUrls.slice(0, 6)) {
          try { const status = await getConnectionStatus(user.id, m.user_id, 'mentor_request'); if (status) statuses[m.user_id] = status; } catch { }
        }
        setConnectionStatuses(statuses);
      } finally { setConnsLoading(false); }
    } catch (err) { console.error('[Dashboard] loadAll:', err); setPageLoading(false); }
  }, [user]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const setJourneyField = async (field, value) => {
    if (journeySaving) return;
    const prevValue = sp?.[field];
    setJourneySaving(field);
    setSp(prev => ({ ...prev, [field]: value }));
    try {
      const merged = { ...(sp || {}), [field]: value, updated_at: new Date().toISOString() };
      Object.keys(merged).forEach(k => { if (merged[k] === undefined) delete merged[k]; });
      merged.user_id = user.id;
      const { error } = await supabase.from('student_profiles').upsert(merged, { onConflict: 'user_id' });
      if (error) throw error;
      const { data: mc } = await supabase.from('connection_requests').select('id')
        .or(`and(sender_id.eq.${user.id},type.eq.mentor_request,status.eq.accepted),and(receiver_id.eq.${user.id},type.eq.mentor_request,status.eq.accepted)`)
        .maybeSingle();
      setHasConnectedMentor(!!mc);
      logActivity(field, field === 'has_startup_idea' ? (value ? 'Confirmed having a startup idea' : 'Marked as exploring') : (value ? 'Connected with a co-founder' : 'Updated co-founder status'));
    } catch (err) {
      console.error('[Dashboard] journey save:', err);
      setSp(prev => ({ ...prev, [field]: prevValue }));
    } finally { setJourneySaving(null); }
  };

  const logActivity = async (type, description) => {
    const entry = { user_id: user.id, type, description, created_at: new Date().toISOString() };
    setActivities(prev => [entry, ...prev].slice(0, 8));
    try { await supabase.from('student_activities').insert(entry); } catch (err) { console.error('[Dashboard] logActivity:', err.message); }
  };

  const handleAcceptRequest = async (requestId) => {
    setRequestActionLoading(requestId);
    try {
      await respondToRequest(requestId, 'accepted');
      setIncomingRequests(prev => prev.filter(r => r.id !== requestId));
      const { data: mc } = await supabase.from('connection_requests').select('id')
        .or(`and(sender_id.eq.${user.id},type.eq.mentor_request,status.eq.accepted),and(receiver_id.eq.${user.id},type.eq.mentor_request,status.eq.accepted)`)
        .maybeSingle();
      setHasConnectedMentor(!!mc);
      logActivity('request_accepted', 'Accepted a connection request');
    } catch (err) { console.error(err); }
    finally { setRequestActionLoading(null); }
  };

  const handleDeclineRequest = async (requestId) => {
    setRequestActionLoading(requestId);
    try { await respondToRequest(requestId, 'declined'); setIncomingRequests(prev => prev.filter(r => r.id !== requestId)); } catch (err) { console.error(err); }
    finally { setRequestActionLoading(null); }
  };

  const handleConnect = async (targetUserId, type, targetName) => {
    try {
      const result = await sendConnectionRequest(user.id, targetUserId, type);
      if (result?.alreadySent) { setConnectionStatuses(prev => ({ ...prev, [targetUserId]: { status: 'pending', isSender: true } })); return; }
      setConnectionStatuses(prev => ({ ...prev, [targetUserId]: { status: 'pending', isSender: true } }));
      logActivity(type === 'mentor_request' ? 'mentor_request' : 'cofounder_connect', type === 'mentor_request' ? `Requested mentorship from ${targetName}` : `Sent co-founder request to ${targetName}`);
    } catch (err) { console.error(err); }
  };

  const tog = k => setShowMore(p => ({ ...p, [k]: !p[k] }));

  if (pageLoading) return (
    <><style>{CSS}</style><div className="min-h-screen page-bg flex items-center justify-center">
      <div className="text-center"><div className="w-12 h-12 rounded-2xl g-ind flex items-center justify-center mx-auto mb-4"><Brain className="w-6 h-6 text-white" /></div><p className="font-bold text-slate-900 text-lg mb-1">Loading Dashboard</p><p className="text-slate-400 text-sm">Fetching your journey…</p></div>
    </div></>
  );

  const p = profile || {};
  const s = sp || {};
  const firstName = p.full_name?.split(' ')[0] || 'there';
  const completion = p.profile_completion || 0;
  const unread = convos.reduce((sum, c) => sum + (c.unreadCount || 0), 0);

  const hasStartupIdea = s.has_startup_idea || false;
  const hasCofounder = s.has_cofounder || false;
  const ideaAnswered = s.has_startup_idea !== null && s.has_startup_idea !== undefined;

  let primaryCTA;
  if (!ideaAnswered || !hasStartupIdea) primaryCTA = { label: 'Explore Ideas', icon: <Search className="w-4 h-4" />, to: '/discover', grad: 'g-ind' };
  else if (!hasCofounder) primaryCTA = { label: 'Find Co-Founder', icon: <UserPlus className="w-4 h-4" />, to: '/find-cofounders', grad: 'g-vi' };
  else primaryCTA = { label: 'Find Mentor', icon: <Users className="w-4 h-4" />, to: '/find-mentors', grad: 'g-ind' };

  const milestones = [
    { id: 'profile', label: 'Complete your profile', done: completion >= 60, icon: '👤' },
    { id: 'idea', label: 'Answer — have an idea?', done: ideaAnswered, icon: '💡' },
    { id: 'mentor', label: 'Connect with a mentor', done: hasConnectedMentor, icon: '🤝' },
    { id: 'cofounder', label: 'Find a co-founder', done: hasCofounder, icon: '👥' },
    { id: 'message', label: 'Send your first message', done: convos.length > 0, icon: '💬' },
  ];

  return (
    <>
      <style>{CSS}</style>
      <div className="min-h-screen page-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-8 lg:py-24">

          {/* HERO */}
          <div className={`rounded-2xl sm:rounded-3xl border px-5 py-6 sm:px-10 sm:py-8 mb-5 sm:mb-6 relative overflow-hidden f0 ${hasStartupIdea ? 'bg-gradient-to-br from-slate-900 to-indigo-950 text-white border-indigo-900' : 'bg-gradient-to-br from-indigo-50 to-violet-50 border-indigo-100'}`}>
            <div className="absolute -right-12 -top-12 w-48 h-48 sm:w-64 sm:h-64 rounded-full opacity-10 blur-3xl" style={{ background: 'radial-gradient(circle, #818cf8, transparent)' }} />
            <div className="relative flex flex-col gap-5">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <span className={`inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full ${hasStartupIdea ? 'bg-white/10 text-white/80' : 'bg-indigo-100 text-indigo-600 border border-indigo-200'}`}>
                    <GraduationCap className="w-3.5 h-3.5" /> Student
                  </span>
                  {unread > 0 && <span className="inline-flex items-center gap-1 text-xs font-bold text-white bg-red-500 px-2.5 py-1 rounded-full"><Bell className="w-3 h-3" /> {unread} unread</span>}
                  {incomingRequests.length > 0 && <span className="inline-flex items-center gap-1 text-xs font-bold text-white bg-violet-500 px-2.5 py-1 rounded-full"><Inbox className="w-3 h-3" /> {incomingRequests.length} request{incomingRequests.length > 1 ? 's' : ''}</span>}
                </div>
                <h1 className={`font-black text-2xl sm:text-3xl lg:text-4xl leading-none mb-3 ${hasStartupIdea ? 'text-white' : 'text-slate-900'}`}>
                  {hasStartupIdea ? `Build your startup, ${firstName} 🚀` : `Welcome, ${firstName} 👋`}
                </h1>
                <p className={`text-sm max-w-lg leading-relaxed ${hasStartupIdea ? 'text-white/70' : 'text-slate-500'}`}>
                  {hasStartupIdea ? 'Your mission control. Find the right mentor, co-founder, and investor.' : 'Explore mentors, find co-founders, discover startup ideas, and build your network.'}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row flex-wrap gap-2.5">
                <Link to={primaryCTA.to} className={`qa ${primaryCTA.grad} text-white flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-sm shadow-lg`}>{primaryCTA.icon} {primaryCTA.label}</Link>
                <Link to="/find-mentors" className={`qa flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm border-2 ${hasStartupIdea ? 'bg-white/10 border-white/20 text-white hover:bg-white/20' : 'bg-white border-indigo-200 text-indigo-700 hover:bg-indigo-50'}`}><Users className="w-4 h-4" /> Mentors</Link>
                <Link to="/discover" className={`qa flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm border-2 ${hasStartupIdea ? 'bg-white/10 border-white/20 text-white hover:bg-white/20' : 'bg-white border-violet-200 text-violet-700 hover:bg-violet-50'}`}><Search className="w-4 h-4" /> Discover</Link>
              </div>
            </div>
          </div>

          {/* STATS */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5 sm:mb-6 f1">
            {[
              { label: 'Profile', value: `${completion}%`, sub: completion >= 80 ? 'Looking great' : 'Add more info', Icon: Shield, grad: 'from-indigo-500 to-violet-600' },
              { label: 'Progress', value: `${milestones.filter(m => m.done).length}/${milestones.length}`, sub: 'milestones done', Icon: Award, grad: 'from-amber-400 to-orange-500' },
              { label: 'Messages', value: `${convos.length}`, sub: unread > 0 ? `${unread} unread` : 'All read', Icon: MessageSquare, grad: 'from-blue-500 to-indigo-500' },
              { label: 'Requests', value: `${incomingRequests.length}`, sub: incomingRequests.length > 0 ? 'Pending review' : 'No pending', Icon: Inbox, grad: incomingRequests.length > 0 ? 'from-violet-500 to-purple-500' : 'from-slate-300 to-slate-400' },
            ].map((stat, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-100 lift">
                <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br ${stat.grad} flex items-center justify-center text-white mb-2.5`}><stat.Icon className="w-4 h-4 sm:w-5 sm:h-5" /></div>
                <p className="font-black text-xl sm:text-2xl text-slate-900">{stat.value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{stat.label}</p>
                <p className="text-xs text-indigo-600 font-semibold mt-1">{stat.sub}</p>
              </div>
            ))}
          </div>

          {/* MAIN GRID */}
          <div className="grid lg:grid-cols-3 gap-5 sm:gap-6">
            <div className="lg:col-span-2 space-y-5 sm:space-y-6">

              {incomingRequests.length > 0 && (
                <Card className="f0">
                  <SectionHead title="Pending Requests" icon={<Inbox className="w-5 h-5 text-violet-500" />} />
                  <div className="px-5 sm:px-6 pb-5 sm:pb-6 space-y-3">
                    {incomingRequests.map(req => <PendingRequestCard key={req.id} req={req} loading={requestActionLoading === req.id} onAccept={handleAcceptRequest} onDecline={handleDeclineRequest} />)}
                  </div>
                </Card>
              )}

              {/* JOURNEY — No more "Locked" states */}
              <Card className="f1">
                <SectionHead title="Your Journey" icon={<Target className="w-5 h-5 text-indigo-500" />} />
                <div className="px-5 sm:px-6 pb-5 sm:pb-6 space-y-3">
                  <div className={`journey-item ${ideaAnswered ? 'done' : 'active'}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-base flex-shrink-0 ${ideaAnswered ? 'bg-emerald-100' : 'bg-indigo-100'}`}>{ideaAnswered ? '✓' : '💡'}</div>
                        <div className="min-w-0"><p className="font-semibold text-slate-900 text-sm">Startup Idea</p><p className="text-xs text-slate-500">{hasStartupIdea ? 'You have an idea 🚀' : 'Still exploring'}</p></div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button onClick={() => setJourneyField('has_startup_idea', true)} disabled={journeySaving === 'has_startup_idea'} className={`text-xs font-bold px-3 py-1.5 rounded-lg border-2 transition-all disabled:opacity-50 ${hasStartupIdea ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-500 hover:border-indigo-200'}`}>{journeySaving === 'has_startup_idea' ? '...' : 'Yes'}</button>
                        <button onClick={() => setJourneyField('has_startup_idea', false)} disabled={journeySaving === 'has_startup_idea'} className={`text-xs font-bold px-3 py-1.5 rounded-lg border-2 transition-all disabled:opacity-50 ${!hasStartupIdea && ideaAnswered ? 'border-slate-400 bg-slate-100 text-slate-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>No</button>
                      </div>
                    </div>
                  </div>

                  <div className={`journey-item ${hasCofounder ? 'done' : ideaAnswered && hasStartupIdea ? 'active' : ''}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-base flex-shrink-0 ${hasCofounder ? 'bg-emerald-100' : ideaAnswered && hasStartupIdea ? 'bg-indigo-100' : 'bg-slate-100'}`}>{hasCofounder ? '✓' : '👥'}</div>
                        <div><p className="font-semibold text-slate-900 text-sm">Co-Founder</p><p className="text-xs text-slate-500">{hasCofounder ? 'You have a co-founder ✓' : hasStartupIdea ? 'Looking for a co-founder' : 'Answer idea step first'}</p></div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button onClick={() => setJourneyField('has_cofounder', true)} disabled={journeySaving === 'has_cofounder' || (!ideaAnswered && !hasStartupIdea)} className={`text-xs font-bold px-3 py-1.5 rounded-lg border-2 transition-all disabled:opacity-40 ${hasCofounder ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500 hover:border-emerald-200'}`}>{journeySaving === 'has_cofounder' ? '...' : 'Yes'}</button>
                        <button onClick={() => setJourneyField('has_cofounder', false)} disabled={journeySaving === 'has_cofounder'} className={`text-xs font-bold px-3 py-1.5 rounded-lg border-2 transition-all disabled:opacity-50 ${!hasCofounder ? 'border-slate-400 bg-slate-100 text-slate-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>No</button>
                      </div>
                    </div>
                  </div>

                  <div className={`journey-item ${hasConnectedMentor ? 'done' : ideaAnswered ? 'active' : ''}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-base flex-shrink-0 ${hasConnectedMentor ? 'bg-emerald-100' : 'bg-slate-100'}`}>{hasConnectedMentor ? '✓' : '🤝'}</div>
                        <div><p className="font-semibold text-slate-900 text-sm">Mentor Connection</p><p className="text-xs text-slate-500">{hasConnectedMentor ? 'Connected with a mentor ✓' : 'No mentor yet — they speed up everything'}</p></div>
                      </div>
                      {!hasConnectedMentor && <Link to="/find-mentors" className="text-xs font-bold px-3 py-1.5 g-ind text-white rounded-lg hover:opacity-90 flex items-center gap-1 flex-shrink-0">Find <ArrowRight className="w-3 h-3" /></Link>}
                    </div>
                  </div>

                  <div className="mt-1 p-4 rounded-2xl bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-100">
                    <div className="flex items-start gap-3">
                      <Zap className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-bold text-indigo-700 uppercase tracking-wide mb-0.5">Recommended Next Action</p>
                        <p className="text-sm font-semibold text-slate-800">
                          {!ideaAnswered ? 'Answer the journey questions above to get personalised guidance.'
                            : !hasStartupIdea ? "Explore ideas and mentors — you don't need an idea to start building your network."
                              : !hasCofounder ? 'You have an idea — now find a co-founder with complementary skills.'
                                : !hasConnectedMentor ? 'Great team! Now find a mentor to guide your startup journey.'
                                  : "You're on track. Focus on validating your idea with real users."}
                        </p>
                        <Link to={primaryCTA.to} className="inline-flex items-center gap-1.5 mt-2 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-all">{primaryCTA.label} <ArrowRight className="w-3.5 h-3.5" /></Link>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* STARTUP IDEA CARD — Now editable from Profile */}
              {hasStartupIdea && (
                <Card className="f1">
                  <div className="px-5 sm:px-6 pt-5 sm:pt-6 pb-3">
                    <div className="flex items-center justify-between">
                      <h2 className="font-bold text-slate-900 text-base sm:text-lg flex items-center gap-2"><Lightbulb className="w-5 h-5 text-amber-500" /> Your Startup Idea</h2>
                      <Link to="/profile" className="text-xs text-indigo-600 font-semibold flex items-center gap-1 hover:gap-2 transition-all">Edit <Edit3 className="w-3 h-3" /></Link>
                    </div>
                  </div>
                  <div className="px-5 sm:px-6 pb-5 sm:pb-6">
                    {s.startup_idea_description ? (
                      <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl"><p className="text-sm text-slate-700 leading-relaxed">{s.startup_idea_description}</p></div>
                    ) : (
                      <div className="p-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl text-center">
                        <p className="text-sm text-slate-500 mb-2">You haven't described your idea yet.</p>
                        <Link to="/profile" className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800"><Edit3 className="w-3.5 h-3.5" /> Add idea description</Link>
                      </div>
                    )}
                    {!hasCofounder && <div className="mt-3 flex items-center gap-2 p-3 bg-violet-50 border border-violet-100 rounded-xl"><UserPlus className="w-4 h-4 text-violet-500 flex-shrink-0" /><p className="text-xs text-violet-700"><Link to="/find-cofounders" className="font-bold underline">Find a co-founder</Link> to build this with you.</p></div>}
                  </div>
                </Card>
              )}

              {/* QUICK ACTIONS */}
              <Card className="f2">
                <SectionHead title="Quick Actions" icon={<Zap className="w-5 h-5 text-amber-500" />} />
                <div className="px-5 sm:px-6 pb-5 sm:pb-6">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[
                      { Icon: Users, grad: 'g-ind', label: 'Find a Mentor', desc: 'Get guidance from experienced founders.', cta: 'Browse', to: '/find-mentors' },
                      { Icon: Rocket, grad: 'g-vi', label: 'Start a Startup', desc: hasStartupIdea ? 'Build out your idea.' : "Explore what others are building.", cta: hasStartupIdea ? 'My Startup' : 'Discover', to: hasStartupIdea ? '/profile' : '/discover', highlight: hasStartupIdea },
                      { Icon: Shield, grad: 'g-em', label: 'Complete Profile', desc: `${completion}% complete — better matches.`, cta: 'Edit', to: '/profile', done: completion >= 100 },
                    ].map((card, i) => (
                      <div key={i} className={`rounded-2xl p-4 sm:p-5 border-2 ${card.highlight ? 'border-violet-200 bg-violet-50' : card.done ? 'border-emerald-200 bg-emerald-50' : 'border-slate-100 bg-white'} lift`}>
                        <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl ${card.grad} flex items-center justify-center text-white mb-3`}><card.Icon className="w-4 h-4 sm:w-5 sm:h-5" /></div>
                        <h3 className="font-bold text-slate-900 text-sm mb-1">{card.label}</h3>
                        <p className="text-xs text-slate-500 leading-relaxed mb-3">{card.desc}</p>
                        <Link to={card.to} className={`inline-flex items-center gap-1.5 text-xs font-bold ${card.done ? 'text-emerald-700' : card.highlight ? 'text-violet-700' : 'text-indigo-600'} hover:gap-2.5 transition-all`}>{card.cta} <ArrowRight className="w-3.5 h-3.5" /></Link>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>

              {/* SUGGESTED MENTORS */}
              <Card className="f2">
                <SectionHead title="Suggested Mentors" icon={<Users className="w-5 h-5 text-indigo-500" />} linkLabel="Browse All" linkTo="/find-mentors" />
                <div className="px-5 sm:px-6 pb-5 sm:pb-6">
                  <p className="text-xs text-slate-400 mb-4 flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-indigo-400" /> Matched to your skills and interests</p>
                  {connsLoading ? (<div className="space-y-3"><Shimmer h="h-28" /><Shimmer h="h-28" /><Shimmer h="h-24" /></div>) : mentors.length > 0 ? (
                    <>
                      <div className="space-y-3">{(showMore.mentors ? mentors : mentors.slice(0, 3)).map((m, i) => <PeopleCard key={m.id || i} item={m} accentClass="bg-indigo-50 text-indigo-700" ctaClass="g-ind" ctaLabel="Request" connectionStatus={connectionStatuses[m.user_id]} onConnect={() => handleConnect(m.user_id, 'mentor_request', m.name)} onMessage={() => { logActivity('message_sent', `Messaged ${m.name}`); navigate('/messages'); }} />)}</div>
                      {mentors.length > 3 && <button onClick={() => tog('mentors')} className="w-full mt-3 py-2.5 text-sm font-semibold text-indigo-600 hover:bg-indigo-50 rounded-xl flex items-center justify-center gap-1.5 transition-all">{showMore.mentors ? <><ChevronUp className="w-4 h-4" />Show less</> : <><ChevronDown className="w-4 h-4" />See {mentors.length - 3} more</>}</button>}
                    </>
                  ) : (
                    <div className="py-8 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200"><p className="text-slate-400 text-sm mb-3">No mentors found yet.</p><Link to="/find-mentors" className="inline-flex items-center gap-1.5 g-ind text-white text-xs font-bold px-4 py-2 rounded-xl">Browse Mentors</Link></div>
                  )}
                </div>
              </Card>

              {/* SUGGESTED CO-FOUNDERS */}
              <Card className="f3">
                <SectionHead title="Suggested Co-Founders" icon={<UserPlus className="w-5 h-5 text-violet-500" />} linkLabel="Browse All" linkTo="/find-cofounders" />
                <div className="px-5 sm:px-6 pb-5 sm:pb-6">
                  <p className="text-xs text-slate-400 mb-4 flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-violet-400" /> Students actively looking to build together</p>
                  {connsLoading ? (<div className="space-y-3"><Shimmer h="h-24" /><Shimmer h="h-24" /></div>) : coFounders.length > 0 ? (
                    <>
                      <div className="space-y-3">{(showMore.cf ? coFounders : coFounders.slice(0, 3)).map((cf, i) => <PeopleCard key={cf.id || i} item={cf} accentClass="bg-violet-50 text-violet-700" ctaClass="g-vi" ctaLabel="Connect" onConnect={() => handleConnect(cf.user_id, 'cofounder_request', cf.name)} onMessage={() => { logActivity('message_sent', `Messaged ${cf.name}`); navigate('/messages'); }} />)}</div>
                      {coFounders.length > 3 && <button onClick={() => tog('cf')} className="w-full mt-3 py-2.5 text-sm font-semibold text-violet-600 hover:bg-violet-50 rounded-xl flex items-center justify-center gap-1.5 transition-all">{showMore.cf ? <><ChevronUp className="w-4 h-4" />Show less</> : <><ChevronDown className="w-4 h-4" />See {coFounders.length - 3} more</>}</button>}
                    </>
                  ) : (
                    <div className="py-8 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200"><p className="text-slate-400 text-sm mb-3">No co-founders found yet.</p><Link to="/find-cofounders" className="inline-flex items-center gap-1.5 g-vi text-white text-xs font-bold px-4 py-2 rounded-xl">Browse Co-Founders</Link></div>
                  )}
                </div>
              </Card>

              {/* RECENT ACTIVITY */}
              <Card className="f3">
                <SectionHead title="Recent Activity" icon={<Activity className="w-5 h-5 text-blue-500" />} linkLabel="Open Messages" linkTo="/messages" />
                <div className="px-5 sm:px-6 pb-5 sm:pb-6">
                  {convos.length > 0 ? (
                    <div className="space-y-2 mb-4">
                      {convos.slice(0, 4).map(c => {
                        const other = c.otherUser || {};
                        return (
                          <Link key={c.id} to="/messages" className={`flex items-start gap-3 p-3 sm:p-3.5 rounded-2xl transition-all hover:bg-slate-50 ${c.unreadCount > 0 ? 'border-l-4 border-indigo-500 bg-indigo-50/50' : ''}`}>
                            <div className="relative flex-shrink-0">
                              <Avatar name={other.full_name} avatar={other.avatar_url} grad={roleGrad(other.user_type)} size="md" />
                              {c.unreadCount > 0 && <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-indigo-500 rounded-full border-2 border-white unread-dot" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between mb-0.5">
                                <p className="font-semibold text-slate-900 text-sm truncate">{other.full_name || 'Unknown'}</p>
                                <span className="text-xs text-slate-400 flex-shrink-0 ml-2">{timeAgo(c.last_message_at)}</span>
                              </div>
                              <p className={`text-xs truncate ${c.unreadCount > 0 ? 'text-slate-700 font-medium' : 'text-slate-400'}`}>{c.lastMessage?.content || 'Start a conversation'}</p>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="py-6 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 mb-4">
                      <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-slate-400 text-sm">No messages yet.</p>
                      <p className="text-xs text-slate-400 mt-1">Request a mentor to start your first conversation.</p>
                    </div>
                  )}
                  {activities.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Recent Actions</p>
                      {activities.slice(0, 4).map((act, i) => (
                        <div key={i} className="flex items-center gap-2.5 py-1.5">
                          <div className="w-6 h-6 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0"><Activity className="w-3.5 h-3.5 text-indigo-500" /></div>
                          <p className="text-xs text-slate-700 truncate flex-1">{act.description}</p>
                          <span className="text-xs text-slate-400 flex-shrink-0">{timeAgo(act.created_at)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <Link to="/messages" className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 border-2 border-indigo-100 text-indigo-600 rounded-xl text-sm font-semibold hover:bg-indigo-50 transition-all"><Send className="w-4 h-4" /> Open Messages</Link>
                </div>
              </Card>

              {/* OPPORTUNITIES — Real data from DB */}
              <Card className="f4">
                <SectionHead title="Opportunities" icon={<Megaphone className="w-5 h-5 text-amber-500" />} linkLabel="See All" linkTo="/discover" />
                <div className="px-5 sm:px-6 pb-5 sm:pb-6">
                  <p className="text-xs text-slate-400 mb-4">Accelerators · Grants · Events — curated for student founders</p>
                  {opportunities.length > 0 ? (
                    <div className="space-y-3">
                      {(showMore.opps ? opportunities : opportunities.slice(0, 3)).map(opp => {
                        const tl = opp.deadline ? (() => { const d = Math.ceil((new Date(opp.deadline) - Date.now()) / 86400000); if (d < 0) return { label: 'Closed', cls: 'text-slate-400' }; if (d === 0) return { label: 'Today!', cls: 'text-red-600 font-bold' }; if (d <= 7) return { label: `${d}d left`, cls: 'text-orange-500 font-semibold' }; return { label: `${d}d left`, cls: 'text-slate-500' }; })() : null;
                        return (
                          <div key={opp.id} className="flex items-start gap-3 sm:gap-4 p-3 sm:p-4 rounded-2xl border border-slate-100 hover:border-indigo-100 hover:shadow-sm transition-all">
                            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl g-am flex items-center justify-center text-white flex-shrink-0"><Megaphone className="w-5 h-5" /></div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-slate-900 text-sm leading-snug mb-1">{opp.title}</p>
                              {opp.description && <p className="text-xs text-slate-500 mb-2 hidden sm:block line-clamp-2">{opp.description}</p>}
                              <div className="flex gap-3 text-xs">
                                {opp.deadline && <span className="text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3" />{opp.deadline}</span>}
                                {tl && <span className={`font-semibold ${tl.cls}`}>{tl.label}</span>}
                                {opp.link && <a href={opp.link} target="_blank" rel="noreferrer" className="ml-auto g-ind text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:opacity-90 flex items-center gap-1"><ArrowUpRight className="w-3 h-3" />Apply</a>}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {opportunities.length > 3 && <button onClick={() => tog('opps')} className="w-full mt-3 py-2.5 text-sm font-semibold text-amber-600 hover:bg-amber-50 rounded-xl flex items-center justify-center gap-1.5 transition-all">{showMore.opps ? <><ChevronUp className="w-4 h-4" />Show less</> : <><ChevronDown className="w-4 h-4" />See {opportunities.length - 3} more</>}</button>}
                    </div>
                  ) : (
                    <div className="py-8 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                      <Megaphone className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-slate-400 text-sm">No open opportunities right now.</p>
                      <Link to="/discover" className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 mt-2">Check Discover <ArrowRight className="w-3.5 h-3.5" /></Link>
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* SIDEBAR */}
            <div className="space-y-5">
              <div className="g-dk rounded-2xl p-5 sm:p-6 text-white relative overflow-hidden f0 lift sidebar-profile-card">
                <div className="absolute -right-6 -bottom-6 w-28 h-28 bg-white/10 rounded-full" />
                <div className="relative">
                  <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-lg">My Profile</h3><Shield className="w-5 h-5 text-slate-400" /></div>
                  <div className="flex items-center gap-3 mb-4">
                    <Avatar name={p.full_name} avatar={currentUserAvatarUrl} grad="from-indigo-400 to-violet-500" size="xl" />
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{p.full_name || 'Complete your profile'}</p>
                      <p className="text-slate-400 text-xs flex items-center gap-1 mt-0.5"><GraduationCap className="w-3 h-3" />{s.university || 'Student'}</p>
                      {p.location && <p className="text-slate-400 text-xs flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" />{p.location}</p>}
                    </div>
                  </div>
                  <div className="flex justify-between text-sm mb-1.5"><span className="text-slate-400">Profile Complete</span><span className="font-bold">{completion}%</span></div>
                  <div className="h-2 bg-white/20 rounded-full overflow-hidden mb-4"><div className="h-full bg-white rounded-full transition-all duration-700" style={{ width: `${completion}%` }} /></div>
                  {s.help_needed && s.help_needed.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs text-slate-400 mb-1.5">Needs help with:</p>
                      <div className="flex flex-wrap gap-1">{s.help_needed.slice(0, 3).map((h, i) => <span key={i} className="text-[10px] bg-white/10 text-white/80 px-2 py-0.5 rounded-full">{h}</span>)}</div>
                    </div>
                  )}
                  <Link to="/profile" className="flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 text-white text-sm font-semibold py-2.5 rounded-xl transition-all"><Edit3 className="w-4 h-4" /> Edit Profile</Link>
                </div>
              </div>

              {/* MILESTONES (no XP numbers) */}
              <Card className="f1">
                <div className="px-5 sm:px-6 pt-5 pb-2">
                  <div className="flex items-center justify-between"><h3 className="font-bold text-slate-900 flex items-center gap-2"><Award className="w-4 h-4 text-violet-500" /> Progress</h3><span className="text-xs text-slate-400">{milestones.filter(m => m.done).length}/{milestones.length}</span></div>
                </div>
                <div className="px-5 sm:px-6 pb-5 sm:pb-6 space-y-2">
                  {milestones.map(m => (
                    <div key={m.id} className={`flex items-center gap-2.5 p-2.5 rounded-xl ${m.done ? 'bg-emerald-50' : 'bg-slate-50'}`}>
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-sm flex-shrink-0 ${m.done ? 'bg-emerald-100' : 'bg-slate-200'}`}>{m.done ? '✓' : m.icon}</span>
                      <p className={`text-xs font-medium flex-1 ${m.done ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{m.label}</p>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="f2">
                <div className="px-5 sm:px-6 pt-5 pb-2"><h3 className="font-bold text-slate-900">Quick Links</h3></div>
                <div className="px-5 sm:px-6 pb-5 sm:pb-6 space-y-0.5">
                  {[
                    { Icon: Users, label: 'Find Mentors', to: '/find-mentors', col: 'text-indigo-600' },
                    { Icon: UserPlus, label: 'Find Co-Founder', to: '/find-cofounders', col: 'text-violet-600' },
                    { Icon: Inbox, label: 'Requests', to: '/connection-requests', col: 'text-violet-600', badge: incomingRequests.length > 0 ? incomingRequests.length : null },
                    { Icon: Search, label: 'Discover', to: '/discover', col: 'text-amber-600' },
                    { Icon: MessageSquare, label: 'Messages', to: '/messages', col: 'text-blue-600', badge: unread > 0 ? unread : null },
                    { Icon: Edit3, label: 'Edit Profile', to: '/profile', col: 'text-slate-500' },
                  ].map(({ Icon, label, to, col, badge }, i) => (
                    <Link key={i} to={to} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-all group">
                      <Icon className={`w-4 h-4 ${col}`} /><span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 flex-1">{label}</span>
                      {badge && <span className="w-5 h-5 bg-indigo-500 text-white text-xs font-bold rounded-full flex items-center justify-center">{badge}</span>}
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