// src/pages/FindMentorsPage.jsx
import React, {
  useState,
  useEffect,
  useCallback,
  memo,
  useMemo,
  useRef,
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
  Coffee,
  Info,
  ArrowRight,
  Award,
  SlidersHorizontal,
  Sparkles,
  ShieldCheck,
  GraduationCap,
  BookOpen,
  Heart,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../auth/AuthContext';
import { backendApi } from '../../lib/backendApi';
import IntelligentMatchPanel from '../../components/IntelligentMatchPanel';
import { attachMatchIntelligence } from '../../services/intelligentMatching';
import {
  DISCOVERY_LOCATIONS,
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

  .g-brand {
    background: linear-gradient(135deg, var(--primary), var(--primary-dark));
  }

  .g-sec {
    background: linear-gradient(135deg, var(--secondary), var(--secondary-light));
  }

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
    button, [role="button"] {
      min-height: 44px;
      min-width: 44px;
    }
  }

  .tooltip-wrap {
    position: relative;
  }

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
const FIND_MENTORS_PAGE_CACHE = new Map();
const FIND_MENTORS_PAGE_TTL = 45 * 1000;

async function getCachedUrl(path) {
  if (!path || path.startsWith('http')) return path;

  const key = `av:${path}`;
  const cached = AVATAR_CACHE.get(key);

  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.url;
  }

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
      AVATAR_CACHE.set(key, {
        url: data.signedUrl,
        ts: Date.now(),
      });

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
  const index = id ? id.charCodeAt(0) % AVATAR_GRADS.length : 0;
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
      candidate?.user_type ||
      nestedProfile?.user_type ||
      'student',
    skills:
      candidate?.skills ||
      nestedProfile?.skills ||
      [],
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

function computeMentorMatchScore(currentUserProfile, candidate) {
  let score = 0;
  const reasons = [];

  const currentHelpNeeded = new Set(
    (currentUserProfile.help_needed || [])
      .map(normalizeText)
      .filter(Boolean)
  );

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

  const needMatches = [...currentHelpNeeded].filter((need) => {
    const tokens = need.split(/\s+|&|\//).filter((token) => token.length > 2);

    return [...candidateSkills].some((skill) => {
      return (
        skill.includes(need) ||
        need.includes(skill) ||
        tokens.some((token) => skill.includes(token))
      );
    });
  });

  if (needMatches.length > 0) {
    score += Math.min(30, needMatches.length * 10);
    reasons.push(`Can support your needs: ${needMatches.slice(0, 2).join(', ')}`);
  }

  const skillOverlap = [...currentSkills].filter((skill) => candidateSkills.has(skill));
  if (skillOverlap.length > 0) {
    score += Math.min(15, skillOverlap.length * 5);
    reasons.push(`Understands your skill area: ${skillOverlap.slice(0, 2).join(', ')}`);
  }

  const sharedInterests = [...currentInterests].filter((interest) =>
    candidateInterests.has(interest)
  );

  if (sharedInterests.length > 0) {
    score += Math.min(15, sharedInterests.length * 5);
    reasons.push(`Shared interests: ${sharedInterests.slice(0, 2).join(', ')}`);
  }

  if (
    currentUserProfile.idea_domain &&
    candidate.idea_domain &&
    currentUserProfile.idea_domain === candidate.idea_domain
  ) {
    score += 15;
    reasons.push(`Same startup domain: ${candidate.idea_domain}`);
  }

  if (candidate.has_startup_idea) {
    score += 5;
    reasons.push('Also has startup-building context');
  }

  const completion = Number(candidate.profile_completion || 0);
  if (completion >= 80) {
    score += 10;
    reasons.push('Strong completed profile');
  } else if (completion >= 50) {
    score += 5;
    reasons.push('Decent profile completion');
  }

  if (
    currentUserProfile.university &&
    candidate.university &&
    normalizeText(currentUserProfile.university) === normalizeText(candidate.university)
  ) {
    score += 5;
    reasons.push('Same university network');
  }

  const finalScore = Math.max(10, Math.min(100, Math.round(score)));

  return {
    matchScore: finalScore,
    reasons: reasons.length ? reasons.slice(0, 3) : ['Basic mentor fit based on profile data'],
  };
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

const MentorCard = memo(function MentorCard({
  mentor,
  currentUserProfile,
  connectionStatus,
  onConnect,
  onMessage,
  connecting,
}) {
  const personId = getPersonId(mentor);
  const p = useMemo(() => normalizeProfile(mentor), [mentor]);
  const score = getScore(mentor);

  const reasons = useMemo(() => {
    return mentor.reasons?.length
      ? mentor.reasons
      : computeMentorMatchScore(currentUserProfile, mentor).reasons;
  }, [currentUserProfile, mentor]);

  const skillNames = useMemo(() => {
    return [
      ...new Set(
        [
          ...(mentor.skills_with_levels || []).map(normalizeSkill),
          ...(mentor.skills || []),
          ...(p.skills || []),
        ]
          .flat()
          .map(normalizeSkill)
          .filter(Boolean)
      ),
    ].slice(0, 5);
  }, [mentor, p.skills]);

  const buttonState = connecting || connectionStatus;

  return (
    <article className="bg-white rounded-2xl p-5 border border-gray-100 lift">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="hidden sm:block w-1 rounded-full self-stretch g-brand" aria-hidden="true" />

        <Avatar
          name={p.full_name}
          path={p.avatar_url}
          grad={gradFor(personId)}
          size="xl"
        />

        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
            <div>
              <p className="font-bold text-gray-900 truncate">{p.full_name}</p>

              <p className="text-xs text-gray-500">
                {mentor.current_role || 'Mentor'}
                {mentor.current_company ? ` · ${mentor.current_company}` : ''}
                {mentor.years_experience ? ` · ${mentor.years_experience} years` : ''}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black px-2.5 py-1 rounded-full bg-[#98DE38]/20 text-[#1B2D7F]">
                {score}% Match
              </span>

              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700">
                Mentor
              </span>
            </div>
          </div>

          {p.location && (
            <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
              <MapPin className="w-3" />
              {p.location}
            </p>
          )}

          {p.bio && (
            <p className="text-sm text-gray-600 mt-2 line-clamp-2">
              {p.bio}
            </p>
          )}

          {(mentor.success_stories || mentor.mentorship_style) && (
            <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl mt-3">
              <p className="text-xs font-bold text-indigo-600 flex items-center gap-1 mb-1">
                <BookOpen className="w-3" />
                Mentorship Context
              </p>

              <p className="text-sm text-gray-700 line-clamp-2">
                {mentor.success_stories || mentor.mentorship_style}
              </p>
            </div>
          )}

          {skillNames.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {skillNames.map((skill, index) => (
                <span
                  key={`${skill}-${index}`}
                  className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700"
                >
                  {skill}
                </span>
              ))}
            </div>
          )}

          {mentor.can_help_with?.length > 0 && (
            <p className="text-xs text-gray-500 mt-2 flex items-start gap-1">
              <Heart className="w-3 mt-0.5 flex-shrink-0" />
              Can help with: {mentor.can_help_with.slice(0, 3).join(', ')}
            </p>
          )}

          {(mentor.availability_hours || mentor.mentorship_mode) && (
            <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
              <Clock className="w-3" />
              {[mentor.availability_hours, mentor.mentorship_mode].filter(Boolean).join(' · ')}
            </p>
          )}

          <IntelligentMatchPanel
            currentProfile={currentUserProfile}
            candidate={mentor}
            context="mentor"
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
                if (connectionStatus === 'accepted') {
                  onMessage(personId);
                }
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
                onClick={() => onConnect(mentor)}
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

export default function FindMentorsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [state, setState] = useState({
    loading: true,
    error: null,
  });

  const [data, setData] = useState({
    profile: {},
    mentors: [],
    myConnections: [],
  });

  const [filters, setFilters] = useState({
    skill: 'All',
    location: 'All',
    proBono: false,
    query: '',
    matchBand: 'all',
  });

  const [connecting, setConnecting] = useState({});
  const [connStatusMap, setConnStatusMap] = useState({});
  const activeLoadRef = useRef('');

  const normalizeCandidate = useCallback((candidate, currentProfile) => {
    const personId = getPersonId(candidate);
    const p = normalizeProfile(candidate);
    const calculated = computeMentorMatchScore(currentProfile, candidate);

    return {
      ...candidate,
      profile_id: personId,
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
      reasons:
        candidate.reasons?.length
          ? candidate.reasons
          : calculated.reasons,
    };
  }, []);

  const load = useCallback(async () => {
    if (!user?.id) return;
    if (activeLoadRef.current === user.id) return;

    const cacheKey = `mentors:${user.id}`;
    const cached = FIND_MENTORS_PAGE_CACHE.get(cacheKey);

    if (cached && cached.expiresAt > Date.now()) {
      setConnStatusMap(cached.statusMap);
      setData(cached.data);
      setState({ loading: false, error: null });
      return;
    }

    activeLoadRef.current = user.id;

    setState({
      loading: true,
      error: null,
    });

    try {
      const [profileRes, studentRes, founderRes, myConnectionsRes] = await Promise.allSettled([
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

        supabase
          .from('founder_profiles')
          .select('user_id, industry, founder_skills, help_needed, commitment_level, looking_for')
          .eq('user_id', user.id)
          .maybeSingle(),

        backendApi.getMyConnections(),
      ]);

      const profileData =
        profileRes.status === 'fulfilled' ? profileRes.value.data || {} : {};

      const studentData =
        studentRes.status === 'fulfilled' ? studentRes.value.data || {} : {};
      const founderData =
        founderRes.status === 'fulfilled' ? founderRes.value.data || {} : {};

      const currentProfile = {
        ...profileData,
        ...studentData,
        ...(founderData.user_id ? {
          idea_domain: founderData.industry,
          skills_with_levels: (founderData.founder_skills || []).map((skill) => ({ skill })),
          help_needed: founderData.help_needed || [],
          commitment_level: founderData.commitment_level,
          looking_for: founderData.looking_for || [],
          interests: [founderData.industry].filter(Boolean),
          has_startup_idea: true,
        } : {}),
      };

      const { data: mentorRows, error: mentorsError } = await supabase
        .from('mentor_profiles')
        .select(`
          *,
          profiles!mentor_profiles_user_id_fkey(
            id,
            full_name,
            avatar_url,
            location,
            bio,
            user_type
          )
        `)
        .eq('is_public', true)
        .eq('is_active', true)
        .neq('user_id', user.id)
        .limit(80);

      if (mentorsError) throw mentorsError;

      const mentors = attachMatchIntelligence(
        (mentorRows || [])
        .map((candidate) =>
          normalizeCandidate(
            {
              ...candidate,
              profile_id: candidate.user_id,
              skills_with_levels: (candidate.expertise_areas || []).map((skill) => ({ skill })),
              skills: candidate.expertise_areas || [],
              interests: candidate.industries_supported || [],
              help_needed: candidate.can_help_with || [],
              commitment_level: candidate.availability_hours || candidate.mentorship_mode || '',
              looking_for: ['Mentor'],
            },
            currentProfile
          )
        )
        .filter((candidate) => getPersonId(candidate)),
        currentProfile,
        'mentor'
      );

      const myConnections =
        myConnectionsRes.status === 'fulfilled'
          ? myConnectionsRes.value?.data || []
          : [];

      const statusMap = {};

      myConnections.forEach((connection) => {
        if (connection.otherUser?.id) {
          statusMap[connection.otherUser.id] = 'accepted';
        }
      });

      setConnStatusMap(statusMap);

      const nextData = {
        profile: currentProfile,
        mentors,
        myConnections,
      };

      FIND_MENTORS_PAGE_CACHE.set(cacheKey, {
        data: nextData,
        statusMap,
        expiresAt: Date.now() + FIND_MENTORS_PAGE_TTL,
      });

      setData(nextData);

      setState({
        loading: false,
        error: null,
      });
    } catch (err) {
      console.error('Find mentors load failed:', err);

      setState({
        loading: false,
        error: err.message || 'Failed to load mentors',
      });

      toast.error('Failed to load mentors');
    } finally {
      activeLoadRef.current = '';
    }
  }, [user?.id, normalizeCandidate]);

  useEffect(() => {
    load();
  }, [load]);

  const allSkills = useMemo(() => {
    const skills = [];

    data.mentors.forEach((candidate) => {
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
  }, [data.mentors]);

  const allLocations = useMemo(() => {
    const locations = [];

    data.mentors.forEach((candidate) => {
      const p = normalizeProfile(candidate);
      if (p.location) locations.push(p.location);
    });

    return ['All', ...mergeFilterOptions(DISCOVERY_LOCATIONS, locations)];
  }, [data.mentors]);

  const filtered = useMemo(() => {
    const { query, skill, location, proBono, matchBand } = filters;

    return (data.mentors || [])
      .filter((mentor) => {
        const personId = getPersonId(mentor);
        if (!personId) return false;

        const p = normalizeProfile(mentor);
        const score = getScore(mentor);

        const skills = [
          ...(mentor.skills_with_levels || []).map(normalizeSkill),
          ...(mentor.skills || []),
          ...(p.skills || []),
        ]
          .flat()
          .map(normalizeSkill)
          .map((item) => String(item || '').toLowerCase())
          .filter(Boolean);

        const searchText = [
          p.full_name,
          p.bio,
          p.location,
          mentor.current_role,
          mentor.current_company,
          mentor.mentorship_style,
          mentor.mentorship_mode,
          mentor.availability_hours,
          mentor.success_stories,
          skills.join(' '),
          (mentor.can_help_with || []).join(' '),
          (mentor.expertise_areas || []).join(' '),
          (mentor.industries_supported || []).join(' '),
          (mentor.interests || []).join(' '),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        const matchQuery = !query || searchText.includes(query.toLowerCase());

        const matchSkill =
          skill === 'All' ||
          skills.some((item) => item.includes(skill.toLowerCase()));

        const matchLocation =
          location === 'All' ||
          p.location?.toLowerCase().includes(location.toLowerCase());

        const matchProBono = !proBono || mentor.pro_bono === true;

        const matchBandOk =
          matchBand === 'all' ||
          (matchBand === 'below60' && score < 60) ||
          (matchBand === '60plus' && score >= 60);

        return matchQuery && matchSkill && matchLocation && matchProBono && matchBandOk;
      })
      .sort((a, b) => getScore(b) - getScore(a));
  }, [data.mentors, filters]);

  const handleConnect = async (mentor) => {
    const targetUserId = getPersonId(mentor);
    const p = normalizeProfile(mentor);
    const name = p.full_name || 'there';

    if (!targetUserId || connecting[targetUserId]) return;

    setConnecting((prev) => ({
      ...prev,
      [targetUserId]: true,
    }));

    try {
      const score = getScore(mentor);

      const response = await backendApi.sendConnect(
        targetUserId,
        `Hi ${name}, our profiles match ${score}%. I would like to connect for mentorship guidance.`,
        'mentor_request'
      );

      if (response.alreadyConnected || response.status === 'accepted') {
        setConnStatusMap((prev) => ({
          ...prev,
          [targetUserId]: 'accepted',
        }));

        toast.success('Already connected');
        return;
      }

      setConnStatusMap((prev) => ({
        ...prev,
        [targetUserId]: 'pending',
      }));

      toast.success(
        response.alreadyPending ? 'Request already pending' : 'Mentor request sent',
        {
          style: {
            background: '#98DE38',
            color: '#000',
          },
        }
      );
    } catch (err) {
      console.error('Mentor connect failed:', err);
      toast.error(err.message || 'Could not send mentor request');
    } finally {
      setConnecting((prev) => ({
        ...prev,
        [targetUserId]: false,
      }));
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
      console.error('Open mentor message failed:', err);
      toast.error('Could not open conversation');
    }
  };

  const resetFilters = () => {
    setFilters({
      skill: 'All',
      location: 'All',
      proBono: false,
      query: '',
      matchBand: 'all',
    });
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
          <p className="font-bold text-red-600 mb-2">Could not load mentors</p>
          <p className="text-sm text-gray-500 mb-4">{state.error}</p>
          <button
            type="button"
            onClick={load}
            className="px-4 py-2 g-brand text-black rounded-xl text-sm font-bold"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  const totalMentors = (data.mentors || []).filter((mentor) => {
    const id = getPersonId(mentor);
    return Boolean(id);
  }).length;

  const below60Count = (data.mentors || []).filter((mentor) => {
    const id = getPersonId(mentor);
    return id && getScore(mentor) < 60;
  }).length;

  const strongCount = (data.mentors || []).filter((mentor) => {
    const id = getPersonId(mentor);
    return id && getScore(mentor) >= 60;
  }).length;

  const { skill, location, proBono, query, matchBand } = filters;

  return (
    <>
      <style>{CSS}</style>

      <div className="min-h-screen page-bg pt-20 pb-16 px-4">
        <div className="max-w-6xl mx-auto">
          <header className="mb-8">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase px-3 py-1 rounded-full bg-green-50 text-green-700 border border-green-200">
              <Users className="w-3.5" />
              Find Mentors
            </span>

            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mt-3">
              <div>
                <h1 className="text-3xl sm:text-4xl font-black text-gray-900">
                  Expert Guidance
                </h1>

                <p className="text-gray-500 text-sm max-w-xl mt-2">
                  Discover students and builders who selected mentor guidance in their profile.
                  Match quality is based on your help-needed areas, interests, skills, and startup context.
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
              <p className="text-xs text-gray-500">Available mentor matches</p>
              <p className="text-2xl font-black text-gray-900">{totalMentors}</p>
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
                value={query}
                onChange={(event) =>
                  setFilters((prev) => ({
                    ...prev,
                    query: event.target.value,
                  }))
                }
                placeholder="Search by name, skill, university, idea…"
                className="flex-1 outline-none text-sm"
                aria-label="Search mentors"
              />

              {query && (
                <button
                  type="button"
                  onClick={() =>
                    setFilters((prev) => ({
                      ...prev,
                      query: '',
                    }))
                  }
                  className="p-1 hover:bg-gray-100 rounded"
                  aria-label="Clear search"
                >
                  <X className="w-4 text-gray-400" />
                </button>
              )}
            </div>

            <div className="grid md:grid-cols-5 gap-3 mt-4">
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">
                  Match band
                </label>

                <select
                  value={matchBand}
                  onChange={(event) =>
                    setFilters((prev) => ({
                      ...prev,
                      matchBand: event.target.value,
                    }))
                  }
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm"
                >
                  <option value="all">All matches</option>
                  <option value="60plus">60%+</option>
                  <option value="below60">Below 60%</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">
                  Skill
                </label>

                <select
                  value={skill}
                  onChange={(event) =>
                    setFilters((prev) => ({
                      ...prev,
                      skill: event.target.value,
                    }))
                  }
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm"
                >
                  {allSkills.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">
                  Location
                </label>

                <select
                  value={location}
                  onChange={(event) =>
                    setFilters((prev) => ({
                      ...prev,
                      location: event.target.value,
                    }))
                  }
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm"
                >
                  {allLocations.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>

              <label className="flex items-end gap-2 text-sm pb-2">
                <input
                  type="checkbox"
                  checked={proBono}
                  onChange={(event) =>
                    setFilters((prev) => ({
                      ...prev,
                      proBono: event.target.checked,
                    }))
                  }
                  className="rounded"
                />
                Pro-bono only
              </label>

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
              Showing{' '}
              <span className="font-bold text-gray-900">{filtered.length}</span>{' '}
              results
            </p>

            <p className="text-xs text-gray-400">
              Message unlocks after accepted connection.
            </p>
          </div>

          {filtered.length > 0 ? (
            <div className="grid lg:grid-cols-2 gap-4" aria-live="polite">
              {filtered.map((mentor) => {
                const id = getPersonId(mentor);

                return (
                  <MentorCard
                    key={id || mentor.id}
                    mentor={mentor}
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

              <p className="font-bold text-gray-800">
                No mentor matches found.
              </p>

              <p className="text-sm text-gray-500 mt-1">
                Try changing filters or ask users to select Mentor in their profile.
              </p>

              <button
                type="button"
                onClick={resetFilters}
                className="mt-4 px-4 py-2 g-brand text-black rounded-xl text-sm font-black"
              >
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
              Add help-needed areas, skills, interests, and startup idea context to get better mentor matches.
            </p>

            <Link
              to="/profile"
              className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 mt-3 hover:underline"
            >
              Edit Profile <ArrowRight className="w-3" />
            </Link>
          </aside>
        </div>
      </div>
    </>
  );
}
