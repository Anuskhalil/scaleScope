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
} from 'lucide-react';
import toast from 'react-hot-toast';

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
  }
  
  /* 🔧 CHANGED: Accessibility focus states & lightweight tooltip */
  button:focus-visible, a:focus-visible { outline: 2px solid #6366f1; outline-offset: 2px; }
  .tooltip-wrap{position:relative}
  .tooltip-wrap:hover .tooltip-box{opacity:1;visibility:visible;transform:translateY(0)}
  .tooltip-box{opacity:0;visibility:hidden;transform:translateY(4px);transition:all .15s ease;position:absolute;bottom:calc(100% + 8px);left:50%;transform:translateX(-50%) translateY(4px);background:#1e293b;color:#fff;font-size:11px;padding:8px 10px;border-radius:8px;white-space:nowrap;z-index:50;box-shadow:0 4px 12px rgba(0,0,0,.15);max-width:240px;white-space:normal;text-align:left}
  .tooltip-box::after{content:'';position:absolute;top:100%;left:50%;margin-left:-4px;border-width:4px;border-style:solid;border-color:#1e293b transparent transparent transparent}
`;

// 🔧 UTILS
const AVATAR_CACHE = new Map();
const CACHE_TTL = 30 * 60 * 1000;

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
const RolePlaceholder = ({ role, icon }) => {
  const RoleIcon = icon;

  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 text-center">
    <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-gray-50 flex items-center justify-center">
      <RoleIcon className="w-6 h-6 text-gray-400" />
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
};

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
        </Link>
      )}
    </div>
  );
}

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
      </div>

      {mentor.bio && (
        <p className="text-xs text-gray-600 mb-3 line-clamp-2">
          {mentor.bio}
        </p>
      )}

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
          </button>
        )}
      </div>
    </div>
  );
}

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

// 🚀 MAIN COMPONENT
export default function StudentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [state, setState] = useState({
    loading: true,
    error: null,
  });

  const [connStatusMap, setConnStatusMap] = useState({});
  const [, setActiveConvId] = useState(null);
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
    if (!user) return;

    if (!silent) {
      setState((prev) => ({
        ...prev,
        loading: true,
        error: null,
      }));
    }

    try {
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
    }

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
    }
  };

  const handleDecline = async (id) => {
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

  return (
    <>
      <style>{CSS}</style>

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
              </div>
            </div>
          </div>

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
              </div>
            ))}
          </div>

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
