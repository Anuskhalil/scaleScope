import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../auth/AuthContext';
import { backendApi } from '../../lib/backendApi';
import { useRealtime } from '../../hooks/useRealtime';
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
  DollarSign,
  Briefcase,
  Sparkles,
  Eye,
} from 'lucide-react';
import toast from 'react-hot-toast';

import {
  fetchFounderDashboardData,
  calcFounderCompletion,
} from '../../services/founderService';

// 🎨 SAME BRAND CSS AS STUDENT DASHBOARD
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

  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .line-clamp-3 {
    display: -webkit-box;
    -webkit-line-clamp: 3;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
`;

// 🔧 AVATAR CACHE SAME AS STUDENT DASHBOARD
const AVATAR_CACHE = new Map();
const CACHE_TTL = 30 * 60 * 1000;

async function getCachedUrl(path) {
  if (!path || String(path).startsWith('http')) return path;

  const key = `av:${path}`;
  const cached = AVATAR_CACHE.get(key);

  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.url;
  }

  try {
    const cleanPath = String(path).replace(/^avatars\//, '');

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

const safeObj = (val) => {
  return val && typeof val === 'object' && !Array.isArray(val) ? val : {};
};

const safeArray = (val) => {
  return Array.isArray(val) ? val : [];
};

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

const getPersonId = (person) => {
  const nestedProfile = Array.isArray(person?.profiles)
    ? person.profiles[0]
    : person?.profiles;

  return (
    person?.profile_id ||
    person?.user_id ||
    person?.id ||
    person?.sender_id ||
    nestedProfile?.id ||
    person?.profile?.id
  );
};

const getProfileObj = (candidate) => {
  return Array.isArray(candidate?.profiles)
    ? candidate.profiles[0] || {}
    : candidate?.profiles || candidate?.profile || {};
};

const getMatchScore = (candidate) => {
  return Number(
    candidate?.matchScore ||
    candidate?.match_score ||
    candidate?.score ||
    candidate?.ai_score ||
    candidate?.matchScorePercent ||
    0
  );
};

const buildFounderMatchScore = (founderProfile, candidate, type = 'team') => {
  const fp = founderProfile || {};
  let score = 0;
  const reasons = [];

  const founderIndustry = String(fp.industry || '').toLowerCase();
  const founderStage = String(fp.startup_stage || fp.company_stage || '').toLowerCase();
  const neededSkills = safeArray(fp.skills_needed).map((x) => String(x).toLowerCase());
  const helpNeeded = safeArray(fp.help_needed).map((x) => String(x).toLowerCase());
  const hiringRoles = safeArray(fp.hiring_roles).map((x) => String(x).toLowerCase());

  if (type === 'mentor') {
    const areas = [
      ...safeArray(candidate.expertise_areas),
      ...safeArray(candidate.can_help_with),
      ...safeArray(candidate.available_for),
    ].map((x) => String(x).toLowerCase());

    const helpMatches = helpNeeded.filter((need) =>
      areas.some((area) => area.includes(need) || need.includes(area))
    );

    if (helpMatches.length) {
      score += Math.min(35, helpMatches.length * 12);
      reasons.push(`Can help with ${helpMatches.slice(0, 2).join(', ')}`);
    }

    if (founderIndustry && areas.some((area) => area.includes(founderIndustry))) {
      score += 20;
      reasons.push(`Relevant to ${fp.industry}`);
    }

    if (candidate.years_experience) {
      score += Math.min(20, Number(candidate.years_experience) * 2);
      reasons.push(`${candidate.years_experience}+ years experience`);
    }
  }

  if (type === 'investor') {
    const stages = safeArray(candidate.preferred_stages).map((x) => String(x).toLowerCase());
    const industries = safeArray(candidate.preferred_industries).map((x) => String(x).toLowerCase());

    if (founderStage && stages.some((stage) => stage.includes(founderStage) || founderStage.includes(stage))) {
      score += 30;
      reasons.push(`Invests in ${fp.startup_stage || fp.company_stage}`);
    }

    if (founderIndustry && industries.some((industry) => industry.includes(founderIndustry) || founderIndustry.includes(industry))) {
      score += 30;
      reasons.push(`Matches ${fp.industry}`);
    }

    if (candidate.is_verified) {
      score += 10;
      reasons.push('Verified investor');
    }
  }

  if (type === 'team') {
    const profile = getProfileObj(candidate);

    const candidateSkills = [
      ...safeArray(candidate.skills_with_levels).map((item) => item?.skill || item),
      ...safeArray(profile.skills),
      ...safeArray(candidate.interests),
    ].map((x) => String(x).toLowerCase());

    const skillMatches = neededSkills.filter((need) =>
      candidateSkills.some((skill) => skill.includes(need) || need.includes(skill))
    );

    if (skillMatches.length) {
      score += Math.min(40, skillMatches.length * 15);
      reasons.push(`Skills fit: ${skillMatches.slice(0, 2).join(', ')}`);
    }

    const roleMatch = hiringRoles.some((role) =>
      candidateSkills.some((skill) => role.includes(skill) || skill.includes(role))
    );

    if (roleMatch) {
      score += 15;
      reasons.push('Fits hiring role');
    }

    if (candidate.commitment_level && fp.commitment_level && candidate.commitment_level === fp.commitment_level) {
      score += 10;
      reasons.push('Similar commitment');
    }

    if (candidate.has_startup_idea) {
      score += 5;
      reasons.push('Startup-active candidate');
    }
  }

  if (score === 0) {
    score = 20;
    reasons.push('Profile alignment based on available data');
  }

  return {
    matchScore: Math.min(100, Math.max(10, Math.round(score))),
    reasons: reasons.slice(0, 3),
  };
};

const normalizeMentor = (mentor, founderProfile) => {
  const profile = getProfileObj(mentor);
  const calculated = buildFounderMatchScore(founderProfile, mentor, 'mentor');

  return {
    ...mentor,
    profile_id: getPersonId(mentor),
    user_id: mentor.user_id || getPersonId(mentor),
    full_name: mentor.full_name || profile.full_name || 'Mentor',
    avatar_url: mentor.avatar_url || profile.avatar_url || null,
    location: mentor.location || profile.location || '',
    bio: mentor.bio || profile.bio || '',
    matchScore: getMatchScore(mentor) || calculated.matchScore,
    reasons: safeArray(mentor.reasons).length ? mentor.reasons : calculated.reasons,
  };
};

const normalizeInvestor = (investor, founderProfile) => {
  const profile = getProfileObj(investor);
  const calculated = buildFounderMatchScore(founderProfile, investor, 'investor');

  return {
    ...investor,
    profile_id: investor.profile_id || getPersonId(investor),
    user_id: investor.user_id || investor.profile_id || getPersonId(investor),
    full_name: investor.full_name || profile.full_name || investor.fund_name || 'Investor',
    avatar_url: investor.avatar_url || profile.avatar_url || null,
    location: investor.location || profile.location || '',
    bio: investor.bio || profile.bio || investor.investment_thesis || '',
    matchScore: getMatchScore(investor) || calculated.matchScore,
    reasons: safeArray(investor.reasons).length ? investor.reasons : calculated.reasons,
  };
};

const normalizeTeamCandidate = (candidate, founderProfile) => {
  const profile = getProfileObj(candidate);
  const calculated = buildFounderMatchScore(founderProfile, candidate, 'team');

  return {
    ...candidate,
    profile_id: getPersonId(candidate),
    user_id: candidate.user_id || getPersonId(candidate),
    full_name: candidate.full_name || profile.full_name || 'Team Candidate',
    avatar_url: candidate.avatar_url || profile.avatar_url || null,
    location: candidate.location || profile.location || '',
    bio: candidate.bio || profile.bio || '',
    matchScore: getMatchScore(candidate) || calculated.matchScore,
    reasons: safeArray(candidate.reasons).length ? candidate.reasons : calculated.reasons,
  };
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
          className={`w-12 h-12 rounded-xl text-white flex items-center justify-center font-bold overflow-hidden flex-shrink-0 ${
            isAccepted
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
            Connect with mentors, investors, and team members to build your startup network.
          </p>

          <Link
            to="/find-team"
            className="inline-flex mt-4 px-4 py-2 g-brand text-black text-xs font-bold rounded-xl hover:opacity-90"
          >
            Find Team
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

function MatchSuggestionCard({
  person,
  type = 'team',
  connectionStatus,
  onStatusChange,
  onOpenChat,
}) {
  const [loading, setLoading] = useState(false);

  const personId = getPersonId(person);
  const name = person.full_name || 'ScaleScope User';
  const score = getMatchScore(person);

  const typeConfig = {
    mentor: {
      requestType: 'mentor_request',
      label: 'Mentor',
      icon: GraduationCap,
      message: `Hi ${name}, your experience looks relevant to my startup. I’d like to connect for mentorship.`,
    },
    investor: {
      requestType: 'investor_contact',
      label: 'Investor',
      icon: DollarSign,
      message: `Hi ${name}, I’m building a startup that may match your investment interests. I’d like to connect.`,
    },
    team: {
      requestType: 'team_invite',
      label: 'Team',
      icon: UserPlus,
      message: `Hi ${name}, your profile looks relevant to my startup team needs. I’d like to connect and explore collaboration.`,
    },
  }[type];

  const Icon = typeConfig.icon;

  const handleConnect = async () => {
    if (!personId) {
      toast.error('User ID missing');
      return;
    }

    try {
      setLoading(true);

      const res = await backendApi.sendConnect(
        personId,
        typeConfig.message,
        typeConfig.requestType
      );

      if (res.alreadyConnected || res.status === 'accepted') {
        onStatusChange?.(personId, 'accepted');
        toast.success('Already connected');
        return;
      }

      onStatusChange?.(personId, 'pending');
      toast.success(
        res.alreadyPending ? 'Request already pending' : 'Request sent',
        {
          style: {
            background: '#98DE38',
            color: '#000',
          },
        }
      );
    } catch (err) {
      console.error('Connect error:', err);
      toast.error(err.message || 'Could not send request');
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
      const res = await backendApi.getOrCreateConversation(personId);
      const convId = res.conversationId || res.id || res.data?.id;
      onOpenChat?.(convId);
    } catch (err) {
      console.error('Open chat error:', err);
      toast.error('Could not open chat');
    }
  };

  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 hover:shadow-md transition lift">
      <div className="flex items-center gap-3 mb-3">
        <Avatar
          name={name}
          path={person.avatar_url}
          size="lg"
          grad={
            type === 'investor'
              ? 'from-emerald-500 to-teal-500'
              : type === 'mentor'
                ? 'from-indigo-500 to-blue-500'
                : 'from-violet-500 to-purple-500'
          }
        />

        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-900 truncate">
            {name}
          </h3>

          <p className="text-xs text-gray-500 truncate">
            {person.current_role ||
              person.fund_name ||
              person.location ||
              person.commitment_level ||
              `${typeConfig.label} match`}
          </p>
        </div>

        <span className="px-2 py-1 text-[10px] font-bold rounded-full bg-indigo-50 text-indigo-700 flex-shrink-0">
          {score}% Match
        </span>
      </div>

      {person.bio && (
        <p className="text-xs text-gray-600 mb-3 line-clamp-2">
          {person.bio}
        </p>
      )}

      {person.reasons?.length > 0 && (
        <p className="text-xs text-gray-600 mb-4">
          {person.reasons.join(' • ')}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <Link
          to={`/user-profile/${personId}`}
          className="py-2 border-2 border-indigo-100 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-bold hover:bg-indigo-100 transition flex items-center justify-center"
        >
          View Profile
        </Link>

        <button
          type="button"
          onClick={handleMessage}
          disabled={connectionStatus !== 'accepted'}
          className={`py-2 border-2 rounded-xl text-xs font-bold transition flex items-center justify-center ${
            connectionStatus === 'accepted'
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
              <Icon className="w-3.5 mr-1" />
            )}
            {loading ? 'Sending...' : 'Request'}
          </button>
        )}
      </div>
    </div>
  );
}

// 🚀 MAIN COMPONENT
export default function FounderDashboard() {
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
    founder: {},
    convos: [],
    mentors: [],
    investors: [],
    teamCandidates: [],
    requests: [],
    activities: [],
    myConnections: [],
    opportunities: [],
  });

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
      const dashboardData = await fetchFounderDashboardData(user.id);

      const profile = safeObj(dashboardData.profile);
      const founder = safeObj(dashboardData.founderProfile);

      if (profile.avatar_url) {
        profile.avatar_url = await getCachedUrl(profile.avatar_url);
      }

      const mentors = safeArray(dashboardData.mentors)
        .map((mentor) => normalizeMentor(mentor, founder))
        .filter((mentor) => getMatchScore(mentor) >= 60)
        .sort((a, b) => getMatchScore(b) - getMatchScore(a))
        .slice(0, 5);

      const investors = safeArray(dashboardData.investors)
        .map((investor) => normalizeInvestor(investor, founder))
        .filter((investor) => getMatchScore(investor) >= 60)
        .sort((a, b) => getMatchScore(b) - getMatchScore(a))
        .slice(0, 5);

      const teamCandidates = safeArray(dashboardData.teamCandidates)
        .map((candidate) => normalizeTeamCandidate(candidate, founder))
        .filter((candidate) => getMatchScore(candidate) >= 60)
        .sort((a, b) => getMatchScore(b) - getMatchScore(a))
        .slice(0, 5);

      const myConns = await backendApi.getMyConnections().catch(() => ({ data: [] }));
      const connectionsData = myConns?.data || [];

      setData((prev) => ({
        ...prev,
        profile,
        founder,
        convos: dashboardData.conversations || [],
        requests: dashboardData.requests || [],
        mentors,
        investors,
        teamCandidates,
        myConnections: connectionsData,
        opportunities: [],
        activities: [],
      }));

      const initialStatus = {};

      safeArray(dashboardData.requests).forEach((request) => {
        const otherUserId =
          request.sender_id === user.id ? request.receiver_id : request.sender_id;

        if (otherUserId) {
          initialStatus[otherUserId] = request.status;
        }
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
      console.error('Founder dashboard load failed:', err);

      if (!silent) {
        setState({
          loading: false,
          error: 'Failed to load founder dashboard',
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

      if (message.includes('invalid or expired')) {
        load({
          silent: true,
        });
        return;
      }

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

  const { profile, founder, convos, mentors, investors, teamCandidates, requests } = data;

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

  const visibleMentors = useMemo(() => {
    return (mentors || []).filter((mentor) => {
      const mentorId = getPersonId(mentor);

      return mentorId && !hiddenConnectedIds.has(mentorId);
    });
  }, [mentors, hiddenConnectedIds]);

  const visibleInvestors = useMemo(() => {
    return (investors || []).filter((investor) => {
      const investorId = getPersonId(investor);

      return investorId && !hiddenConnectedIds.has(investorId);
    });
  }, [investors, hiddenConnectedIds]);

  const visibleTeamCandidates = useMemo(() => {
    return (teamCandidates || []).filter((candidate) => {
      const candidateId = getPersonId(candidate);

      return candidateId && !hiddenConnectedIds.has(candidateId);
    });
  }, [teamCandidates, hiddenConnectedIds]);

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

  const completion = calcFounderCompletion(profile, founder);
  const startupName = founder.company_name || founder.idea_title;
  const hasStartup = Boolean(startupName || founder.problem_solving || founder.problem_statement);
  const currentRole = profile.user_type || 'early-stage-founder';

  const founderSkills = safeArray(founder.founder_skills);
  const helpNeeded = safeArray(founder.help_needed);
  const skillsNeeded = safeArray(founder.skills_needed);

  const startupData = {
    title: startupName,
    industry: founder.industry,
    stage: founder.startup_stage || founder.company_stage,
    productStatus: founder.product_status,
    validationStatus: founder.validation_status,
    description: founder.problem_solving || founder.problem_statement,
    audience: founder.target_market || founder.target_audience,
    uvp: founder.unique_value_proposition,
  };

  return (
    <>
      <style>{CSS}</style>

      <div className="min-h-screen page-bg pt-20 pb-16 px-4">
        <div className="max-w-7xl mx-auto">
          {/* ROLE-BASED HEADER */}
          <div
            className={`rounded-2xl p-6 mb-6 border ${
              hasStartup
                ? 'bg-gray-900 text-white border-gray-800'
                : 'bg-white border-gray-200'
            }`}
          >
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
              <div>
                <span
                  className={`inline-block px-3 py-1 rounded-full text-xs font-bold uppercase ${
                    hasStartup
                      ? 'bg-white/10'
                      : 'bg-green-100 text-green-700'
                  }`}
                >
                  {currentRole.replace(/-/g, ' ')}
                </span>

                <h1 className="text-2xl sm:text-3xl font-black mt-3">
                  {hasStartup
                    ? `Build your startup, ${profile.full_name?.split(' ')[0] || 'there'} 🚀`
                    : `Welcome, ${profile.full_name?.split(' ')[0] || 'there'} 👋`}
                </h1>

                <p
                  className={`mt-2 text-sm max-w-lg ${
                    hasStartup ? 'text-gray-300' : 'text-gray-500'
                  }`}
                >
                  Your founder mission control. Find mentors, investors, team members, and opportunities.
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
                  to="/find-investors"
                  className={`px-4 py-2 border-2 font-semibold text-sm rounded-xl ${
                    hasStartup
                      ? 'border-white/20 text-white hover:bg-white/10'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  Investors
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
                label: 'Matches',
                val: visibleMentors.length + visibleInvestors.length + visibleTeamCandidates.length,
                sub: '60%+ suggested',
                Icon: Sparkles,
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
                            {request.type?.replace(/_/g, ' ')} · {timeAgo(request.created_at)}
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
                  Founder Journey
                </h2>

                <div className="space-y-3">
                  <div className={`journey-item ${hasStartup ? 'done' : 'active'}`}>
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex items-start gap-3 flex-1">
                        <span
                          className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                            hasStartup ? 'bg-green-100' : 'bg-indigo-100'
                          }`}
                        >
                          {hasStartup ? '✓' : '🚀'}
                        </span>

                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm">
                            Startup Profile
                          </p>

                          {hasStartup && startupData.title ? (
                            <div className="mt-2 space-y-2">
                              <p className="text-sm font-bold text-gray-900 truncate">
                                {startupData.title}
                              </p>

                              <div className="flex flex-wrap items-center gap-2">
                                {startupData.industry && (
                                  <span className="idea-badge">
                                    <Tag className="w-3" />
                                    {startupData.industry}
                                  </span>
                                )}

                                {startupData.stage && (
                                  <span className="idea-stage">
                                    {startupData.stage}
                                  </span>
                                )}

                                {startupData.productStatus && (
                                  <span className="idea-stage">
                                    {startupData.productStatus}
                                  </span>
                                )}
                              </div>

                              {startupData.description && (
                                <p className="text-xs text-gray-500 line-clamp-2">
                                  {startupData.description}
                                </p>
                              )}
                            </div>
                          ) : (
                            <p className="text-xs text-gray-500">
                              Add your startup details to improve matches.
                            </p>
                          )}
                        </div>
                      </div>

                      <Link
                        to="/founder-profile"
                        className="text-xs font-bold px-3 py-1.5 g-brand text-black rounded-lg hover:opacity-90 flex-shrink-0"
                      >
                        {hasStartup ? 'Edit' : 'Add'}
                      </Link>
                    </div>
                  </div>

                  <div className="journey-item active">
                    <div className="flex justify-between items-center gap-3">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                          🧠
                        </span>

                        <div>
                          <p className="font-semibold text-sm">
                            Mentor Guidance
                          </p>

                          <p className="text-xs text-gray-500">
                            Get product, funding, and growth guidance
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
                          💰
                        </span>

                        <div>
                          <p className="font-semibold text-sm">
                            Investor Readiness
                          </p>

                          <p className="text-xs text-gray-500">
                            Prepare pitch deck, traction, and ask amount
                          </p>
                        </div>
                      </div>

                      <Link
                        to="/find-investors"
                        className="text-xs font-bold px-3 py-1.5 border-2 border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50"
                      >
                        Browse
                      </Link>
                    </div>
                  </div>
                </div>
              </div>

              {/* AI SUGGESTED TEAM */}
              <div className="bg-white rounded-2xl p-5 border border-gray-100">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="font-bold text-gray-900 flex items-center gap-2">
                    <UserPlus className="w-5 text-indigo-500" />
                    AI Suggested Team
                  </h2>

                  <Link
                    to="/find-team"
                    className="text-xs text-indigo-600 font-semibold"
                  >
                    Browse all →
                  </Link>
                </div>

                {visibleTeamCandidates.length > 0 ? (
                  <div className="space-y-3">
                    {visibleTeamCandidates.slice(0, 5).map((candidate) => {
                      const candidateId = getPersonId(candidate);

                      return (
                        <MatchSuggestionCard
                          key={candidateId}
                          person={candidate}
                          type="team"
                          connectionStatus={connStatusMap[candidateId]}
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
                  <EmptySuggestion
                    title="No strong team matches right now"
                    text="Dashboard only shows top 5 team matches with 60%+ score. Add skills-needed and hiring roles to improve matches."
                    to="/find-team"
                    label="Browse team"
                  />
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
                        <MatchSuggestionCard
                          key={mentorId}
                          person={mentor}
                          type="mentor"
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
                  <EmptySuggestion
                    title="No strong mentor matches right now"
                    text="Dashboard only shows top 5 mentor matches with 60%+ score. Add help-needed and current challenges to improve mentor suggestions."
                    to="/find-mentors"
                    label="Browse mentors"
                  />
                )}
              </div>

              {/* AI SUGGESTED INVESTORS */}
              <div className="bg-white rounded-2xl p-5 border border-gray-100">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="font-bold text-gray-900 flex items-center gap-2">
                    <DollarSign className="w-5 text-emerald-500" />
                    AI Suggested Investors
                  </h2>

                  <Link
                    to="/find-investors"
                    className="text-xs text-indigo-600 font-semibold"
                  >
                    Browse all →
                  </Link>
                </div>

                {visibleInvestors.length > 0 ? (
                  <div className="space-y-3">
                    {visibleInvestors.slice(0, 5).map((investor) => {
                      const investorId = getPersonId(investor);

                      return (
                        <MatchSuggestionCard
                          key={investorId}
                          person={investor}
                          type="investor"
                          connectionStatus={connStatusMap[investorId]}
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
                  <EmptySuggestion
                    title="No strong investor matches right now"
                    text="Dashboard only shows top investor matches with 60%+ score. Add funding stage, ask amount, pitch deck, and industry."
                    to="/find-investors"
                    label="Browse investors"
                  />
                )}
              </div>
            </div>

            {/* SIDEBAR */}
            <aside className="space-y-6">
              <div className="g-sec rounded-2xl p-5 text-white">
                <h3 className="font-bold mb-4 flex items-center gap-2">
                  <Shield className="w-4" />
                  My Founder Profile
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

                    {startupData.title && (
                      <p className="text-xs text-white/70">
                        {startupData.title} · {startupData.industry || 'Startup'}
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
                  to="/founder-profile"
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
                      label: 'Founder Profile',
                      to: '/founder-profile',
                      Icon: Edit3,
                    },
                    {
                      label: 'Find Team',
                      to: '/find-team',
                      Icon: UserPlus,
                    },
                    {
                      label: 'Find Mentor',
                      to: '/find-mentors',
                      Icon: GraduationCap,
                    },
                    {
                      label: 'Find Investors',
                      to: '/find-investors',
                      Icon: DollarSign,
                    },
                    {
                      label: 'Messages',
                      to: '/messages',
                      Icon: MessageSquare,
                    },
                    {
                      label: 'Discover',
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

              <FounderProfileSummary
                founder={founder}
                founderSkills={founderSkills}
                helpNeeded={helpNeeded}
                skillsNeeded={skillsNeeded}
              />

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

function FounderProfileSummary({
  founder,
  founderSkills,
  helpNeeded,
  skillsNeeded,
}) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100">
      <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
        <Briefcase className="w-4 text-[#1B2D7F]" />
        Startup Snapshot
      </h3>

      <div className="space-y-3">
        <SummaryRow
          label="Founder Skills"
          value={founderSkills.length ? founderSkills.slice(0, 3).join(', ') : 'Not added'}
        />

        <SummaryRow
          label="Help Needed"
          value={helpNeeded.length ? helpNeeded.slice(0, 3).join(', ') : 'Not added'}
        />

        <SummaryRow
          label="Skills Needed"
          value={skillsNeeded.length ? skillsNeeded.slice(0, 3).join(', ') : 'Not added'}
        />

        <SummaryRow
          label="Funding"
          value={founder.funding_stage || founder.ask_amount || 'Not added'}
        />

        <SummaryRow
          label="Validation"
          value={founder.validation_status || 'Not added'}
        />
      </div>
    </div>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="p-3 bg-gray-50 rounded-xl">
      <p className="text-[11px] font-bold uppercase text-gray-400 mb-1">
        {label}
      </p>
      <p className="text-xs text-gray-700 font-semibold line-clamp-2">
        {value}
      </p>
    </div>
  );
}

function EmptySuggestion({ title, text, to, label }) {
  return (
    <div className="py-8 text-center bg-gray-50 rounded-xl border border-gray-100">
      <p className="text-sm font-bold text-gray-700">
        {title}
      </p>

      <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
        {text}
      </p>

      <p className="text-xs text-gray-400 mt-1">
        Connected users are hidden from suggestions.
      </p>

      <Link
        to={to}
        className="inline-flex mt-3 px-4 py-2 g-brand text-black text-xs font-bold rounded-xl"
      >
        {label}
      </Link>
    </div>
  );
}
