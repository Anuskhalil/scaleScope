// src/pages/StudentRolePages/FindCoFounder.jsx
import React, {
  useState,
  useEffect,
  useCallback,
  memo,
  useMemo,
} from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  Users,
  UserPlus,
  MessageSquare,
  MapPin,
  X,
  Loader,
  CheckCircle,
  Clock,
  Lightbulb,
  Info,
  ArrowRight,
  SlidersHorizontal,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../auth/AuthContext';
import { backendApi } from '../../lib/backendApi';
import { fetchCoFounders } from '../../services/studentService';
import IntelligentMatchPanel from '../../components/IntelligentMatchPanel';
import {
  COMMITMENT_OPTIONS,
  DISCOVERY_SKILLS,
  mergeFilterOptions,
} from '../../constants/discoveryFilters';

const CSS = `
  :root {
    --primary: #98DE38;
    --primary-dark: #7EC42E;
    --secondary: #1B2D7F;
    --secondary-light: #2A3F8F;
    --white: #fff;
    --gray-50: #F9FAFB;
    --gray-100: #F3F4F6;
    --gray-200: #E5E7EB;
  }

  .page-bg {
    background: var(--gray-50);
    background-image: radial-gradient(circle, rgba(152,222,56,.06) 1px, transparent 1px);
    background-size: 28px 28px;
  }

  .g-brand { background: linear-gradient(135deg, var(--primary), var(--primary-dark)); }
  .g-sec { background: linear-gradient(135deg, var(--secondary), var(--secondary-light)); }

  .lift {
    transition: transform .2s cubic-bezier(.22,.68,0,1.2), box-shadow .2s ease;
  }

  .lift:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 32px rgba(27,45,127,.12);
  }

  .shimmer {
    background: linear-gradient(90deg, var(--gray-200) 25%, #ddd 50%, var(--gray-200) 75%);
    background-size: 200% 100%;
    animation: s 1.5s infinite;
    border-radius: 12px;
  }

  @keyframes s {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  button:focus-visible,
  a:focus-visible,
  input:focus-visible,
  select:focus-visible {
    outline: 2px solid var(--primary);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      transition-duration: 0.01ms !important;
    }
  }

  @media (max-width: 768px) {
    button, [role="button"] { min-height: 44px; min-width: 44px; }
  }

  .tooltip-wrap { position: relative; }

  .tooltip-wrap:focus-within .tooltip-box,
  .tooltip-wrap:hover .tooltip-box {
    opacity: 1;
    visibility: visible;
    transform: translateX(-50%) translateY(0);
  }

  .tooltip-box {
    opacity: 0;
    visibility: hidden;
    transform: translateX(-50%) translateY(4px);
    transition: all .15s ease;
    position: absolute;
    bottom: calc(100% + 8px);
    left: 50%;
    background: var(--secondary);
    color: var(--white);
    font-size: 12px;
    padding: 10px 12px;
    border-radius: 10px;
    z-index: 100;
    box-shadow: 0 8px 24px rgba(0,0,0,.2);
    width: 260px;
    white-space: normal;
  }

  .tooltip-box::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    margin-left: -5px;
    border: 5px solid transparent;
    border-top-color: var(--secondary);
  }
`;

const AVATAR_CACHE = new Map();
const CACHE_TTL = 30 * 60 * 1000;

