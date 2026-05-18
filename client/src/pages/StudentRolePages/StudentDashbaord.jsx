<<<<<<< HEAD
import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../auth/AuthContext';
import { backendApi } from '../../lib/backendApi';
import { useRealtime } from '../../hooks/useRealtime';
import CofounderCard from '../../components/CoFounderCard';
import {
  fetchConversations,
  fetchIncomingRequests,
  fetchOpportunities,
  fetchOutgoingRequests,
  fetchCoFounders,
} from '../../services/studentService';
import {
  Rocket,
  Users,
  MessageSquare,
  UserPlus,
  Target,
  CheckCircle,
  Clock,
  GraduationCap,
  Shield,
  Edit3,
  Inbox,
  Loader,
  Megaphone,
  Settings,
  TrendingUp,
  Tag,
  X,
  Network,
  ArrowRight,
=======
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
  Info,
>>>>>>> 236542ff5c8b1c13469939b6a0bde2bae8b5b45f
} from 'lucide-react';
import toast from 'react-hot-toast';

<<<<<<< HEAD
// 🎨 BRAND CSS
const CSS = `
  :root {
    --primary: #98DE38;
    --primary-dark: #7EC42E;
    --secondary: #1B2D7F;
    --secondary-light: #2A3F8F;
    --black: #000000;
    --white: #FFFFFF;
    --gray-50: #F9FAFB;
    --gray-100: #F3F4F6;
    --gray-200: #E5E7EB;
  }

  .page-bg {
    background: var(--gray-50);
    background-image: radial-gradient(circle, rgba(152,222,56,.06) 1px, transparent 1px);
    background-size: 28px 28px;
  }

  .g-brand {
    background: linear-gradient(135deg, var(--primary), var(--primary-dark));
  }

  .g-sec {
    background: linear-gradient(135deg, var(--secondary), var(--secondary-light));
  }

  .lift {
    transition: transform .2s cubic-bezier(.22,.68,0,1.2), box-shadow .2s ease;
    will-change: transform;
  }

  .lift:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 32px rgba(27,45,127,.12);
  }

  .shimmer {
    background: linear-gradient(90deg, var(--gray-100) 25%, var(--gray-200) 50%, var(--gray-100) 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: 12px;
  }

  @keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  .journey-item {
    border: 2px solid var(--gray-200);
    border-radius: 14px;
    padding: 14px;
    transition: all .2s;
  }

  .journey-item.done {
    border-color: #10B981;
    background: #F0FDF4;
  }

  .journey-item.active {
    border-color: var(--secondary);
    background: #F8FAFC;
  }

  button:focus-visible,
  a:focus-visible {
    outline: 2px solid var(--primary);
    outline-offset: 2px;
  }

  .idea-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    background: rgba(152,222,56,0.15);
    color: #1B2D7F;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
  }

  .idea-stage {
    display: inline-block;
    padding: 2px 8px;
    background: rgba(27,45,127,0.1);
    color: #1B2D7F;
    border-radius: 12px;
    font-size: 10px;
    font-weight: 500;
=======
// 🔧 CHANGED: Added toast for user feedback
import toast from 'react-hot-toast';

// 🔧 CHANGED: Added CSS for tooltips, focus states, and better loading
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
>>>>>>> 236542ff5c8b1c13469939b6a0bde2bae8b5b45f
  }
  
  /* 🔧 CHANGED: Accessibility focus states & lightweight tooltip */
  button:focus-visible, a:focus-visible { outline: 2px solid #6366f1; outline-offset: 2px; }
  .tooltip-wrap{position:relative}
  .tooltip-wrap:hover .tooltip-box{opacity:1;visibility:visible;transform:translateY(0)}
  .tooltip-box{opacity:0;visibility:hidden;transform:translateY(4px);transition:all .15s ease;position:absolute;bottom:calc(100% + 8px);left:50%;transform:translateX(-50%) translateY(4px);background:#1e293b;color:#fff;font-size:11px;padding:8px 10px;border-radius:8px;white-space:nowrap;z-index:50;box-shadow:0 4px 12px rgba(0,0,0,.15);max-width:240px;white-space:normal;text-align:left}
  .tooltip-box::after{content:'';position:absolute;top:100%;left:50%;margin-left:-4px;border-width:4px;border-style:solid;border-color:#1e293b transparent transparent transparent}
`;

<<<<<<< HEAD
// 🔧 UTILS
const AVATAR_CACHE = new Map();
const CACHE_TTL = 30 * 60 * 1000;
=======
// 🔧 CHANGED: Safe fetch wrapper to prevent silent failures
async function safeFetch(promise, fallback = [], onError = null) {
  try {
    const res = await promise;
    return res?.data || fallback;
  } catch (error) {
    console.error('[SafeFetch] Error:', error);
    if (onError) onError(error);
    return fallback;
  }
}

// 🔧 CHANGED: AI match explanation generator
function getMatchExplanation(userProfile, suggested, matchType) {
  if (!userProfile) return ['Based on your profile activity'];
  const reasons = [];

  if (matchType === 'mentor') {
    const p = suggested.profiles || {};
    const skillOverlap = userProfile.skills?.filter(s => p.expertise_areas?.includes(s)) || [];
    if (skillOverlap.length) reasons.push(`Expertise overlap: ${skillOverlap.slice(0, 2).join(', ')}`);

    const interestOverlap = userProfile.interests?.filter(i => p.interests?.includes(i)) || [];
    if (interestOverlap.length) reasons.push(`Shared interest in ${interestOverlap[0]}`);

    if (userProfile.location && p.location === userProfile.location) reasons.push('Same location');
  } else {
    // Co-founder matching
    const userSkills = new Set(userProfile.skills_with_levels?.map(s => s.skill) || []);
    const candSkills = new Set((suggested.skills_with_levels || []).map(s => s.skill));
    const complementary = [...candSkills].filter(s => !userSkills.has(s)).slice(0, 2);
    if (complementary.length) reasons.push(`Complements with: ${complementary.join(', ')}`);

    if (suggested.has_startup_idea && userProfile.startup_idea_description) reasons.push('Both actively building');
  }

  return reasons.length > 0 ? reasons : ['Profile alignment based on activity'];
}

// 🔧 CHANGED: Simple avatar cache to reduce Supabase storage calls
const AVATAR_CACHE = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30 mins

async function getCachedSignedUrl(path) {
  if (!path || path.startsWith('http')) return path;
  const cacheKey = `avatar:${path}`;
  const cached = AVATAR_CACHE.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) return cached.url;

  try {
    const cleanPath = path.replace(/^avatars\//, '');
    const { data } = await supabase.storage.from('avatars').createSignedUrl(cleanPath, 3600);
    if (data?.signedUrl) {
      AVATAR_CACHE.set(cacheKey, { url: data.signedUrl, timestamp: Date.now() });
      return data.signedUrl;
    }
  } catch (e) { console.warn('Avatar URL error:', e); }
  return path;
}
>>>>>>> 236542ff5c8b1c13469939b6a0bde2bae8b5b45f

async function getCachedUrl(path) {
  if (!path || path.startsWith('http')) return path;

  const key = `av:${path}`;
  const cached = AVATAR_CACHE.get(key);

  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.url;
  }

  try {
    const cleanPath = path.replace('avatars/', '');
    const { data } = await supabase.storage
      .from('avatars')
      .createSignedUrl(cleanPath, 3600);

    if (data?.signedUrl) {
      AVATAR_CACHE.set(key, {
        url: data.signedUrl,
        ts: Date.now(),
      });

      return data.signedUrl;
    }
  } catch (err) {
    console.warn('Avatar signed URL failed:', err);
  }

  return null;
}

const initials = (name) => {
  if (!name) return '?';

  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
};

const timeAgo = (iso) => {
  if (!iso) return '';
<<<<<<< HEAD

  const seconds = (Date.now() - new Date(iso)) / 1000;

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;

  return `${Math.floor(seconds / 86400)}d`;
};

const safeObj = (val) => {
  return val && typeof val === 'object' && !Array.isArray(val) ? val : {};
};