async function getCachedUrl(path) {
  if (!path || path.startsWith('http')) return path;

  const key = `av:${path}`;
  const cached = AVATAR_CACHE.get(key);

  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.url;

  try {
    const cleanPath = path.replace(/^avatars\//, '').replace(/^\/+/, '');

    const { data, error } = await supabase.storage
      .from('avatars')
      .createSignedUrl(cleanPath, 3600);

    if (error) {
      console.warn('Avatar signed URL error:', error.message);
      return null;
    }

    if (data?.signedUrl) {
      AVATAR_CACHE.set(key, { url: data.signedUrl, ts: Date.now() });
      return data.signedUrl;
    }
  } catch (err) {
    console.warn('Avatar load failed:', err);
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

const AVATAR_GRADS = [
  'from-violet-500 to-indigo-500',
  'from-emerald-500 to-teal-500',
  'from-amber-500 to-orange-500',
  'from-blue-500 to-cyan-500',
];

const gradFor = (id = '') => {
  const index = id ? String(id).charCodeAt(0) % AVATAR_GRADS.length : 0;
  return AVATAR_GRADS[index] || AVATAR_GRADS[0];
};

const normalizeText = (value) => String(value || '').toLowerCase().trim();

const normalizeSkill = (skill) => {
  if (!skill) return '';
  if (typeof skill === 'string') return skill;
  return skill.skill || skill.name || skill.title || '';
};

const getNestedProfile = (candidate) => {
  if (!candidate) return {};
  if (Array.isArray(candidate.profiles)) return candidate.profiles[0] || {};
  return candidate.profiles || candidate.profile || candidate.user || {};
};

const getPersonId = (candidate) => {
  const nestedProfile = getNestedProfile(candidate);

  return (
    candidate?.profile_id ||
    candidate?.user_id ||
    candidate?.target_user_id ||
    nestedProfile?.id ||
    candidate?.id
  );
};

const normalizeProfile = (candidate) => {
  const nestedProfile = getNestedProfile(candidate);
  const personId = getPersonId(candidate);

  return {
    ...nestedProfile,
    ...(candidate?.profile || {}),
    id: personId,
    full_name:
      candidate?.full_name ||
      candidate?.name ||
      candidate?.profile_name ||
      candidate?.display_name ||
      nestedProfile?.full_name ||
      nestedProfile?.name ||
      'Student Founder',
    avatar_url:
      candidate?.avatar_url ||
      candidate?.profile_avatar_url ||
      nestedProfile?.avatar_url ||
      null,
    location:
      candidate?.location ||
      candidate?.profile_location ||
      nestedProfile?.location ||
      '',
    bio:
      candidate?.bio ||
      candidate?.profile_bio ||
      nestedProfile?.bio ||
      '',
    user_type:
      candidate?.user_type || nestedProfile?.user_type || 'student',
    skills: candidate?.skills || nestedProfile?.skills || [],
  };
};

const getScore = (candidate) => {
  return Number(
    candidate?.matchScore ||
      candidate?.match_score ||
      candidate?.score ||
      candidate?.ai_score ||
      0
  );
};

const hasLookingFor = (candidate, option) => {
  const values =
    candidate?.looking_for ||
    candidate?.student_profile?.looking_for ||
    candidate?.student_profiles?.looking_for ||
    candidate?.profile?.looking_for ||
    candidate?.profiles?.looking_for ||
    [];

  if (Array.isArray(values)) return values.includes(option);

  return normalizeText(values).includes(normalizeText(option));
};

function computeCoFounderMatch(currentUserProfile, candidate) {
  if (!currentUserProfile || !candidate) {
    return { matchScore: 10, reasons: ['Basic profile compatibility'] };
  }

  let score = 0;
  const reasons = [];

  const currentSkills = new Set(
    (currentUserProfile.skills_with_levels || [])
      .map(normalizeSkill)
      .map(normalizeText)
      .filter(Boolean)
  );

  const candidateSkills = new Set(
    (candidate.skills_with_levels || [])
      .map(normalizeSkill)
      .map(normalizeText)
      .filter(Boolean)
  );

  const currentNeeds = new Set(
    (currentUserProfile.help_needed || [])
      .map(normalizeText)
      .filter(Boolean)
  );

  const currentInterests = new Set(
    (currentUserProfile.interests || [])
      .map(normalizeText)
      .filter(Boolean)
  );

  const candidateInterests = new Set(
    (candidate.interests || [])
      .map(normalizeText)
      .filter(Boolean)
  );

  const needSkillMatches = [...candidateSkills].filter((skill) => {
    return [...currentNeeds].some((need) => {
      return (
        need.includes(skill) ||
        skill.includes(need) ||
        need.split(' ').some((word) => word.length > 2 && skill.includes(word))
      );
    });
  });

  if (needSkillMatches.length > 0) {
    score += Math.min(25, needSkillMatches.length * 10);
    reasons.push(`Matches your needs: ${needSkillMatches.slice(0, 2).join(', ')}`);
  }

  const complementarySkills = [...candidateSkills].filter(
    (skill) => !currentSkills.has(skill)
  );

  if (complementarySkills.length > 0) {
    score += Math.min(20, complementarySkills.length * 5);
    reasons.push(`Complementary skills: ${complementarySkills.slice(0, 2).join(', ')}`);
  }

  if (
    currentUserProfile.commitment_level &&
    candidate.commitment_level &&
    currentUserProfile.commitment_level === candidate.commitment_level
  ) {
    score += 15;
    reasons.push(`Same commitment level: ${candidate.commitment_level}`);
  }

  if (
    currentUserProfile.idea_domain &&
    candidate.idea_domain &&
    normalizeText(currentUserProfile.idea_domain) === normalizeText(candidate.idea_domain)
  ) {
    score += 15;
    reasons.push(`Same startup domain: ${candidate.idea_domain}`);
  } else {
    const sharedInterests = [...currentInterests].filter((interest) =>
      candidateInterests.has(interest)
    );

    if (sharedInterests.length > 0) {
      score += Math.min(10, sharedInterests.length * 5);
      reasons.push(`Shared interests: ${sharedInterests.slice(0, 2).join(', ')}`);
    }
  }

  if (currentUserProfile.has_startup_idea && candidate.has_startup_idea) {
    score += 10;
    reasons.push('Both are working on startup ideas');
  }

  if (
    currentUserProfile.university &&
    candidate.university &&
    normalizeText(currentUserProfile.university) === normalizeText(candidate.university)
  ) {
    score += 5;
    reasons.push('Same university network');
  }

  const completion = Number(candidate.profile_completion || 0);

  if (completion >= 80) {
    score += 10;
    reasons.push('Strong completed profile');
  } else if (completion >= 50) {
    score += 5;
    reasons.push('Decent profile completion');
  }

  const finalScore = Math.max(10, Math.min(100, Math.round(score)));

  return {
    matchScore: finalScore,
    reasons: reasons.length ? reasons.slice(0, 3) : ['Basic profile compatibility'],
  };
}

function buildMatchReasons(currentUserProfile, candidate) {
  return computeCoFounderMatch(currentUserProfile, candidate).reasons;
}

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

    getCachedUrl(path).then((avatarUrl) => {
      if (!cancelled) {
        setUrl(avatarUrl);
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

  if (loading) return <div className={`${sizeClass} rounded-xl shimmer`} aria-hidden="true" />;

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

const CoFounderCard = memo(function CoFounderCard({
  candidate,
  currentUserProfile,
  connectionStatus,
  onConnect,
  onMessage,
  connecting,
}) {
  const personId = getPersonId(candidate);
  const p = useMemo(() => normalizeProfile(candidate), [candidate]);
  const score = getScore(candidate);
  const isFounderCandidate =
    candidate.candidate_type === 'founder' || p.user_type === 'early-stage-founder';

  const reasons = useMemo(() => {
    return candidate.reasons?.length
      ? candidate.reasons
      : buildMatchReasons(currentUserProfile, candidate);
  }, [currentUserProfile, candidate]);

  const skillNames = useMemo(() => {
    return [
      ...new Set(
        [
          ...(candidate.skills_with_levels || []).map(normalizeSkill),
          ...(candidate.skills || []),
          ...(p.skills || []),
        ]
          .flat()
          .map(normalizeSkill)
          .filter(Boolean)
      ),
    ].slice(0, 5);
  }, [candidate, p.skills]);

  const buttonState = connecting || connectionStatus;

  return (
    <article className="bg-white rounded-2xl p-5 border border-gray-100 lift">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="hidden sm:block w-1 rounded-full self-stretch g-brand" aria-hidden="true" />

        <Avatar name={p.full_name} path={p.avatar_url} grad={gradFor(personId)} size="xl" />

        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
            <div>
              <p className="font-bold text-gray-900 truncate">{p.full_name}</p>

              <p className="text-xs text-gray-500">
                {candidate.university || 'University not added'}
                {candidate.degree ? ` · ${candidate.degree}` : ''}
                {candidate.major ? ` · ${candidate.major}` : ''}
                {candidate.current_year ? ` · ${candidate.current_year}` : ''}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black px-2.5 py-1 rounded-full bg-[#98DE38]/20 text-[#1B2D7F]">
                {score}% Match
              </span>

              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-purple-50 text-purple-700">
                {isFounderCandidate ? 'Founder Match' : 'Co-Founder'}
              </span>
            </div>
          </div>

          {p.location && (
            <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
              <MapPin className="w-3" />
              {p.location}
            </p>
          )}

          {p.bio && <p className="text-sm text-gray-600 mt-2 line-clamp-2">{p.bio}</p>}

          {candidate.startup_idea_description && (
            <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl mt-3">
              <p className="text-xs font-bold text-indigo-600 flex items-center gap-1 mb-1">
                <Lightbulb className="w-3" />
                Startup Idea
              </p>

              <p className="text-sm text-gray-700 line-clamp-2">
                {candidate.startup_idea_description}
              </p>
            </div>
          )}

          {skillNames.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {skillNames.map((skill, index) => (
                <span
                  key={`${skill}-${index}`}
                  className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-700"
                >
                  {skill}
                </span>
              ))}
            </div>
          )}

          {candidate.help_needed?.length > 0 && (
            <p className="text-xs text-gray-500 mt-2">
              Needs: {candidate.help_needed.slice(0, 3).join(', ')}
            </p>
          )}

          {candidate.commitment_level && (
            <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
              <Clock className="w-3" />
              {candidate.commitment_level}
            </p>
          )}

          <IntelligentMatchPanel
            currentProfile={currentUserProfile}
            candidate={candidate}
            context="cofounder"
          />

          <div className="tooltip-wrap mt-3 inline-block">
            <button
              type="button"
              className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
              aria-label="Why recommended?"
            >
              <Info className="w-3" />
              Why this match?
            </button>

            <div className="tooltip-box">
              <p className="font-semibold mb-1">Match Reasons:</p>

              <ul className="list-disc list-inside text-xs space-y-1">
                {reasons.map((reason, index) => (
                  <li key={`${reason}-${index}`}>{reason}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-4">
            <Link
              to={`/user-profile/${personId}`}
              className="py-2 border-2 border-indigo-100 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-bold hover:bg-indigo-100 transition flex items-center justify-center"
            >
              View Profile
            </Link>

            <button
              type="button"
              onClick={() => {
                if (connectionStatus === 'accepted') onMessage(personId);
              }}
              disabled={connectionStatus !== 'accepted'}
              title={
                connectionStatus === 'accepted'
                  ? 'Message this connection'
                  : 'Connect first to send messages'
              }
              className={`py-2 border-2 rounded-xl text-xs font-bold transition flex items-center justify-center ${
                connectionStatus === 'accepted'
                  ? 'border-gray-200 hover:border-gray-300 text-gray-800 bg-white'
                  : 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed'
              }`}
            >
              <MessageSquare className="w-3.5 mr-1" />
              {connectionStatus === 'accepted' ? 'Message' : 'Connect first'}
            </button>

            {buttonState === 'accepted' ? (
              <button
                type="button"
                disabled
                className="py-2 bg-green-50 border border-green-200 text-green-700 rounded-xl text-xs font-bold flex items-center justify-center"
              >
                <CheckCircle className="w-3.5 mr-1" />
                Connected
              </button>
            ) : buttonState === 'pending' || buttonState === 'sent' ? (
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
                onClick={() => onConnect(candidate)}
                disabled={buttonState === true}
                className="py-2 g-brand text-black rounded-xl text-xs font-black hover:opacity-90 transition flex items-center justify-center disabled:opacity-60"
              >
                {buttonState === true ? (
                  <Loader className="w-3.5 animate-spin mr-1" />
                ) : (
                  <UserPlus className="w-3.5 mr-1" />
                )}
                {buttonState === true ? 'Sending...' : 'Connect'}
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
});

export default function FindCoFoundersPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [state, setState] = useState({ loading: true, error: null });
  const [data, setData] = useState({ profile: {}, coFounders: [], myConnections: [] });

  const [filters, setFilters] = useState({
    skill: 'All',
    commitment: 'All',
    query: '',
    matchBand: 'all',
  });

  const [connecting, setConnecting] = useState({});
  const [connStatusMap, setConnStatusMap] = useState({});

  const normalizeCandidate = useCallback((candidate, currentProfile) => {
    const personId = getPersonId(candidate);
    const p = normalizeProfile(candidate);
    const calculated = computeCoFounderMatch(currentProfile, candidate);

    return {
      ...candidate,
      profile_id: personId,
      user_id: candidate?.user_id || personId,
      full_name: p.full_name,
      avatar_url: p.avatar_url,
      location: p.location,
      bio: p.bio,
      user_type: p.user_type,
      matchScore: Number(
        candidate.matchScore ||
          candidate.match_score ||
          candidate.score ||
          candidate.ai_score ||
          calculated.matchScore
      ),
      reasons: candidate.reasons?.length ? candidate.reasons : calculated.reasons,
    };
  }, []);

  const load = useCallback(async () => {
    if (!user?.id) return;

    setState({ loading: true, error: null });

    try {
      const [profileRes, studentRes, serviceCoFoundersRes, myConnectionsRes] =
        await Promise.allSettled([
          supabase
            .from('profiles')
            .select('id, full_name, avatar_url, location, bio, user_type')
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
              profile_completion
            `)
            .eq('user_id', user.id)
            .maybeSingle(),

          fetchCoFounders({
            limit: 100,
            excludeUserId: user.id,
            fresh: true,
          }),

          backendApi.getMyConnections(),
        ]);

      const profileData =
        profileRes.status === 'fulfilled' ? profileRes.value.data || {} : {};

      const studentData =
        studentRes.status === 'fulfilled' ? studentRes.value.data || {} : {};

      const currentProfile = { ...profileData, ...studentData };

      let coFounders = [];

      if (serviceCoFoundersRes.status === 'fulfilled' && Array.isArray(serviceCoFoundersRes.value)) {
        coFounders = serviceCoFoundersRes.value
          .map((candidate) => normalizeCandidate(candidate, currentProfile))
          .filter((candidate) => hasLookingFor(candidate, 'Co-Founder'));
      }

      if (!coFounders.length) {
        const { data: fallbackData, error: fallbackError } = await supabase
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
            profile_completion,
            profiles!student_profiles_user_id_fkey(
              id,
              full_name,
              avatar_url,
              location,
              bio,
              user_type
            )
          `)
          .contains('looking_for', ['Co-Founder'])
          .neq('user_id', user.id)
          .limit(100);

        if (fallbackError) throw fallbackError;

        coFounders = (fallbackData || [])
          .map((candidate) => normalizeCandidate({ ...candidate, profile_id: candidate.user_id }, currentProfile))
          .filter((candidate) => hasLookingFor(candidate, 'Co-Founder'));
      }

      coFounders = coFounders.sort((a, b) => getScore(b) - getScore(a));

      const myConnections =
        myConnectionsRes.status === 'fulfilled'
          ? myConnectionsRes.value?.data || []
          : [];

      const statusMap = {};

      myConnections.forEach((connection) => {
        if (connection.otherUser?.id) statusMap[connection.otherUser.id] = 'accepted';
      });

      setConnStatusMap(statusMap);

      setData({ profile: currentProfile, coFounders, myConnections });
      setState({ loading: false, error: null });
    } catch (err) {
      console.error('Find cofounders load failed:', err);
      setState({ loading: false, error: err.message || 'Failed to load co-founders' });
      toast.error('Failed to load co-founders');
    }
  }, [user?.id, normalizeCandidate]);

  useEffect(() => {
    load();
  }, [load]);

  const allSkills = useMemo(() => {
    const skills = [];

    data.coFounders.forEach((candidate) => {
      (candidate.skills_with_levels || []).forEach((skill) => {
        const name = normalizeSkill(skill);
        if (name) skills.push(name);
      });

      (candidate.skills || []).forEach((skill) => {
        const name = normalizeSkill(skill);
        if (name) skills.push(name);
      });
    });

    return ['All', ...mergeFilterOptions(DISCOVERY_SKILLS, skills)];
  }, [data.coFounders]);

  const filtered = useMemo(() => {
    const { query, skill, commitment, matchBand } = filters;

    return (data.coFounders || [])
      .filter((candidate) => {
        const personId = getPersonId(candidate);
        if (!personId) return false;
        if (!hasLookingFor(candidate, 'Co-Founder')) return false;

        const p = normalizeProfile(candidate);
        const score = getScore(candidate);

        const skills = [
          ...(candidate.skills_with_levels || []).map(normalizeSkill),
          ...(candidate.skills || []),
          ...(p.skills || []),
        ]
          .flat()
          .map(normalizeSkill)
          .map(normalizeText)
          .filter(Boolean);

        const searchText = [
          p.full_name,
          p.bio,
          p.location,
          candidate.university,
          candidate.degree,
          candidate.major,
          candidate.current_year,
          candidate.startup_idea_description,
          candidate.idea_title,
          candidate.idea_domain,
          candidate.commitment_level,
          skills.join(' '),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        const matchQuery = !query || searchText.includes(query.toLowerCase());
        const matchSkill = skill === 'All' || skills.some((item) => item.includes(skill.toLowerCase()));
        const matchCommitment = commitment === 'All' || candidate.commitment_level === commitment;
        const matchBandOk =
          matchBand === 'all' ||
          (matchBand === 'below60' && score < 60) ||
          (matchBand === '60plus' && score >= 60);

        return matchQuery && matchSkill && matchCommitment && matchBandOk;
      })
      .sort((a, b) => getScore(b) - getScore(a));
  }, [data.coFounders, filters]);

  const handleConnect = async (candidate) => {
    const targetUserId = getPersonId(candidate);
    const p = normalizeProfile(candidate);
    const name = p.full_name || 'there';

    if (!targetUserId || connecting[targetUserId]) return;

    setConnecting((prev) => ({ ...prev, [targetUserId]: true }));

    try {
      const score = getScore(candidate);

      const response = await backendApi.sendConnect(
        targetUserId,
        `Hi ${name}, our profiles match ${score}%. I’d like to explore a co-founder fit with you.`,
        'cofounder_request'
      );

      if (response.alreadyConnected || response.status === 'accepted') {
        setConnStatusMap((prev) => ({ ...prev, [targetUserId]: 'accepted' }));
        toast.success('Already connected');
        return;
      }

      setConnStatusMap((prev) => ({ ...prev, [targetUserId]: 'pending' }));

      toast.success(
        response.alreadyPending ? 'Request already pending' : 'Connection request sent',
        { style: { background: '#98DE38', color: '#000' } }
      );
    } catch (err) {
      console.error('Connect failed:', err);
      toast.error(err.message || 'Could not send request');
    } finally {
      setConnecting((prev) => ({ ...prev, [targetUserId]: false }));
    }
  };

  const handleMessage = async (targetUserId) => {
    if (!targetUserId) {
      toast.error('User ID missing');
      return;
    }

    if (connStatusMap[targetUserId] !== 'accepted') {
      toast.error('Connect first to send messages');
      return;
    }

    try {
      const res = await backendApi.getOrCreateConversation(targetUserId);
      const convId = res.conversationId || res.id || res.data?.id;
      navigate(convId ? `/messages?conv=${convId}` : '/messages');
    } catch (err) {
      console.error('Open message failed:', err);
      toast.error('Could not open conversation');
    }
  };

  const resetFilters = () => {
    setFilters({ skill: 'All', commitment: 'All', query: '', matchBand: 'all' });
  };

  if (state.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-[#1B2D7F]" />
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-red-100 p-6 text-center max-w-md">
          <p className="font-bold text-red-600 mb-2">Could not load co-founders</p>
          <p className="text-sm text-gray-500 mb-4">{state.error}</p>
          <button type="button" onClick={load} className="px-4 py-2 g-brand text-black rounded-xl text-sm font-bold">
            Try again
          </button>
        </div>
      </div>
    );
  }

  const totalCandidates = (data.coFounders || []).filter((candidate) => {
    const id = getPersonId(candidate);
    return id && hasLookingFor(candidate, 'Co-Founder');
  }).length;

  const below60Count = (data.coFounders || []).filter((candidate) => {
    const id = getPersonId(candidate);
    return id && hasLookingFor(candidate, 'Co-Founder') && getScore(candidate) < 60;
  }).length;

  const strongCount = (data.coFounders || []).filter((candidate) => {
    const id = getPersonId(candidate);
    return id && hasLookingFor(candidate, 'Co-Founder') && getScore(candidate) >= 60;
  }).length;

  return (
    <>
      <style>{CSS}</style>

      <div className="min-h-screen page-bg pt-20 pb-16 px-4">
        <div className="max-w-6xl mx-auto">
          <header className="mb-8">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase px-3 py-1 rounded-full bg-green-50 text-green-700 border border-green-200">
              <Users className="w-3.5" />
              Find Co-Founders
            </span>

            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mt-3">
              <div>
                <h1 className="text-3xl sm:text-4xl font-black text-gray-900">Build Together</h1>
                <p className="text-gray-500 text-sm max-w-xl mt-2">
                  Explore students who selected Co-Founder in Looking For. Best 60%+ matches appear on your dashboard.
                </p>
              </div>

              <Link
                to="/profile"
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-bold text-gray-700 hover:bg-gray-50"
              >
                Improve Matching
                <ArrowRight className="w-4" />
              </Link>
            </div>
          </header>

          <section className="grid sm:grid-cols-3 gap-3 mb-6">
            <div className="bg-white rounded-2xl p-4 border border-gray-100">
              <p className="text-xs text-gray-500">Available co-founder candidates</p>
              <p className="text-2xl font-black text-gray-900">{totalCandidates}</p>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-gray-100">
              <p className="text-xs text-gray-500">Explore matches below 60%</p>
              <p className="text-2xl font-black text-gray-900">{below60Count}</p>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-gray-100">
              <p className="text-xs text-gray-500">Strong matches 60%+</p>
              <p className="text-2xl font-black text-gray-900">{strongCount}</p>
            </div>
          </section>

          <section className="bg-white border border-gray-200 rounded-2xl p-4 mb-6">
            <div className="flex items-center gap-2">
              <Search className="w-5 text-gray-400" />

              <input
                type="text"
                value={filters.query}
                onChange={(event) => setFilters((prev) => ({ ...prev, query: event.target.value }))}
                placeholder="Search by name, skill, university, idea…"
                className="flex-1 outline-none text-sm"
                aria-label="Search co-founders"
              />

              {filters.query && (
                <button
                  type="button"
                  onClick={() => setFilters((prev) => ({ ...prev, query: '' }))}
                  className="p-1 hover:bg-gray-100 rounded"
                  aria-label="Clear search"
                >
                  <X className="w-4 text-gray-400" />
                </button>
              )}
            </div>

            <div className="grid md:grid-cols-4 gap-3 mt-4">
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">Match band</label>
                <select
                  value={filters.matchBand}
                  onChange={(event) => setFilters((prev) => ({ ...prev, matchBand: event.target.value }))}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm"
                >
                  <option value="all">All matches</option>
                  <option value="60plus">60%+</option>
                  <option value="below60">Below 60%</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">Skill</label>
                <select
                  value={filters.skill}
                  onChange={(event) => setFilters((prev) => ({ ...prev, skill: event.target.value }))}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm"
                >
                  {allSkills.map((skill) => (
                    <option key={skill} value={skill}>{skill}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">Commitment</label>
                <select
                  value={filters.commitment}
                  onChange={(event) => setFilters((prev) => ({ ...prev, commitment: event.target.value }))}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm"
                >
                  <option value="All">All</option>
                  {COMMITMENT_OPTIONS.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={resetFilters}
                  className="w-full py-2 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-2"
                >
                  <SlidersHorizontal className="w-4" />
                  Reset
                </button>
              </div>
            </div>
          </section>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
            <p className="text-sm text-gray-500">
              Showing <span className="font-bold text-gray-900">{filtered.length}</span> results
            </p>
            <p className="text-xs text-gray-400">Message unlocks after accepted connection.</p>
          </div>

          {filtered.length > 0 ? (
            <div className="grid lg:grid-cols-2 gap-4" aria-live="polite">
              {filtered.map((candidate) => {
                const id = getPersonId(candidate);
                return (
                  <CoFounderCard
                    key={id || candidate.id}
                    candidate={candidate}
                    currentUserProfile={data.profile}
                    connectionStatus={connStatusMap[id]}
                    connecting={connecting[id]}
                    onConnect={handleConnect}
                    onMessage={handleMessage}
                  />
                );
              })}
            </div>
          ) : (
            <div className="py-14 text-center bg-white rounded-2xl border border-gray-200 text-gray-500">
              <div className="w-14 h-14 rounded-full bg-gray-50 mx-auto mb-4 flex items-center justify-center">
                <Sparkles className="w-6 text-gray-400" />
              </div>
              <p className="font-bold text-gray-800">No co-founders match your filters.</p>
              <p className="text-sm text-gray-500 mt-1">Try changing match band, skill, or search query.</p>
              <button type="button" onClick={resetFilters} className="mt-4 px-4 py-2 g-brand text-black rounded-xl text-sm font-black">
                Clear filters
              </button>
            </div>
          )}

          <aside className="mt-8 bg-white rounded-2xl p-5 border border-gray-100">
            <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
              <ShieldCheck className="w-4 text-[#1B2D7F]" />
              Matching tip
            </h3>

            <p className="text-sm text-gray-600">
              Add skills, help-needed fields, commitment level, startup idea details, and interests to improve AI matching quality.
            </p>

            <Link to="/profile" className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 mt-3 hover:underline">
              Edit Profile <ArrowRight className="w-3" />
            </Link>
          </aside>
        </div>
      </div>
    </>
  );
}