// 🧩 AVATAR
const Avatar = memo(({ name, path, grad = 'from-gray-400 to-gray-500', size = 'md' }) => {
  const [url, setUrl] = useState(null);
  const [loading, setLoading] = useState(Boolean(path));

  useEffect(() => {
    let cancelled = false;

    if (!path) {
      setUrl(null);
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setLoading(true);

    getCachedUrl(path).then((signedUrl) => {
      if (!cancelled) {
        setUrl(signedUrl);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [path]);

  const sizeClass = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-14 h-14',
  }[size];

  if (loading) {
    return <div className={`${sizeClass} rounded-xl shimmer`} aria-hidden="true" />;
  }

  if (url) {
    return (
      <img
        src={url}
        alt=""
        className={`${sizeClass} object-cover rounded-xl`}
        loading="lazy"
        onError={() => setUrl(null)}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} bg-gradient-to-br ${grad} flex items-center justify-center text-white font-bold rounded-xl`}
      aria-hidden="true"
    >
      {initials(name)}
    </div>
  );
});

// 🔜 FUTURE ROLE PLACEHOLDER
const RolePlaceholder = ({ role, icon: Icon }) => (
  <div className="bg-white rounded-2xl p-6 border border-gray-100 text-center">
    <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-gray-50 flex items-center justify-center">
      <Icon className="w-6 h-6 text-gray-400" />
    </div>

    <h3 className="font-bold text-gray-900 mb-2 capitalize">
      {role} Dashboard
    </h3>

    <p className="text-sm text-gray-500 mb-4">
      This section is being optimized. Check back soon!
    </p>

    <button
      type="button"
      className="px-4 py-2 border border-gray-200 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50"
    >
      Coming Soon
    </button>
  </div>
);

// ✅ LINKEDIN-STYLE ACTION NOTICE
function ConnectionActionNotice({ notice, onClose, onMessage, onFeedback }) {
  if (!notice) return null;

  const isAccepted = notice.type === 'accepted';
  const person = notice.person || {};
  const name = person.full_name || 'User';

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm lift">
      <div className="flex items-start gap-3">
        <div
          className={`w-12 h-12 rounded-xl text-white flex items-center justify-center font-bold overflow-hidden flex-shrink-0 ${isAccepted
            ? 'bg-gradient-to-br from-indigo-500 to-purple-500'
            : 'bg-gradient-to-br from-gray-400 to-gray-600'
            }`}
        >
          {person.avatar_url ? (
            <Avatar name={name} path={person.avatar_url} size="lg" />
          ) : (
            name?.[0]?.toUpperCase() || '?'
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-900 text-sm">
            {isAccepted ? `${name} is now a connection.` : 'Invitation ignored.'}
          </p>

          <p className="text-xs text-gray-500 mt-1">
            {isAccepted
              ? 'You can now message each other in real time.'
              : `You won't see this request again.`}
          </p>

          <div className="flex flex-wrap gap-2 mt-3">
            {isAccepted ? (
              <button
                type="button"
                onClick={() => onMessage?.(person.id)}
                className="px-3 py-2 rounded-xl bg-[#98DE38] text-black text-xs font-bold hover:opacity-90"
              >
                Send a message to {name}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onFeedback?.(person.id, notice.requestId)}
                className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50"
              >
                I don&apos;t know {name}
              </button>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center flex-shrink-0"
          aria-label="Close notice"
        >
          <X className="w-4 text-gray-500" />
        </button>
      </div>
    </div>
  );
}

// ✅ MY CONNECTIONS CARD
function MyConnectionsCard({ connections = [], onMessage }) {
  const visibleConnections = connections.slice(0, 5);

  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-900 flex items-center gap-2">
          <Network className="w-4 text-[#1B2D7F]" />
          My Connections
        </h3>

        <span className="text-xs font-bold px-2 py-1 rounded-full bg-green-50 text-green-700">
          {connections.length}
        </span>
      </div>

      {connections.length === 0 ? (
        <div className="text-center py-6">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-50 flex items-center justify-center">
            <Users className="w-5 text-gray-400" />
          </div>

          <p className="text-sm text-gray-700 font-bold">
            No connections yet
          </p>

          <p className="text-xs text-gray-400 mt-1">
            Connect with co-founders and mentors to build your network.
          </p>

          <Link
            to="/find-cofounders"
            className="inline-flex mt-4 px-4 py-2 g-brand text-black text-xs font-bold rounded-xl hover:opacity-90"
          >
            Find Co-Founder
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleConnections.map((conn) => {
            const person = conn.otherUser || {};

            return (
              <div
                key={conn.id || person.id}
                className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 transition"
              >
                <Avatar
                  name={person.full_name}
                  path={person.avatar_url}
                  size="md"
                />

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">
                    {person.full_name || 'User'}
                  </p>

                  <p className="text-xs text-gray-500 truncate capitalize">
                    {person.user_type?.replace(/-/g, ' ') || 'Connection'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onMessage?.(person.id)}
                  className="px-2.5 py-1.5 text-xs font-bold rounded-lg border border-gray-200 hover:border-[#98DE38] hover:bg-[#98DE38]/10 transition"
                >
                  Message
                </button>
              </div>
            );
          })}
        </div>
      )}

      {connections.length > 5 && (
        <Link
          to="/my-connections"
          className="w-full mt-4 py-2 text-xs font-bold text-[#1B2D7F] hover:underline flex items-center justify-center gap-1"
        >
          View all connections <ArrowRight className="w-3" />
=======
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
    id: r.id, user_id: r.user_id, name: p.full_name || 'Mentor', init: initials(p.full_name),
    grad: 'from-violet-500 to-indigo-500', role: r.current_role || r.current_company || 'Mentor',
    expertise: (r.expertise_areas || []).slice(0, 3), location: p.location || 'Remote',
    available: !!(r.available_for?.length), avatar: p.avatar_url,
    why: `Expert in ${(r.expertise_areas || []).slice(0, 2).join(' & ') || 'mentorship'}.`,
  };
}

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
        <Link to={linkTo} className="text-xs text-indigo-600 font-semibold flex items-center gap-1 hover:gap-2 transition-all" aria-label={`Browse all ${title.toLowerCase()}`}>
          {linkLabel}<ChevronRight className="w-3.5 h-3.5" />
>>>>>>> 236542ff5c8b1c13469939b6a0bde2bae8b5b45f
        </Link>
      )}
    </div>
  );
}

<<<<<<< HEAD
function MentorSuggestionCard({
  mentor,
  connectionStatus,
  onStatusChange,
  onOpenChat,
}) {
  const [loading, setLoading] = useState(false);

  const mentorId = getPersonId(mentor);
  const name = mentor.full_name || 'Student Mentor';
  const score = getMatchScore(mentor);

  const handleConnect = async () => {
    if (!mentorId) {
      toast.error('Mentor user ID missing');
      return;
    }

    try {
      setLoading(true);

      const res = await backendApi.sendConnect(
        mentorId,
        `Hi ${name}, your profile looks relevant to my current startup learning needs. I’d like to connect for mentorship.`,
        'mentor_request'
      );

      if (res.alreadyConnected || res.status === 'accepted') {
        onStatusChange?.(mentorId, 'accepted');
        toast.success('Already connected');
        return;
      }

      onStatusChange?.(mentorId, 'pending');
      toast.success(
        res.alreadyPending ? 'Request already pending' : 'Mentor request sent',
        {
          style: {
            background: '#98DE38',
            color: '#000',
          },
        }
      );
    } catch (err) {
      console.error('Mentor connect error:', err);
      toast.error(err.message || 'Could not send mentor request');
    } finally {
      setLoading(false);
    }
  };

  const handleMessage = async () => {
    if (connectionStatus !== 'accepted') {
      toast.error('Connect first to send messages');
      return;
    }

    try {
      const res = await backendApi.getOrCreateConversation(mentorId);
      const convId = res.conversationId || res.id || res.data?.id;
      onOpenChat?.(convId);
    } catch (err) {
      console.error('Open mentor chat error:', err);
      toast.error('Could not open chat');
    }
  };

  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 hover:shadow-md transition lift">
      <div className="flex items-center gap-3 mb-3">
        <Avatar
          name={name}
          path={mentor.avatar_url}
          size="lg"
          grad="from-indigo-500 to-blue-500"
        />

        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-900 truncate">
            {name}
          </h3>

          <p className="text-xs text-gray-500 truncate">
            {mentor.university || mentor.location || 'Mentor match'}
          </p>
        </div>

        <span className="px-2 py-1 text-[10px] font-bold rounded-full bg-indigo-50 text-indigo-700 flex-shrink-0">
          {score}% Match
        </span>
=======
// 🔧 CHANGED: Avatar component with loading/error handling
function Avatar({ name, avatarPath, grad, size = 'md' }) {
  const [url, setUrl] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const resolve = async () => {
      setLoading(true);
      const resolved = await getCachedSignedUrl(avatarPath);
      if (!cancelled) { setUrl(resolved); setLoading(false); }
    };
    resolve();
    return () => { cancelled = true; };
  }, [avatarPath]);

  const sizeMap = { sm: 'w-8 h-8 text-xs rounded-lg', md: 'w-10 h-10 text-sm rounded-xl', lg: 'w-11 h-11 text-sm rounded-xl', xl: 'w-14 h-14 text-lg rounded-2xl' };

  if (loading) return <div className={`${sizeMap[size]} bg-slate-200 animate-pulse rounded-xl`} />;
  if (url) return <img src={url} alt={name || 'User'} className={`${sizeMap[size]} object-cover flex-shrink-0`} loading="lazy" onError={() => setUrl(null)} />;
  return <div className={`${sizeMap[size]} bg-gradient-to-br ${grad} flex items-center justify-center text-white font-bold flex-shrink-0`} aria-hidden="true">{initials(name)}</div>;
}

// 🔧 CHANGED: PeopleCard with AI match explanation tooltip & accessibility
function PeopleCard({ item, accentClass, ctaClass, ctaLabel, onConnect, onMessage, connectionStatus, userProfile }) {
  const isPending = connectionStatus?.status === 'pending' && connectionStatus?.isSender;
  const isAccepted = connectionStatus?.status === 'accepted';
  const matchType = item.expertise ? 'mentor' : 'cofounder';
  const reasons = getMatchExplanation(userProfile, item, matchType);

  return (
    <div className="border border-slate-100 rounded-2xl p-4 hover:border-indigo-100 hover:shadow-md transition-all lift">
      <div className="flex items-start gap-3 mb-3">
        <Avatar name={item.name} avatarPath={item.avatar} grad={item.grad} size="lg" />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900 text-sm leading-snug">{item.name}</p>
          <p className="text-xs text-slate-500 truncate">{item.role}</p>
          {item.location && <p className="text-xs text-slate-400 flex items-center gap-0.5 mt-0.5"><MapPin className="w-3 h-3" />{item.location}</p>}
        </div>
        {item.available !== undefined && <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1 ${item.available ? 'bg-emerald-400' : 'bg-slate-300'}`} aria-label={item.available ? 'Available' : 'Unavailable'} />}
>>>>>>> 236542ff5c8b1c13469939b6a0bde2bae8b5b45f
      </div>

      {mentor.bio && (
        <p className="text-xs text-gray-600 mb-3 line-clamp-2">
          {mentor.bio}
        </p>
      )}
<<<<<<< HEAD

      {mentor.reasons?.length > 0 && (
        <p className="text-xs text-gray-600 mb-4">
          {mentor.reasons.join(' • ')}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <Link
          to={`/user-profile/${mentorId}`}
          className="py-2 border-2 border-indigo-100 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-bold hover:bg-indigo-100 transition flex items-center justify-center"
        >
          View Profile
        </Link>

        <button
          type="button"
          onClick={handleMessage}
          disabled={connectionStatus !== 'accepted'}
          className={`py-2 border-2 rounded-xl text-xs font-bold transition flex items-center justify-center ${connectionStatus === 'accepted'
            ? 'border-gray-200 hover:border-gray-300 text-gray-800 bg-white'
            : 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed'
            }`}
        >
          <MessageSquare className="w-3.5 mr-1" />
          {connectionStatus === 'accepted' ? 'Message' : 'Connect first'}
        </button>

        {connectionStatus === 'accepted' ? (
          <button
            type="button"
            disabled
            className="py-2 bg-green-50 border border-green-200 text-green-700 rounded-xl text-xs font-bold flex items-center justify-center"
          >
            <CheckCircle className="w-3.5 mr-1" />
            Connected
          </button>
        ) : connectionStatus === 'pending' ? (
          <button
            type="button"
            disabled
            className="py-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl text-xs font-bold flex items-center justify-center"
          >
            <Clock className="w-3.5 mr-1" />
            Pending
          </button>
        ) : (
          <button
            type="button"
            onClick={handleConnect}
            disabled={loading}
            className="py-2 g-brand text-black rounded-xl text-xs font-black hover:opacity-90 transition flex items-center justify-center disabled:opacity-60"
          >
            {loading ? (
              <Loader className="w-3.5 animate-spin mr-1" />
            ) : (
              <GraduationCap className="w-3.5 mr-1" />
            )}
            {loading ? 'Sending...' : 'Request'}
=======
      {item.why && (
        <div className={`flex items-start gap-1.5 p-2.5 rounded-xl mb-3 ${accentClass} relative group tooltip-wrap`}>
          <Sparkles className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 opacity-70" />
          <p className="text-xs leading-relaxed italic">{item.why}</p>
          <button className="ml-auto text-[10px] text-indigo-400 hover:text-indigo-600 font-medium" aria-label="See why this person was suggested">
            Why?
          </button>
          <div className="tooltip-box">
            <p className="font-semibold mb-1">Match Reasons:</p>
            <ul className="list-disc list-inside space-y-0.5">
              {reasons.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          </div>
        </div>
      )}
      <div className="flex flex-col sm:flex-row gap-2">
        <button onClick={onMessage} className="flex-1 flex items-center justify-center gap-1.5 py-2 border-2 border-slate-200 text-slate-600 hover:border-indigo-200 hover:text-indigo-600 rounded-xl text-xs font-bold transition-all" aria-label={`Message ${item.name}`}>
          <MessageSquare className="w-3.5 h-3.5" /> Message
        </button>
        {isAccepted ? (
          <div className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-emerald-50 border-2 border-emerald-200 text-emerald-700 rounded-xl text-xs font-bold" aria-label="Already connected">
            <CheckCircle className="w-3.5 h-3.5" /> Connected
          </div>
        ) : isPending ? (
          <div className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-amber-50 border-2 border-amber-200 text-amber-700 rounded-xl text-xs font-bold" aria-label="Request pending">
            <Clock className="w-3.5 h-3.5" /> Pending
          </div>
        ) : (
          <button onClick={onConnect} className={`flex-1 flex items-center justify-center gap-1.5 py-2 ${ctaClass} text-white rounded-xl text-xs font-bold hover:opacity-90 transition-all`} aria-label={`Connect with ${item.name}`}>
            <UserPlus className="w-3.5 h-3.5" /> {ctaLabel}
>>>>>>> 236542ff5c8b1c13469939b6a0bde2bae8b5b45f
          </button>
        )}
      </div>
    </div>
  );
}

<<<<<<< HEAD
// 2) Add these helpers near other utils, before StudentDashboard component.
const hasLookingFor = (candidate, option) => {
  const values =
    candidate?.looking_for ||
    candidate?.student_profile?.looking_for ||
    candidate?.student_profiles?.looking_for ||
    candidate?.profile?.looking_for ||
    candidate?.profiles?.looking_for ||
    [];

  if (Array.isArray(values)) return values.includes(option);

  return String(values || '')
    .toLowerCase()
    .includes(option.toLowerCase());
};

const getPersonId = (candidate) => {
  const nestedProfile = Array.isArray(candidate?.profiles)
    ? candidate.profiles[0]
    : candidate?.profiles;

  return (
    candidate?.profile_id ||
    candidate?.user_id ||
    candidate?.id ||
    nestedProfile?.id ||
    candidate?.profile?.id
=======
function PendingRequestCard({ req, onAccept, onDecline, loading }) {
  const sender = req.sender || {};
  const typeLabel = req.type === 'mentor_request' ? 'Mentorship Request' : 'Co-Founder Request';
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-indigo-50/60 border border-indigo-100">
      <Avatar name={sender.full_name} avatarPath={sender.avatar_url} grad={roleGrad(sender.user_type)} size="md" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-slate-900 text-sm">{sender.full_name || 'Someone'}</p>
        <p className="text-xs text-slate-500">{typeLabel}{sender.location ? ` · ${sender.location}` : ''}</p>
        {req.message && <p className="text-xs text-slate-600 mt-1 italic truncate">"{req.message}"</p>}
        <div className="flex gap-2 mt-2">
          <button onClick={() => onAccept(req.id)} disabled={loading} className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50" aria-label={`Accept ${typeLabel}`}>
            <UserCheck className="w-3 h-3" /> Accept
          </button>
          <button onClick={() => onDecline(req.id)} disabled={loading} className="flex items-center gap-1 px-3 py-1.5 bg-white text-slate-600 text-xs font-bold rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors disabled:opacity-50" aria-label={`Decline ${typeLabel}`}>
            <UserX className="w-3 h-3" /> Decline
          </button>
        </div>
      </div>
      <span className="text-xs text-slate-400 flex-shrink-0">{timeAgo(req.created_at)}</span>
    </div>
>>>>>>> 236542ff5c8b1c13469939b6a0bde2bae8b5b45f
  );
};

const getMatchScore = (candidate) => {
  return Number(
    candidate?.matchScore ||
    candidate?.match_score ||
    candidate?.score ||
    candidate?.ai_score ||
    0
  );
};

const normalizeDashboardCofounder = (candidate) => {
  const nestedProfile = Array.isArray(candidate?.profiles)
    ? candidate.profiles[0] || {}
    : candidate?.profiles || candidate?.profile || {};

  const id = getPersonId(candidate);

  return {
    ...candidate,
    profile_id: id,
    user_id: candidate?.user_id || id,
    full_name:
      candidate?.full_name ||
      candidate?.name ||
      nestedProfile?.full_name ||
      'Student Founder',
    avatar_url:
      candidate?.avatar_url ||
      nestedProfile?.avatar_url ||
      null,
    location:
      candidate?.location ||
      nestedProfile?.location ||
      '',
    bio:
      candidate?.bio ||
      nestedProfile?.bio ||
      '',
    looking_for:
      candidate?.looking_for ||
      candidate?.student_profile?.looking_for ||
      candidate?.student_profiles?.looking_for ||
      [],
    matchScore: getMatchScore(candidate),
    reasons: candidate?.reasons || [],
  };
};

const normalizeSkill = (skill) => {
  if (!skill) return '';
  if (typeof skill === 'string') return skill;
  return skill.skill || skill.name || skill.title || '';
};

const normalizeDashboardMentor = (candidate, currentProfile = {}) => {
  const nestedProfile = Array.isArray(candidate?.profiles)
    ? candidate.profiles[0] || {}
    : candidate?.profiles || candidate?.profile || {};

  const id = getPersonId(candidate);

  const calculated = computeMentorMatchScore(currentProfile, candidate);

  return {
    ...candidate,
    profile_id: id,
    user_id: candidate?.user_id || id,
    full_name:
      candidate?.full_name ||
      candidate?.name ||
      nestedProfile?.full_name ||
      'Student Mentor',
    avatar_url:
      candidate?.avatar_url ||
      nestedProfile?.avatar_url ||
      null,
    location:
      candidate?.location ||
      nestedProfile?.location ||
      '',
    bio:
      candidate?.bio ||
      nestedProfile?.bio ||
      '',
    user_type:
      candidate?.user_type ||
      nestedProfile?.user_type ||
      'student',
    looking_for:
      candidate?.looking_for ||
      candidate?.student_profile?.looking_for ||
      candidate?.student_profiles?.looking_for ||
      [],
    matchScore: Number(
      candidate?.matchScore ||
      candidate?.match_score ||
      candidate?.score ||
      candidate?.ai_score ||
      calculated.matchScore
    ),
    reasons:
      candidate?.reasons?.length
        ? candidate.reasons
        : calculated.reasons,
  };
};

function computeMentorMatchScore(currentProfile, candidate) {
  let score = 0;
  const reasons = [];

  const clean = (value) => String(value || '').toLowerCase().trim();

  const currentHelpNeeded = new Set(
    (currentProfile.help_needed || [])
      .map(clean)
      .filter(Boolean)
  );

  const currentSkills = new Set(
    (currentProfile.skills_with_levels || [])
      .map(normalizeSkill)
      .map(clean)
      .filter(Boolean)
  );

  const candidateSkills = new Set(
    (candidate.skills_with_levels || [])
      .map(normalizeSkill)
      .map(clean)
      .filter(Boolean)
  );

  const currentInterests = new Set(
    (currentProfile.interests || [])
      .map(clean)
      .filter(Boolean)
  );

  const candidateInterests = new Set(
    (candidate.interests || [])
      .map(clean)
      .filter(Boolean)
  );

  const helpSkillMatches = [...candidateSkills].filter((skill) =>
    [...currentHelpNeeded].some((need) => {
      return (
        need.includes(skill) ||
        skill.includes(need) ||
        need.split(' ').some((word) => word.length > 3 && skill.includes(word))
      );
    })
  );

  if (helpSkillMatches.length > 0) {
    score += Math.min(30, helpSkillMatches.length * 12);
    reasons.push(`Can help with: ${helpSkillMatches.slice(0, 2).join(', ')}`);
  }

  const complementarySkills = [...candidateSkills].filter(
    (skill) => !currentSkills.has(skill)
  );

  if (complementarySkills.length > 0) {
    score += Math.min(20, complementarySkills.length * 5);
    reasons.push(`Useful skills: ${complementarySkills.slice(0, 2).join(', ')}`);
  }

  if (
    currentProfile.idea_domain &&
    candidate.idea_domain &&
    clean(currentProfile.idea_domain) === clean(candidate.idea_domain)
  ) {
    score += 15;
    reasons.push(`Same startup domain: ${candidate.idea_domain}`);
  }

  const sharedInterests = [...currentInterests].filter((interest) =>
    candidateInterests.has(interest)
  );

  if (sharedInterests.length > 0) {
    score += Math.min(10, sharedInterests.length * 5);
    reasons.push(`Shared interests: ${sharedInterests.slice(0, 2).join(', ')}`);
  }

  if (
    currentProfile.commitment_level &&
    candidate.commitment_level &&
    currentProfile.commitment_level === candidate.commitment_level
  ) {
    score += 10;
    reasons.push(`Similar commitment: ${candidate.commitment_level}`);
  }

  if (candidate.has_startup_idea) {
    score += 5;
    reasons.push('Startup-active profile');
  }

  const completion = Number(candidate.profile_completion || 0);

  if (completion >= 80) {
    score += 10;
    reasons.push('Strong completed profile');
  } else if (completion >= 50) {
    score += 5;
    reasons.push('Good profile completion');
  }

  const finalScore = Math.max(10, Math.min(100, Math.round(score)));

  return {
    matchScore: finalScore,
    reasons: reasons.length ? reasons.slice(0, 3) : ['Profile alignment based on available data'],
  };
}

<<<<<<< HEAD
// 🚀 MAIN COMPONENT
=======
>>>>>>> 236542ff5c8b1c13469939b6a0bde2bae8b5b45f
export default function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

<<<<<<< HEAD
  const [state, setState] = useState({
    loading: true,
    error: null,
  });

  const [connStatusMap, setConnStatusMap] = useState({});
  const [activeConvId, setActiveConvId] = useState(null);
  const [actionNotice, setActionNotice] = useState(null);

  const [data, setData] = useState({
    profile: {},
    student: {},
    prefs: null,
    convos: [],
    mentors: [],
    coFounders: [],
    requests: [],
    opportunities: [],
    activities: [],
    myConnections: [],
    investor: {
      portfolio: [],
      deals: [],
      alerts: [],
    },
    founder: {
      startup: null,
      team: [],
      milestones: [],
    },
    connections: {},
  });

  const getPersonId = useCallback((person) => {
    return person?.profile_id || person?.user_id || person?.id || person?.profiles?.id;
  }, []);

  const updateConnStatus = useCallback((userId, status) => {
    if (!userId) return;

    setConnStatusMap((prev) => ({
      ...prev,
      [userId]: status,
    }));
  }, []);

  const load = useCallback(async ({ silent = false } = {}) => {
=======
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
  const [currentUserAvatarUrl, setCurrentUserAvatarUrl] = useState(null);

  const [pageLoading, setPageLoading] = useState(true);
  const [connsLoading, setConnsLoading] = useState(false);
  const [journeySaving, setJourneySaving] = useState(null);
  const [requestActionLoading, setRequestActionLoading] = useState(null);
  const [showMore, setShowMore] = useState({ mentors: false, cf: false, opps: false });

  // 🔧 CHANGED: loadAll now uses safeFetch & proper error handling
  const loadAll = useCallback(async () => {
>>>>>>> 236542ff5c8b1c13469939b6a0bde2bae8b5b45f
    if (!user) return;

    if (!silent) {
      setState((prev) => ({
        ...prev,
        loading: true,
        error: null,
      }));
    }

    try {
<<<<<<< HEAD
      const [pRes, sRes, prefsRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, full_name, email, user_type, avatar_url, bio, location')
          .eq('id', user.id)
          .maybeSingle(),

        supabase
          .from('student_profiles')
          .select(`
            id,
            user_id,
            university,
            degree,
            major,
            looking_for,
            has_startup_idea,
            startup_idea_description,
            idea_title,
            idea_domain,
            idea_stage,
            target_audience,
            unique_value_prop,
            skills_with_levels,
            help_needed,
            commitment_level,
            profile_completion
          `)
          .eq('user_id', user.id)
          .maybeSingle(),

        supabase
          .from('matching_preferences')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle(),
      ]);

      const profile = safeObj(pRes.data);
      const student = safeObj(sRes.data);

      if (profile.avatar_url) {
        profile.avatar_url = await getCachedUrl(profile.avatar_url);
      }

      const coFounderSuggestions = await fetchCoFounders({
        limit: 50,
        excludeUserId: user.id,
        fresh: true,
        currentUserData: {
          ...student,
          ...profile,
        },
      });

      const { data: mentorCandidates, error: mentorError } = await supabase
        .from('student_profiles')
        .select(`
    id,
    user_id,
    university,
    degree,
    major,
    current_year,
    skills_with_levels,
    interests,
    help_needed,
    looking_for,
    commitment_level,
    has_startup_idea,
    startup_idea_description,
    idea_title,
    idea_domain,
    idea_stage,
    target_audience,
    unique_value_prop,
    profile_completion,
    profiles(
      id,
      full_name,
      avatar_url,
      location,
      bio,
      user_type
    )
  `)
        .neq('user_id', user.id)
        .contains('looking_for', ['Mentor'])
        .limit(50);

      if (mentorError) {
        console.warn('Mentor suggestions fetch failed:', mentorError.message);
      }

      const topDashboardCofounders = (coFounderSuggestions || [])
        .map(normalizeDashboardCofounder)
        .filter((candidate) => hasLookingFor(candidate, 'Co-Founder'))
        .filter((candidate) => getMatchScore(candidate) >= 60)
        .sort((a, b) => getMatchScore(b) - getMatchScore(a))
        .slice(0, 5);

      const topDashboardMentors = (mentorCandidates || [])
        .map((candidate) =>
          normalizeDashboardMentor(
            {
              ...candidate,
              profile_id: candidate.user_id,
            },
            {
              ...student,
              ...profile,
            }
          )
        )
        .filter((candidate) => hasLookingFor(candidate, 'Mentor'))
        .filter((candidate) => getMatchScore(candidate) >= 60)
        .sort((a, b) => getMatchScore(b) - getMatchScore(a))
        .slice(0, 5);

      const [conv, reqs, opps, outReqs, acts, myConns] = await Promise.allSettled([
        fetchConversations(user.id),

        fetchIncomingRequests(user.id, {
          fresh: true,
        }),

        fetchOpportunities({
          limit: 5,
          fresh: true,
        }),

        fetchOutgoingRequests(user.id, {
          fresh: true,
        }),

        supabase
          .from('student_activities')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', {
            ascending: false,
          })
          .limit(5),

        backendApi.getMyConnections(),
      ]);

      const safeResult = (res, fallback = []) => {
        return res.status === 'fulfilled' ? res.value ?? fallback : fallback;
      };

      const incoming = safeResult(reqs) || [];
      const outgoing = safeResult(outReqs) || [];
      const connectionsData = safeResult(myConns, { data: [] })?.data || [];

      setData((prev) => ({
        ...prev,
        profile,
        student,
        prefs: prefsRes.data || null,
        convos: safeResult(conv),
        coFounders: topDashboardCofounders,
        mentors: topDashboardMentors,
        requests: incoming,
        opportunities: safeResult(opps),
        activities: safeResult(acts),
        myConnections: connectionsData,
        connections: {},
      }));

      const initialStatus = {};

      [...incoming, ...outgoing].forEach((request) => {
        const otherUserId =
          request.sender_id === user.id ? request.receiver_id : request.sender_id;

        initialStatus[otherUserId] = request.status;
      });

      connectionsData.forEach((connection) => {
        if (connection.otherUser?.id) {
          initialStatus[connection.otherUser.id] = 'accepted';
        }
      });

      setConnStatusMap(initialStatus);

      setState({
        loading: false,
        error: null,
      });
    } catch (err) {
      console.error('Dashboard load failed:', err);

      if (!silent) {
        setState({
          loading: false,
          error: 'Failed to load dashboard',
        });

        toast.error(err.message || 'Something went wrong');
      } else {
        setState((prev) => ({
          ...prev,
          loading: false,
        }));
      }
    }
  }, [user]);

  useRealtime({
    onConnectionRequest: (payload) => {
      load({
        silent: true,
      });

      toast.info(`🤝 New request from ${payload.senderName || 'someone'}`);
    },

    onConnectionResponse: (payload) => {
      if (payload.status === 'accepted' || payload.action === 'accept') {
        if (payload.otherUserId) {
          updateConnStatus(payload.otherUserId, 'accepted');
        }

        load({
          silent: true,
        });
      }
    },

    onConvCreated: (payload) => {
      setActiveConvId(payload.id || payload.conversationId);
    },
  });

  useEffect(() => {
    load();
  }, [load]);

  const openConversationWith = useCallback(async (personId) => {
    if (!personId) {
      toast.error('User ID missing');
      return;
=======
      const [profRes, actRes] = await Promise.all([
        safeFetch(supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(), {}),
        safeFetch(supabase.from('student_activities').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(8), []),
      ]);
      setProfile(profRes || {});
      setActivities(actRes || []);

      if (profRes?.avatar_url) {
        setCurrentUserAvatarUrl(await getCachedSignedUrl(profRes.avatar_url));
      }

      const spRes = await safeFetch(supabase.from('student_profiles').select('*').eq('user_id', user.id).maybeSingle(), {});
      setSp(spRes || {});

      const mentorConnRes = await safeFetch(
        supabase.from('connection_requests').select('id')
          .or(`and(sender_id.eq.${user.id},type.eq.mentor_request,status.eq.accepted),and(receiver_id.eq.${user.id},type.eq.mentor_request,status.eq.accepted)`)
          .maybeSingle(),
        null
      );
      setHasConnectedMentor(!!mentorConnRes);
      setPageLoading(false);

      setConnsLoading(true);
      try {
        const [convData, mentorData, cfData, reqData, oppData] = await Promise.all([
          safeFetch(fetchConversations(user.id), [], () => toast.error('Messages failed to load')),
          safeFetch(fetchMentors({ limit: 6 }), [], () => toast.error('Mentor suggestions unavailable')),
          safeFetch(fetchCoFounders({ limit: 6 }), [], () => toast.error('Co-founder suggestions unavailable')),
          safeFetch(fetchIncomingRequests(user.id), [], () => toast.error('Requests failed to load')),
          safeFetch(supabase.from('opportunities').select('*').eq('is_active', true).order('deadline', { ascending: true }).limit(5), []),
        ]);

        // Resolve avatars in parallel
        const [mentorsWithUrls, cfWithUrls, reqsWithUrls, convsWithUrls] = await Promise.all([
          Promise.all(mentorData.map(async m => ({ ...m, profiles: { ...m.profiles, avatar_url: await getCachedSignedUrl(m.profiles?.avatar_url) } }))),
          Promise.all(cfData.map(async c => ({ ...c, profiles: { ...c.profiles, avatar_url: await getCachedSignedUrl(c.profiles?.avatar_url) } }))),
          Promise.all(reqData.map(async r => ({ ...r, sender: { ...r.sender, avatar_url: await getCachedSignedUrl(r.sender?.avatar_url) } }))),
          Promise.all(convData.map(async c => ({ ...c, otherUser: { ...c.otherUser, avatar_url: await getCachedSignedUrl(c.otherUser?.avatar_url) } }))),
        ]);

        setConvos(convsWithUrls);
        setMentors(mentorsWithUrls.map(shapeMentor));
        setCoFounders(cfWithUrls.filter(r => r.user_id !== user.id).map(r => shapeCofounder(r, user.id)));
        setIncomingRequests(reqsWithUrls);
        setOpportunities(oppData);

        const statuses = {};
        for (const m of mentorsWithUrls.slice(0, 6)) {
          try {
            const status = await getConnectionStatus(user.id, m.user_id, 'mentor_request');
            if (status) statuses[m.user_id] = status;
          } catch { }
        }
        setConnectionStatuses(statuses);
      } finally { setConnsLoading(false); }
    } catch (err) {
      console.error('[Dashboard] Critical load error:', err);
      toast.error('Dashboard failed to load. Please refresh.');
      setPageLoading(false);
    }
  }, [user]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const setJourneyField = async (field, value) => {
    if (journeySaving) return;
    const prevValue = sp?.[field];
    setJourneySaving(field);
    setSp(prev => ({ ...prev, [field]: value }));
    try {
      const merged = { ...(sp || {}), [field]: value, updated_at: new Date().toISOString() };
      // 🔧 CHANGED: Only include fields that have actual values (not undefined)
      Object.keys(merged).forEach(k => {
        if (merged[k] === undefined || merged[k] === null) delete merged[k];
      });
      merged.user_id = user.id;
      const { error } = await supabase.from('student_profiles').upsert(merged, { onConflict: 'user_id' });
      if (error) throw error;

      // Refresh connection status
      const { data: mc } = await supabase.from('connection_requests').select('id')
        .or(`and(sender_id.eq.${user.id},type.eq.mentor_request,status.eq.accepted),and(receiver_id.eq.${user.id},type.eq.mentor_request,status.eq.accepted)`)
        .maybeSingle();
      setHasConnectedMentor(!!mc);

      logActivity(field, field === 'has_startup_idea'
        ? (value ? 'Confirmed having a startup idea' : 'Marked as not building')
        : (value ? 'Connected with a co-founder' : 'Updated co-founder status'));
      toast.success('Journey updated!');
    } catch (err) {
      console.error('[Dashboard] journey save:', err);
      toast.error('Failed to update journey');
      setSp(prev => ({ ...prev, [field]: prevValue }));
    } finally {
      setJourneySaving(null);
>>>>>>> 236542ff5c8b1c13469939b6a0bde2bae8b5b45f
    }

<<<<<<< HEAD
    try {
      const res = await backendApi.getOrCreateConversation(personId);
      const convId = res.conversationId || res.id || res.data?.id;

      navigate(convId ? `/messages?conv=${convId}` : '/messages');
    } catch (err) {
      console.error('Open chat error:', err);
      toast.error('Could not open chat');
    }
  }, [navigate]);

  const handleAccept = async (id) => {
    const req = data.requests.find((item) => item.id === id);
    const sender = req?.sender || {};
    const senderId = req?.sender_id;

    if (!req || !senderId) {
      toast.error('Request data missing');
      return;
    }

    const person = {
      id: senderId,
      full_name: sender.full_name || 'User',
      user_type: sender.user_type,
      avatar_url: sender.avatar_url,
      location: sender.location,
      bio: sender.bio,
    };

    // ✅ Optimistic LinkedIn-style UI
    setData((prev) => ({
      ...prev,
      requests: prev.requests.filter((item) => item.id !== id),
      myConnections: [
        {
          id,
          connectionType: req.type,
          connectedAt: new Date().toISOString(),
          otherUser: person,
        },
        ...(prev.myConnections || []).filter((connection) => {
          return connection.otherUser?.id !== senderId;
        }),
      ],
    }));

    updateConnStatus(senderId, 'accepted');

    setActionNotice({
      type: 'accepted',
      requestId: id,
      person,
    });

    try {
      await backendApi.respondConnect(id, 'accept');

      setTimeout(() => {
        load({
          silent: true,
        });
      }, 600);
    } catch (err) {
      console.error('Accept request error:', err);

      const message = err.message?.toLowerCase() || '';

      // If backend already processed it, keep UI accepted.
      if (message.includes('invalid or expired')) {
        load({
          silent: true,
        });
        return;
      }

      // Rollback for real failure
      setData((prev) => ({
        ...prev,
        requests: [req, ...prev.requests],
        myConnections: prev.myConnections.filter((connection) => {
          return connection.otherUser?.id !== senderId;
        }),
      }));

      updateConnStatus(senderId, 'pending');
      setActionNotice(null);

      toast.error(err.message || 'Could not accept request');
=======
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
      const { data: mc } = await safeFetch(
        supabase.from('connection_requests').select('id')
          .or(`and(sender_id.eq.${user.id},type.eq.mentor_request,status.eq.accepted),and(receiver_id.eq.${user.id},type.eq.mentor_request,status.eq.accepted)`)
          .maybeSingle(),
        null
      );
      setHasConnectedMentor(!!mc);
      logActivity('request_accepted', 'Accepted a connection request');
      toast.success('Request accepted!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to accept request');
    }
    finally { setRequestActionLoading(null); }
  };

  const handleDeclineRequest = async (requestId) => {
    setRequestActionLoading(requestId);
    try {
      await respondToRequest(requestId, 'declined');
      setIncomingRequests(prev => prev.filter(r => r.id !== requestId));
      toast.success('Request declined');
    } catch (err) {
      console.error(err);
      toast.error('Failed to decline request');
    }
    finally { setRequestActionLoading(null); }
  };

  const handleConnect = async (targetUserId, type, targetName) => {
    try {
      const result = await sendConnectionRequest(user.id, targetUserId, type);
      if (result?.alreadySent) {
        setConnectionStatuses(prev => ({ ...prev, [targetUserId]: { status: 'pending', isSender: true } }));
        return;
      }
      setConnectionStatuses(prev => ({ ...prev, [targetUserId]: { status: 'pending', isSender: true } }));
      logActivity(type === 'mentor_request' ? 'mentor_request' : 'cofounder_connect', type === 'mentor_request' ? `Requested mentorship from ${targetName}` : `Sent co-founder request to ${targetName}`);
      toast.success(`Request sent to ${targetName}`);
    } catch (err) {
      console.error(err);
      toast.error('Failed to send connection request');
>>>>>>> 236542ff5c8b1c13469939b6a0bde2bae8b5b45f
    }
  };

  const handleDecline = async (id) => {
    const req = data.requests.find((item) => item.id === id);
    const sender = req?.sender || {};
    const senderId = req?.sender_id;

<<<<<<< HEAD
    if (!req || !senderId) {
      toast.error('Request data missing');
      return;
    }

    const person = {
      id: senderId,
      full_name: sender.full_name || 'User',
      user_type: sender.user_type,
      avatar_url: sender.avatar_url,
      location: sender.location,
      bio: sender.bio,
    };

    // ✅ Optimistic LinkedIn-style hide
    setData((prev) => ({
      ...prev,
      requests: prev.requests.filter((item) => item.id !== id),
    }));

    updateConnStatus(senderId, 'declined');

    setActionNotice({
      type: 'declined',
      requestId: id,
      person,
    });

    try {
      await backendApi.respondConnect(id, 'decline');

      setTimeout(() => {
        load({
          silent: true,
        });
      }, 600);
    } catch (err) {
      console.error('Decline request error:', err);

      const message = err.message?.toLowerCase() || '';

      if (message.includes('invalid or expired')) {
        load({
          silent: true,
        });
        return;
      }

      // Rollback for real failure
      setData((prev) => ({
        ...prev,
        requests: [req, ...prev.requests],
      }));

      updateConnStatus(senderId, 'pending');
      setActionNotice(null);

      toast.error(err.message || 'Could not decline request');
    }
  };

  const handleConnectionFeedback = async (personId, requestId) => {
    if (!personId) return;

    try {
      await backendApi.sendConnectionFeedback({
        targetUserId: personId,
        requestId,
        feedback: 'do_not_know',
      });
    } catch (err) {
      console.warn('Connection feedback failed:', err);
    } finally {
      setActionNotice(null);
      toast.success('Thanks for the feedback');
    }
  };

  const { profile, student, convos, coFounders, requests, opportunities } = data;

  const hiddenConnectedIds = useMemo(() => {
    const ids = new Set();

    (data.myConnections || []).forEach((connection) => {
      if (connection.otherUser?.id) {
        ids.add(connection.otherUser.id);
      }
    });

    Object.entries(connStatusMap || {}).forEach(([id, status]) => {
      if (status === 'accepted') {
        ids.add(id);
      }
    });

    return ids;
  }, [data.myConnections, connStatusMap]);

  const DASHBOARD_MIN_MATCH = 60;

  const visibleCoFounders = useMemo(() => {
    return (coFounders || []).filter((cf) => {
      const cfId = getPersonId(cf);
      const score = Number(cf.matchScore || cf.match_score || cf.score || 0);

      return (
        cfId &&
        !hiddenConnectedIds.has(cfId) &&
        score >= DASHBOARD_MIN_MATCH
      );
    });
  }, [coFounders, hiddenConnectedIds, getPersonId]);

  const visibleMentors = useMemo(() => {
    return (data.mentors || []).filter((mentor) => {
      const mentorId = getPersonId(mentor);
      const score = Number(mentor.matchScore || mentor.match_score || mentor.score || 0);

      return (
        mentorId &&
        !hiddenConnectedIds.has(mentorId) &&
        hasLookingFor(mentor, 'Mentor') &&
        score >= DASHBOARD_MIN_MATCH
      );
    });
  }, [data.mentors, hiddenConnectedIds, getPersonId]);

  if (state.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-[#1B2D7F]" />
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-600">
        {state.error}
      </div>
    );
  }

  const completion = student.profile_completion || 0;
  const hasIdea = student.has_startup_idea === true;
  const currentRole = profile.user_type || 'student';

  const ideaData = {
    title: student.idea_title,
    domain: student.idea_domain,
    stage: student.idea_stage,
    description: student.startup_idea_description,
    audience: student.target_audience,
    uvp: student.unique_value_prop,
  };
=======
  if (pageLoading) return (
    <><style>{CSS}</style><div className="min-h-screen page-bg flex items-center justify-center" role="status" aria-live="polite">
      <div className="text-center"><div className="w-12 h-12 rounded-2xl g-ind flex items-center justify-center mx-auto mb-4"><Brain className="w-6 h-6 text-white" aria-hidden="true" /></div><p className="font-bold text-slate-900 text-lg mb-1">Loading Dashboard</p><p className="text-slate-400 text-sm">Fetching your journey…</p></div>
    </div></>
  );

  const p = profile || {};
  const s = sp || {};
  const firstName = p.full_name?.split(' ')[0] || 'there';
  const completion = p.profile_completion || 0;
  const unread = convos.reduce((sum, c) => sum + (c.unreadCount || 0), 0);

  // 🔧 CHANGED: Correct boolean checks for journey milestones
  const hasStartupIdea = s.has_startup_idea === true; // Must be explicitly true
  const hasCofounder = s.has_cofounder === true; // Must be explicitly true

  // 🔧 CHANGED: Only mark as "answered" if user explicitly set a value (not default false)
  const ideaAnswered = s.has_startup_idea === true || s.has_startup_idea === false;
  const cofounderAnswered = s.has_cofounder === true || s.has_cofounder === false;

  let primaryCTA;
  if (!ideaAnswered || !hasStartupIdea) primaryCTA = { label: 'Explore Ideas', icon: <Search className="w-4 h-4" aria-hidden="true" />, to: '/discover', grad: 'g-ind' };
  else if (!hasCofounder) primaryCTA = { label: 'Find Co-Founder', icon: <UserPlus className="w-4 h-4" aria-hidden="true" />, to: '/find-cofounders', grad: 'g-vi' };
  else primaryCTA = { label: 'Find Mentor', icon: <Users className="w-4 h-4" aria-hidden="true" />, to: '/find-mentors', grad: 'g-ind' };

  const milestones = [
    { id: 'profile', label: 'Complete your profile', done: completion >= 60, icon: '👤' },
    { id: 'idea', label: 'Answer — have an idea?', done: ideaAnswered, icon: '💡' },
    { id: 'mentor', label: 'Connect with a mentor', done: hasConnectedMentor, icon: '🤝' },
    { id: 'cofounder', label: 'Find a co-founder', done: hasCofounder, icon: '👥' },
    { id: 'message', label: 'Send your first message', done: convos.length > 0, icon: '💬' },
  ];
>>>>>>> 236542ff5c8b1c13469939b6a0bde2bae8b5b45f

  return (
    <>
      <style>{CSS}</style>
<<<<<<< HEAD

      <div className="min-h-screen page-bg pt-20 pb-16 px-4">
        <div className="max-w-7xl mx-auto">
          {/* ROLE-BASED HEADER */}
          <div
            className={`rounded-2xl p-6 mb-6 border ${hasIdea
              ? 'bg-gray-900 text-white border-gray-800'
              : 'bg-white border-gray-200'
              }`}
          >
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
              <div>
                <span
                  className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase ${hasIdea
                    ? 'bg-white/10'
                    : 'bg-green-100 text-green-700'
                    }`}
                >
                  {currentRole}
                </span>

                <h1 className="text-2xl sm:text-3xl font-black mt-3">
                  {hasIdea
                    ? `Build your startup, ${profile.full_name?.split(' ')[0] || 'there'} 🚀`
                    : `Welcome, ${profile.full_name?.split(' ')[0] || 'there'} 👋`}
                </h1>

                <p
                  className={`mt-2 text-sm max-w-lg ${hasIdea ? 'text-gray-300' : 'text-gray-500'
                    }`}
                >
                  Your mission control. Find mentors, co-founders, and opportunities.
                </p>
              </div>

              <div className="flex gap-2 flex-wrap">
                <Link
                  to="/discover"
                  className="px-4 py-2 g-brand text-black font-bold text-sm rounded-xl hover:opacity-90"
                >
                  Discover
                </Link>

                <Link
                  to="/find-mentors"
                  className="px-4 py-2 border-2 border-gray-200 font-semibold text-sm rounded-xl hover:bg-gray-50"
                >
                  Mentors
                </Link>
=======
      <div className="min-h-screen page-bg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-8 lg:py-24">

          {/* HERO */}
          <div className={`rounded-2xl sm:rounded-3xl border px-5 py-6 sm:px-10 sm:py-8 mb-5 sm:mb-6 relative overflow-hidden f0 ${hasStartupIdea ? 'bg-gradient-to-br from-slate-900 to-indigo-950 text-white border-indigo-900' : 'bg-gradient-to-br from-indigo-50 to-violet-50 border-indigo-100'}`}>
            <div className="absolute -right-12 -top-12 w-48 h-48 sm:w-64 sm:h-64 rounded-full opacity-10 blur-3xl" style={{ background: 'radial-gradient(circle, #818cf8, transparent)' }} />
            <div className="relative flex flex-col gap-5">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <span className={`inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full ${hasStartupIdea ? 'bg-white/10 text-white/80' : 'bg-indigo-100 text-indigo-600 border border-indigo-200'}`}>
                    <GraduationCap className="w-3.5 h-3.5" aria-hidden="true" /> Student
                  </span>
                  {unread > 0 && <span className="inline-flex items-center gap-1 text-xs font-bold text-white bg-red-500 px-2.5 py-1 rounded-full"><Bell className="w-3 h-3" aria-hidden="true" /> {unread} unread</span>}
                  {incomingRequests.length > 0 && <span className="inline-flex items-center gap-1 text-xs font-bold text-white bg-violet-500 px-2.5 py-1 rounded-full"><Inbox className="w-3 h-3" aria-hidden="true" /> {incomingRequests.length} request{incomingRequests.length > 1 ? 's' : ''}</span>}
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
                <Link to="/find-mentors" className={`qa flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm border-2 ${hasStartupIdea ? 'bg-white/10 border-white/20 text-white hover:bg-white/20' : 'bg-white border-indigo-200 text-indigo-700 hover:bg-indigo-50'}`}><Users className="w-4 h-4" aria-hidden="true" /> Mentors</Link>
                <Link to="/discover" className={`qa flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm border-2 ${hasStartupIdea ? 'bg-white/10 border-white/20 text-white hover:bg-white/20' : 'bg-white border-violet-200 text-violet-700 hover:bg-violet-50'}`}><Search className="w-4 h-4" aria-hidden="true" /> Discover</Link>
>>>>>>> 236542ff5c8b1c13469939b6a0bde2bae8b5b45f
              </div>
            </div>
          </div>

<<<<<<< HEAD
          {/* STATS GRID */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[
              {
                label: 'Profile',
                val: `${completion}%`,
                sub: completion > 70 ? 'Great' : 'Add more',
                Icon: Shield,
              },
              {
                label: 'Messages',
                val: convos.length,
                sub: 'Active chats',
                Icon: MessageSquare,
              },
              {
                label: 'Requests',
                val: requests.length,
                sub: 'Pending review',
                Icon: Inbox,
              },
              {
                label: 'Opportunities',
                val: opportunities.length,
                sub: 'Curated for you',
                Icon: Megaphone,
              },
            ].map((stat, index) => (
              <div
                key={index}
                className="bg-white rounded-xl p-4 border border-gray-100 lift"
              >
                <div className="w-9 h-9 rounded-lg g-sec flex items-center justify-center text-white mb-2">
                  <stat.Icon className="w-4 h-4" />
                </div>

                <p className="font-black text-xl text-gray-900">
                  {stat.val}
                </p>

                <p className="text-xs text-gray-500">
                  {stat.label} · {stat.sub}
                </p>
=======
          {/* STATS */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5 sm:mb-6 f1">
            {[
              { label: 'Profile', value: `${completion}%`, sub: completion >= 80 ? 'Looking great' : 'Add more info', Icon: Shield, grad: 'from-indigo-500 to-violet-600' },
              { label: 'Progress', value: `${milestones.filter(m => m.done).length}/${milestones.length}`, sub: 'milestones done', Icon: Award, grad: 'from-amber-400 to-orange-500' },
              { label: 'Messages', value: `${convos.length}`, sub: unread > 0 ? `${unread} unread` : 'All read', Icon: MessageSquare, grad: 'from-blue-500 to-indigo-500' },
              { label: 'Requests', value: `${incomingRequests.length}`, sub: incomingRequests.length > 0 ? 'Pending review' : 'No pending', Icon: Inbox, grad: incomingRequests.length > 0 ? 'from-violet-500 to-purple-500' : 'from-slate-300 to-slate-400' },
            ].map((stat, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-100 lift">
                <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-br ${stat.grad} flex items-center justify-center text-white mb-2.5`}><stat.Icon className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" /></div>
                <p className="font-black text-xl sm:text-2xl text-slate-900">{stat.value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{stat.label}</p>
                <p className="text-xs text-indigo-600 font-semibold mt-1">{stat.sub}</p>
>>>>>>> 236542ff5c8b1c13469939b6a0bde2bae8b5b45f
              </div>
            ))}
          </div>

<<<<<<< HEAD
          {/* MAIN LAYOUT */}
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {currentRole === 'student' && (
                <>
                  <ConnectionActionNotice
                    notice={actionNotice}
                    onClose={() => setActionNotice(null)}
                    onMessage={openConversationWith}
                    onFeedback={handleConnectionFeedback}
                  />

                  {requests.length > 0 && (
                    <div className="bg-white rounded-2xl p-5 border border-gray-100">
                      <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                        <Inbox className="w-5 text-violet-500" />
                        Pending Requests
                      </h2>

                      <div className="space-y-3">
                        {requests.map((request) => (
                          <div
                            key={request.id}
                            className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 bg-gray-50 rounded-xl"
                          >
                            <Avatar
                              name={request.sender?.full_name}
                              path={request.sender?.avatar_url}
                              size="md"
                            />

                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-sm truncate">
                                {request.sender?.full_name}
                              </p>

                              <p className="text-xs text-gray-500">
                                {request.type?.replace('_', ' ')} · {timeAgo(request.created_at)}
                              </p>
                            </div>

                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => handleAccept(request.id)}
                                className="px-3 py-1.5 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700"
                              >
                                Accept
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDecline(request.id)}
                                className="px-3 py-1.5 border border-gray-200 text-xs font-bold rounded-lg hover:border-red-200 hover:text-red-600"
                              >
                                Decline
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* JOURNEY SECTION */}
                  <div className="bg-white rounded-2xl p-5 border border-gray-100">
                    <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Target className="w-5 text-[#1B2D7F]" />
                      Your Journey
                    </h2>

                    <div className="space-y-3">
                      <div className={`journey-item ${hasIdea ? 'done' : 'active'}`}>
                        <div className="flex justify-between items-start gap-3">
                          <div className="flex items-start gap-3 flex-1">
                            <span
                              className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${hasIdea ? 'bg-green-100' : 'bg-indigo-100'
                                }`}
                            >
                              {hasIdea ? '✓' : '💡'}
                            </span>

                            <div className="min-w-0 flex-1">
                              <p className="font-semibold text-sm">
                                Startup Idea
                              </p>

                              {hasIdea && ideaData.title ? (
                                <div className="mt-2 space-y-2">
                                  <p className="text-sm font-bold text-gray-900 truncate">
                                    {ideaData.title}
                                  </p>

                                  <div className="flex flex-wrap items-center gap-2">
                                    {ideaData.domain && (
                                      <span className="idea-badge">
                                        <Tag className="w-3" />
                                        {ideaData.domain}
                                      </span>
                                    )}

                                    {ideaData.stage && (
                                      <span className="idea-stage">
                                        {ideaData.stage.replace('-', ' ').toUpperCase()}
                                      </span>
                                    )}
                                  </div>

                                  {ideaData.description && (
                                    <p className="text-xs text-gray-500 line-clamp-2">
                                      {ideaData.description}
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <p className="text-xs text-gray-500">
                                  {hasIdea ? 'Idea saved' : 'Still exploring'}
                                </p>
                              )}
                            </div>
                          </div>

                          <Link
                            to="/profile"
                            className="text-xs font-bold px-3 py-1.5 g-brand text-black rounded-lg hover:opacity-90 flex-shrink-0"
                          >
                            {hasIdea ? 'Edit' : 'Add'}
                          </Link>
                        </div>
                      </div>

                      <div className="journey-item active">
                        <div className="flex justify-between items-center gap-3">
                          <div className="flex items-center gap-3">
                            <span className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                              🤝
                            </span>

                            <div>
                              <p className="font-semibold text-sm">
                                Mentor Connection
                              </p>

                              <p className="text-xs text-gray-500">
                                Speeds up your progress
                              </p>
                            </div>
                          </div>

                          <Link
                            to="/find-mentors"
                            className="text-xs font-bold px-3 py-1.5 g-brand text-black rounded-lg"
                          >
                            Find Mentor
                          </Link>
                        </div>
                      </div>

                      <div className="journey-item">
                        <div className="flex justify-between items-center gap-3">
                          <div className="flex items-center gap-3">
                            <span className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                              👥
                            </span>

                            <div>
                              <p className="font-semibold text-sm">
                                Find Co-Founder
                              </p>

                              <p className="text-xs text-gray-500">
                                Build your dream team
                              </p>
                            </div>
                          </div>

                          <Link
                            to="/find-cofounders"
                            className="text-xs font-bold px-3 py-1.5 border-2 border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50"
                          >
                            Browse
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* AI SUGGESTED COFOUNDERS */}
                  <div className="bg-white rounded-2xl p-5 border border-gray-100">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="font-bold text-gray-900 flex items-center gap-2">
                        <UserPlus className="w-5 text-indigo-500" />
                        AI Suggested Co-Founders
                      </h2>

                      <Link
                        to="/find-cofounders"
                        className="text-xs text-indigo-600 font-semibold"
                      >
                        Browse all →
                      </Link>
                    </div>

                    {visibleCoFounders.length > 0 ? (
                      visibleCoFounders.slice(0, 5).map((cf) => {
                        const cfId = getPersonId(cf);

                        return (
                          <CofounderCard
                            key={cfId}
                            user={cf}
                            matchScore={getMatchScore(cf)}
                            reasons={cf.reasons}
                            connectionStatus={connStatusMap[cfId]}
                            onStatusChange={updateConnStatus}
                            onOpenChat={(convId) => {
                              setActiveConvId(convId);
                              navigate(`/messages?conv=${convId}`);
                            }}
                          />
                        );
                      })
                    ) : (
                      <div className="py-8 text-center bg-gray-50 rounded-xl border border-gray-100">
                        <p className="text-sm font-bold text-gray-700">
                          No strong co-founder matches right now
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          Dashboard only shows top 5 Co-Founder matches with 60%+ score. Browse all on Find Co-Founders.
                        </p>

                        <p className="text-xs text-gray-400 mt-1">
                          Connected users are hidden from suggestions.
                        </p>

                        <Link
                          to="/find-cofounders"
                          className="inline-flex mt-3 px-4 py-2 g-brand text-black text-xs font-bold rounded-xl"
                        >
                          Browse more
                        </Link>
                      </div>
                    )}
                  </div>

                  {/* AI SUGGESTED MENTORS */}
                  <div className="bg-white rounded-2xl p-5 border border-gray-100">
                    <div className="flex justify-between items-center mb-4">
                      <h2 className="font-bold text-gray-900 flex items-center gap-2">
                        <GraduationCap className="w-5 text-indigo-500" />
                        AI Suggested Mentors
                      </h2>

                      <Link
                        to="/find-mentors"
                        className="text-xs text-indigo-600 font-semibold"
                      >
                        Browse all →
                      </Link>
                    </div>

                    {visibleMentors.length > 0 ? (
                      <div className="space-y-3">
                        {visibleMentors.slice(0, 5).map((mentor) => {
                          const mentorId = getPersonId(mentor);

                          return (
                            <MentorSuggestionCard
                              key={mentorId}
                              mentor={mentor}
                              connectionStatus={connStatusMap[mentorId]}
                              onStatusChange={updateConnStatus}
                              onOpenChat={(convId) => {
                                setActiveConvId(convId);
                                navigate(`/messages?conv=${convId}`);
                              }}
                            />
                          );
                        })}
                      </div>
                    ) : (
                      <div className="py-8 text-center bg-gray-50 rounded-xl border border-gray-100">
                        <p className="text-sm font-bold text-gray-700">
                          No strong mentor matches right now
                        </p>

                        <p className="text-xs text-gray-400 mt-1">
                          Dashboard only shows top 5 Mentor matches with 60%+ score.
                        </p>

                        <p className="text-xs text-gray-400 mt-1">
                          Add help-needed areas and skills to improve mentor suggestions.
                        </p>

                        <Link
                          to="/find-mentors"
                          className="inline-flex mt-3 px-4 py-2 g-brand text-black text-xs font-bold rounded-xl"
                        >
                          Browse mentors
                        </Link>
                      </div>
                    )}
                  </div>
                </>
              )}

              {currentRole === 'mentor' && (
                <RolePlaceholder role="Mentor" icon={GraduationCap} />
              )}

              {currentRole === 'investor' && (
                <RolePlaceholder role="Investor" icon={TrendingUp} />
              )}

              {currentRole === 'early-stage-founder' && (
                <RolePlaceholder role="Founder" icon={Rocket} />
              )}
            </div>

            {/* SIDEBAR */}
            <aside className="space-y-6">
              <div className="g-sec rounded-2xl p-5 text-white">
                <h3 className="font-bold mb-4 flex items-center gap-2">
                  <Shield className="w-4" />
                  My Profile
                </h3>

                <div className="flex items-center gap-3 mb-4">
                  <Avatar
                    name={profile.full_name}
                    path={profile.avatar_url}
                    size="lg"
                  />

                  <div>
                    <p className="font-semibold">
                      {profile.full_name || 'Complete Profile'}
                    </p>

                    {student.university && (
                      <p className="text-xs text-white/70">
                        {student.university} · {student.degree}
                      </p>
                    )}
                  </div>
=======
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

              {/* JOURNEY */}
              <Card className="f1">
                <SectionHead title="Your Journey" icon={<Target className="w-5 h-5 text-indigo-500" />} />
                <div className="px-5 sm:px-6 pb-5 sm:pb-6 space-y-3">
                  <div className={`journey-item ${ideaAnswered && hasStartupIdea ? 'done' : ideaAnswered ? 'active' : ''}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-base flex-shrink-0 ${ideaAnswered && hasStartupIdea ? 'bg-emerald-100' : 'bg-indigo-100'}`}>
                          {ideaAnswered && hasStartupIdea ? '✓' : '💡'}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 text-sm">Startup Idea</p>
                          <p className="text-xs text-slate-500">
                            {ideaAnswered
                              ? (hasStartupIdea ? 'You have an idea 🚀' : 'Not looking to build right now')
                              : 'Still exploring'}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => setJourneyField('has_startup_idea', true)}
                          disabled={journeySaving === 'has_startup_idea'}
                          className={`text-xs font-bold px-3 py-1.5 rounded-lg border-2 transition-all disabled:opacity-50 ${hasStartupIdea ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-slate-200 text-slate-500 hover:border-indigo-200'}`}
                        >
                          {journeySaving === 'has_startup_idea' ? '...' : 'Yes'}
                        </button>
                        <button
                          onClick={() => setJourneyField('has_startup_idea', false)}
                          disabled={journeySaving === 'has_startup_idea'}
                          className={`text-xs font-bold px-3 py-1.5 rounded-lg border-2 transition-all disabled:opacity-50 ${ideaAnswered && !hasStartupIdea ? 'border-slate-400 bg-slate-100 text-slate-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
                        >
                          No
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className={`journey-item ${cofounderAnswered && hasCofounder ? 'done' : cofounderAnswered && hasStartupIdea ? 'active' : ''}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-base flex-shrink-0 ${cofounderAnswered && hasCofounder ? 'bg-emerald-100' : cofounderAnswered && hasStartupIdea ? 'bg-indigo-100' : 'bg-slate-100'}`}>
                          {cofounderAnswered && hasCofounder ? '✓' : '👥'}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 text-sm">Co-Founder</p>
                          <p className="text-xs text-slate-500">
                            {cofounderAnswered
                              ? (hasCofounder ? 'You have a co-founder ✓' : 'Looking alone for now')
                              : (hasStartupIdea ? 'Looking for a co-founder' : 'Answer idea step first')}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => setJourneyField('has_cofounder', true)}
                          disabled={journeySaving === 'has_cofounder' || (!ideaAnswered || !hasStartupIdea)}
                          className={`text-xs font-bold px-3 py-1.5 rounded-lg border-2 transition-all disabled:opacity-40 ${hasCofounder ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 text-slate-500 hover:border-emerald-200'}`}
                        >
                          {journeySaving === 'has_cofounder' ? '...' : 'Yes'}
                        </button>
                        <button
                          onClick={() => setJourneyField('has_cofounder', false)}
                          disabled={journeySaving === 'has_cofounder'}
                          className={`text-xs font-bold px-3 py-1.5 rounded-lg border-2 transition-all disabled:opacity-50 ${cofounderAnswered && !hasCofounder ? 'border-slate-400 bg-slate-100 text-slate-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
                        >
                          No
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className={`journey-item ${hasConnectedMentor ? 'done' : ideaAnswered ? 'active' : ''}`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 flex-1">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-base flex-shrink-0 ${hasConnectedMentor ? 'bg-emerald-100' : 'bg-slate-100'}`}>{hasConnectedMentor ? '✓' : '🤝'}</div>
                        <div><p className="font-semibold text-slate-900 text-sm">Mentor Connection</p><p className="text-xs text-slate-500">{hasConnectedMentor ? 'Connected with a mentor ✓' : 'No mentor yet — they speed up everything'}</p></div>
                      </div>
                      {!hasConnectedMentor && <Link to="/find-mentors" className="text-xs font-bold px-3 py-1.5 g-ind text-white rounded-lg hover:opacity-90 flex items-center gap-1 flex-shrink-0">Find <ArrowRight className="w-3 h-3" aria-hidden="true" /></Link>}
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
                        <Link to={primaryCTA.to} className="inline-flex items-center gap-1.5 mt-2 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-all">{primaryCTA.label} <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" /></Link>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* STARTUP IDEA CARD */}
              {hasStartupIdea && (
                <Card className="f1">
                  <div className="px-5 sm:px-6 pt-5 sm:pt-6 pb-3">
                    <div className="flex items-center justify-between">
                      <h2 className="font-bold text-slate-900 text-base sm:text-lg flex items-center gap-2"><Lightbulb className="w-5 h-5 text-amber-500" aria-hidden="true" /> Your Startup Idea</h2>
                      <Link to="/profile" className="text-xs text-indigo-600 font-semibold flex items-center gap-1 hover:gap-2 transition-all">Edit <Edit3 className="w-3 h-3" aria-hidden="true" /></Link>
                    </div>
                  </div>
                  <div className="px-5 sm:px-6 pb-5 sm:pb-6">
                    {s.startup_idea_description ? (
                      <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl"><p className="text-sm text-slate-700 leading-relaxed">{s.startup_idea_description}</p></div>
                    ) : (
                      <div className="p-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl text-center">
                        <p className="text-sm text-slate-500 mb-2">You haven't described your idea yet.</p>
                        <Link to="/profile" className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800"><Edit3 className="w-3.5 h-3.5" aria-hidden="true" /> Add idea description</Link>
                      </div>
                    )}
                    {!hasCofounder && <div className="mt-3 flex items-center gap-2 p-3 bg-violet-50 border border-violet-100 rounded-xl"><UserPlus className="w-4 h-4 text-violet-500 flex-shrink-0" aria-hidden="true" /><p className="text-xs text-violet-700"><Link to="/find-cofounders" className="font-bold underline">Find a co-founder</Link> to build this with you.</p></div>}
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
                        <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl ${card.grad} flex items-center justify-center text-white mb-3`}><card.Icon className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" /></div>
                        <h3 className="font-bold text-slate-900 text-sm mb-1">{card.label}</h3>
                        <p className="text-xs text-slate-500 leading-relaxed mb-3">{card.desc}</p>
                        <Link to={card.to} className={`inline-flex items-center gap-1.5 text-xs font-bold ${card.done ? 'text-emerald-700' : card.highlight ? 'text-violet-700' : 'text-indigo-600'} hover:gap-2.5 transition-all`}>{card.cta} <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" /></Link>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>

              {/* SUGGESTED MENTORS */}
              <Card className="f2">
                <SectionHead title="Suggested Mentors" icon={<Users className="w-5 h-5 text-indigo-500" />} linkLabel="Browse All" linkTo="/find-mentors" />
                <div className="px-5 sm:px-6 pb-5 sm:pb-6">
                  <p className="text-xs text-slate-400 mb-4 flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-indigo-400" aria-hidden="true" /> Matched to your skills and interests</p>
                  {connsLoading ? (<div className="space-y-3"><Shimmer h="h-28" /><Shimmer h="h-28" /><Shimmer h="h-24" /></div>) : mentors.length > 0 ? (
                    <>
                      <div className="space-y-3">{(showMore.mentors ? mentors : mentors.slice(0, 3)).map((m, i) => <PeopleCard key={m.id || i} item={m} accentClass="bg-indigo-50 text-indigo-700" ctaClass="g-ind" ctaLabel="Request" connectionStatus={connectionStatuses[m.user_id]} onConnect={() => handleConnect(m.user_id, 'mentor_request', m.name)} onMessage={() => { logActivity('message_sent', `Messaged ${m.name}`); navigate('/messages'); }} userProfile={profile} />)}</div>
                      {mentors.length > 3 && <button onClick={() => tog('mentors')} className="w-full mt-3 py-2.5 text-sm font-semibold text-indigo-600 hover:bg-indigo-50 rounded-xl flex items-center justify-center gap-1.5 transition-all">{showMore.mentors ? <><ChevronUp className="w-4 h-4" aria-hidden="true" />Show less</> : <><ChevronDown className="w-4 h-4" aria-hidden="true" />See {mentors.length - 3} more</>}</button>}
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
                  <p className="text-xs text-slate-400 mb-4 flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5 text-violet-400" aria-hidden="true" /> Students actively looking to build together</p>
                  {connsLoading ? (<div className="space-y-3"><Shimmer h="h-24" /><Shimmer h="h-24" /></div>) : coFounders.length > 0 ? (
                    <>
                      <div className="space-y-3">{(showMore.cf ? coFounders : coFounders.slice(0, 3)).map((cf, i) => <PeopleCard key={cf.id || i} item={cf} accentClass="bg-violet-50 text-violet-700" ctaClass="g-vi" ctaLabel="Connect" onConnect={() => handleConnect(cf.user_id, 'cofounder_request', cf.name)} onMessage={() => { logActivity('message_sent', `Messaged ${cf.name}`); navigate('/messages'); }} userProfile={profile} />)}</div>
                      {coFounders.length > 3 && <button onClick={() => tog('cf')} className="w-full mt-3 py-2.5 text-sm font-semibold text-violet-600 hover:bg-violet-50 rounded-xl flex items-center justify-center gap-1.5 transition-all">{showMore.cf ? <><ChevronUp className="w-4 h-4" aria-hidden="true" />Show less</> : <><ChevronDown className="w-4 h-4" aria-hidden="true" />See {coFounders.length - 3} more</>}</button>}
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
                          <Link key={c.id} to="/messages" className={`flex items-start gap-3 p-3 sm:p-3.5 rounded-2xl transition-all hover:bg-slate-50 ${c.unreadCount > 0 ? 'border-l-4 border-indigo-500 bg-indigo-50/50' : ''}`} aria-label={`Chat with ${other.full_name}`}>
                            <div className="relative flex-shrink-0">
                              <Avatar name={other.full_name} avatarPath={other.avatar_url} grad={roleGrad(other.user_type)} size="md" />
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
                      <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" aria-hidden="true" />
                      <p className="text-slate-400 text-sm">No messages yet.</p>
                      <p className="text-xs text-slate-400 mt-1">Request a mentor to start your first conversation.</p>
                    </div>
                  )}
                  {activities.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">Recent Actions</p>
                      {activities.slice(0, 4).map((act, i) => (
                        <div key={i} className="flex items-center gap-2.5 py-1.5">
                          <div className="w-6 h-6 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0"><Activity className="w-3.5 h-3.5 text-indigo-500" aria-hidden="true" /></div>
                          <p className="text-xs text-slate-700 truncate flex-1">{act.description}</p>
                          <span className="text-xs text-slate-400 flex-shrink-0">{timeAgo(act.created_at)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <Link to="/messages" className="mt-4 flex items-center justify-center gap-2 w-full py-2.5 border-2 border-indigo-100 text-indigo-600 rounded-xl text-sm font-semibold hover:bg-indigo-50 transition-all"><Send className="w-4 h-4" aria-hidden="true" /> Open Messages</Link>
                </div>
              </Card>

              {/* OPPORTUNITIES */}
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
                            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl g-am flex items-center justify-center text-white flex-shrink-0"><Megaphone className="w-5 h-5" aria-hidden="true" /></div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-slate-900 text-sm leading-snug mb-1">{opp.title}</p>
                              {opp.description && <p className="text-xs text-slate-500 mb-2 hidden sm:block line-clamp-2">{opp.description}</p>}
                              <div className="flex gap-3 text-xs">
                                {opp.deadline && <span className="text-slate-500 flex items-center gap-1"><Clock className="w-3 h-3" aria-hidden="true" />{opp.deadline}</span>}
                                {tl && <span className={`font-semibold ${tl.cls}`}>{tl.label}</span>}
                                {opp.link && <a href={opp.link} target="_blank" rel="noreferrer" className="ml-auto g-ind text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:opacity-90 flex items-center gap-1"><ArrowUpRight className="w-3 h-3" aria-hidden="true" />Apply</a>}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      {opportunities.length > 3 && <button onClick={() => tog('opps')} className="w-full mt-3 py-2.5 text-sm font-semibold text-amber-600 hover:bg-amber-50 rounded-xl flex items-center justify-center gap-1.5 transition-all">{showMore.opps ? <><ChevronUp className="w-4 h-4" aria-hidden="true" />Show less</> : <><ChevronDown className="w-4 h-4" aria-hidden="true" />See {opportunities.length - 3} more</>}</button>}
                    </div>
                  ) : (
                    <div className="py-8 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                      <Megaphone className="w-8 h-8 text-slate-300 mx-auto mb-2" aria-hidden="true" />
                      <p className="text-slate-400 text-sm">No open opportunities right now.</p>
                      <Link to="/discover" className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 mt-2">Check Discover <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" /></Link>
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
                  <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-lg">My Profile</h3><Shield className="w-5 h-5 text-slate-400" aria-hidden="true" /></div>
                  <div className="flex items-center gap-3 mb-4">
                    <Avatar name={p.full_name} avatarPath={currentUserAvatarUrl} grad="from-indigo-400 to-violet-500" size="xl" />
                    <div className="min-w-0">
                      <p className="font-semibold truncate">{p.full_name || 'Complete your profile'}</p>
                      <p className="text-slate-400 text-xs flex items-center gap-1 mt-0.5"><GraduationCap className="w-3 h-3" aria-hidden="true" />{s.university || 'Student'}</p>
                      {p.location && <p className="text-slate-400 text-xs flex items-center gap-1 mt-0.5"><MapPin className="w-3 h-3" aria-hidden="true" />{p.location}</p>}
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
                  <Link to="/profile" className="flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 text-white text-sm font-semibold py-2.5 rounded-xl transition-all"><Edit3 className="w-4 h-4" aria-hidden="true" /> Edit Profile</Link>
>>>>>>> 236542ff5c8b1c13469939b6a0bde2bae8b5b45f
                </div>

                <div className="flex justify-between text-sm mb-1">
                  <span className="text-white/70">Complete</span>
                  <span className="font-bold">{completion}%</span>
                </div>

                <div className="h-2 bg-white/20 rounded-full overflow-hidden mb-4">
                  <div
                    className="h-full bg-white rounded-full"
                    style={{
                      width: `${completion}%`,
                    }}
                  />
                </div>

                <Link
                  to="/profile"
                  className="w-full py-2 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
                >
                  <Edit3 className="w-4" />
                  Edit Profile
                </Link>
              </div>

<<<<<<< HEAD
              <div className="bg-white rounded-2xl p-5 border border-gray-100">
                <h3 className="font-bold text-gray-900 mb-4">
                  Quick Links
                </h3>

                <nav className="space-y-1">
                  {[
                    {
                      label: 'Find Co-Founder',
                      to: '/find-cofounders',
                      Icon: UserPlus,
                    },
                    {
                      label: 'Find Mentor',
                      to: '/find-mentors',
                      Icon: GraduationCap,
                    },
                    {
                      label: 'Messages',
                      to: '/messages',
                      Icon: MessageSquare,
                    },
                    {
                      label: 'Opportunities',
                      to: '/discover',
                      Icon: Rocket,
                    },
                    {
                      label: 'Preferences',
                      to: '/settings',
                      Icon: Settings,
                    },
                  ].map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 text-sm font-medium"
                    >
                      <item.Icon className="w-4 text-gray-500" />
                      {item.label}
=======
              {/* MILESTONES */}
              <Card className="f1">
                <div className="px-5 sm:px-6 pt-5 pb-2">
                  <div className="flex items-center justify-between"><h3 className="font-bold text-slate-900 flex items-center gap-2"><Award className="w-4 h-4 text-violet-500" aria-hidden="true" /> Progress</h3><span className="text-xs text-slate-400">{milestones.filter(m => m.done).length}/{milestones.length}</span></div>
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
                    <Link key={i} to={to} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-all group" aria-label={label}>
                      <Icon className={`w-4 h-4 ${col}`} aria-hidden="true" /><span className="text-sm font-medium text-slate-700 group-hover:text-slate-900 flex-1">{label}</span>
                      {badge && <span className="w-5 h-5 bg-indigo-500 text-white text-xs font-bold rounded-full flex items-center justify-center">{badge}</span>}
                      <ArrowUpRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500" aria-hidden="true" />
>>>>>>> 236542ff5c8b1c13469939b6a0bde2bae8b5b45f
                    </Link>
                  ))}
                </nav>
              </div>

              <MyConnectionsCard
                connections={data.myConnections}
                onMessage={openConversationWith}
              />
            </aside>
          </div>
        </div>
      </div>
    </>
  );
}