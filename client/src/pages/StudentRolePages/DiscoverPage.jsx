// src/pages/DiscoverPage.jsx
import React, { useState, useEffect, useCallback, memo, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../auth/AuthContext';
import { backendApi } from '../../lib/backendApi';
import {
  Search,
  Globe,
  Users,
  ArrowUpRight,
  Zap,
  Clock,
  MapPin,
  Lightbulb,
  X,
  Loader,
  UserPlus,
  MessageSquare,
  GraduationCap,
  Rocket,
  Gift,
  Building,
  Tag,
  Info,
  CheckCircle,
  Sparkles,
  ShieldCheck,
  Briefcase,
} from 'lucide-react';
import toast from 'react-hot-toast';

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

  .g-brand { background: linear-gradient(135deg, var(--primary), var(--primary-dark)); }
  .g-sec { background: linear-gradient(135deg, var(--secondary), var(--secondary-light)); }

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

  .tab { transition: all .15s ease; }
  .tab.active { background: var(--secondary); color: var(--white); }
  .tab.inactive { background: var(--white); color: #4B5563; border: 1.5px solid var(--gray-200); }
  .tab.inactive:hover { border-color: var(--primary); color: var(--secondary); }

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

  .tooltip-wrap { position: relative; display: inline-block; }

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
    max-width: 280px;
    white-space: normal;
    text-align: left;
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
  if (!path || path.startsWith('http')) return path || null;

  const cleanPath = path.replace(/^avatars\//, '').replace(/^\/+/, '');
  const key = `av:${cleanPath}`;
  const cached = AVATAR_CACHE.get(key);

  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.url;
  }

  try {
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

const normalizeSkill = (skill) => {
  if (!skill) return '';
  if (typeof skill === 'string') return skill;
  return skill.skill || skill.name || skill.title || '';
};

const normalizeLower = (value) => String(value || '').toLowerCase().trim();

const hasLookingFor = (item, option) => {
  const values = item?.looking_for || item?.student_profile?.looking_for || item?.student_profiles?.looking_for || [];

  if (Array.isArray(values)) {
    return values.includes(option);
  }

  return String(values || '').toLowerCase().includes(option.toLowerCase());
};

const getNestedProfile = (item) => {
  if (!item) return {};
  if (Array.isArray(item.profiles)) return item.profiles[0] || {};
  return item.profiles || item.profile || item.user || {};
};

const getPersonId = (item) => {
  const nested = getNestedProfile(item);
  return item?.profile_id || item?.user_id || item?.target_user_id || nested?.id || item?.id;
};

const normalizeProfile = (item) => {
  const nested = getNestedProfile(item);
  const id = getPersonId(item);

  return {
    ...nested,
    id,
    full_name:
      item?.full_name ||
      item?.name ||
      item?.profile_name ||
      item?.display_name ||
      nested?.full_name ||
      nested?.name ||
      'Student Founder',
    avatar_url:
      item?.avatar_url ||
      item?.profile_avatar_url ||
      nested?.avatar_url ||
      null,
    location:
      item?.location ||
      item?.profile_location ||
      nested?.location ||
      '',
    bio:
      item?.bio ||
      item?.profile_bio ||
      nested?.bio ||
      '',
    user_type:
      item?.user_type ||
      nested?.user_type ||
      'student',
  };
};

const timeLeft = (deadline) => {
  if (!deadline) return null;

  const diff = Math.ceil((new Date(deadline) - Date.now()) / 86400000);

  if (diff < 0) return { label: 'Closed', cls: 'text-gray-400' };
  if (diff === 0) return { label: 'Today!', cls: 'text-red-600 font-bold' };
  if (diff <= 7) return { label: `${diff}d left`, cls: 'text-orange-500 font-semibold' };
  return { label: `${diff}d left`, cls: 'text-gray-500' };
};

const oppBadge = (type) => {
  const map = {
    internship: 'bg-blue-50 text-blue-700',
    event: 'bg-purple-50 text-purple-700',
    funding: 'bg-green-50 text-green-700',
    hackathon: 'bg-orange-50 text-orange-700',
    accelerator: 'bg-indigo-50 text-indigo-700',
    grant: 'bg-emerald-50 text-emerald-700',
  };

  return map[type] || 'bg-gray-50 text-gray-700';
};

const OPP_ICONS = {
  internship: GraduationCap,
  event: Rocket,
  workshop: Briefcase,
  funding: Gift,
  hackathon: Zap,
  accelerator: Rocket,
  grant: Gift,
  competition: Zap,
  bootcamp: GraduationCap,
};

const OPPORTUNITY_TYPES = ['All', 'internship', 'event', 'workshop', 'hackathon', 'bootcamp', 'competition', 'accelerator', 'grant'];
const OPPORTUNITY_CITIES = ['All', 'Karachi', 'Lahore', 'Islamabad', 'Remote', 'Global'];
const OPPORTUNITY_AREAS = ['All', 'Gulshan', 'DHA', 'Clifton', 'PECHS', 'Shahrah-e-Faisal', 'North Nazimabad', 'Remote'];
const OPPORTUNITY_DOMAINS = ['All', 'AI', 'Web Dev', 'Mobile App', 'Cybersecurity', 'Data Science', 'Cloud', 'Startup', 'Product'];
const OPPORTUNITY_INDUSTRIES = ['All', 'SaaS', 'FinTech', 'EdTech', 'HealthTech', 'E-commerce', 'AI / ML', 'Social Impact'];
const OPPORTUNITY_MODES = ['All', 'online', 'offline', 'hybrid'];

const DEFAULT_OPPORTUNITIES = [
  {
    id: 'sample-hackathon',
    title: 'Startup Weekend / Hackathon',
    type: 'hackathon',
    organiser: 'ScaleScope Curated',
    description: 'Find teammates, validate a problem, and build a working prototype with other students.',
    deadline: null,
    link: '',
    city: 'Karachi',
    area: 'Remote',
    domain: 'Startup',
    industry: 'SaaS',
    mode: 'hybrid',
    tags: ['tech', 'startup'],
    is_active: true,
    is_featured: true,
  },
  {
    id: 'sample-internship',
    title: 'Startup Internship Opportunities',
    type: 'internship',
    organiser: 'Startup Ecosystem',
    description: 'Explore startup internships where students can learn product, growth, design, or engineering.',
    deadline: null,
    link: '',
    city: 'Karachi',
    area: 'All',
    domain: 'Web Dev',
    industry: 'SaaS',
    mode: 'offline',
    tags: ['tech', 'internship'],
    is_active: true,
    is_featured: false,
  },
  {
    id: 'sample-funding',
    title: 'Student Founder Micro-Grant',
    type: 'funding',
    organiser: 'Coming Soon',
    description: 'Funding and grant opportunities will appear here once added by admins or ecosystem partners.',
    deadline: null,
    link: '',
    is_active: true,
    is_featured: false,
  },
];

function computeDiscoverMatch(currentProfile, candidate, type) {
  let score = 0;
  const reasons = [];

  const currentSkills = new Set(
    (currentProfile.skills_with_levels || [])
      .map(normalizeSkill)
      .filter(Boolean)
      .map(normalizeLower)
  );

  const candidateSkills = new Set(
    (candidate.skills_with_levels || [])
      .map(normalizeSkill)
      .filter(Boolean)
      .map(normalizeLower)
  );

  const currentHelpNeeded = new Set(
    (currentProfile.help_needed || [])
      .filter(Boolean)
      .map(normalizeLower)
  );

  const currentInterests = new Set(
    (currentProfile.interests || [])
      .filter(Boolean)
      .map(normalizeLower)
  );

  const candidateInterests = new Set(
    (candidate.interests || [])
      .filter(Boolean)
      .map(normalizeLower)
  );

  const needMatches = [...candidateSkills].filter((skill) =>
    [...currentHelpNeeded].some((need) => {
      return need.includes(skill) || skill.includes(need) || need.split(' ').some((word) => word && skill.includes(word));
    })
  );

  if (needMatches.length > 0) {
    score += Math.min(25, needMatches.length * 10);
    reasons.push(`Matches your needs: ${needMatches.slice(0, 2).join(', ')}`);
  }

  const complementarySkills = [...candidateSkills].filter((skill) => !currentSkills.has(skill));

  if (complementarySkills.length > 0) {
    score += Math.min(type === 'mentor' ? 15 : 20, complementarySkills.length * 5);
    reasons.push(
      type === 'mentor'
        ? `Relevant expertise: ${complementarySkills.slice(0, 2).join(', ')}`
        : `Complementary skills: ${complementarySkills.slice(0, 2).join(', ')}`
    );
  }

  if (
    currentProfile.commitment_level &&
    candidate.commitment_level &&
    currentProfile.commitment_level === candidate.commitment_level
  ) {
    score += type === 'mentor' ? 8 : 15;
    reasons.push(`Same commitment level: ${candidate.commitment_level}`);
  }

  if (
    currentProfile.idea_domain &&
    candidate.idea_domain &&
    currentProfile.idea_domain === candidate.idea_domain
  ) {
    score += 15;
    reasons.push(`Same domain: ${candidate.idea_domain}`);
  } else {
    const sharedInterests = [...currentInterests].filter((interest) => candidateInterests.has(interest));
    if (sharedInterests.length > 0) {
      score += Math.min(10, sharedInterests.length * 5);
      reasons.push(`Shared interests: ${sharedInterests.slice(0, 2).join(', ')}`);
    }
  }

  if (currentProfile.has_startup_idea && candidate.has_startup_idea) {
    score += type === 'mentor' ? 8 : 10;
    reasons.push('Both are startup-active');
  }

  if (
    currentProfile.university &&
    candidate.university &&
    normalizeLower(currentProfile.university) === normalizeLower(candidate.university)
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

  const minimum = type === 'startup' ? 15 : 10;

  return {
    score: Math.max(minimum, Math.min(100, Math.round(score))),
    reasons: reasons.length ? reasons.slice(0, 3) : ['Basic profile compatibility'],
  };
}

function computeInvestorDiscoverMatch(currentProfile, investor) {
  let score = 20;
  const reasons = [];
  const industries = investor.preferred_industries || investor.industries_of_interest || [];
  const stages = investor.preferred_stages || investor.investment_stage || [];
  const currentIndustry = normalizeLower(currentProfile.idea_domain || currentProfile.industry);
  const currentStage = normalizeLower(currentProfile.idea_stage || currentProfile.startup_stage);

  if (currentIndustry && industries.some((item) => normalizeLower(item).includes(currentIndustry) || currentIndustry.includes(normalizeLower(item)))) {
    score += 35;
    reasons.push('Invests in your industry');
  }
  if (currentStage && stages.some((item) => normalizeLower(item) === currentStage)) {
    score += 25;
    reasons.push('Targets your startup stage');
  }
  if (investor.accepting_pitches) {
    score += 10;
    reasons.push('Currently accepting pitches');
  }
  if (investor.is_verified) {
    score += 10;
    reasons.push('Verified investor profile');
  }

  return {
    score: Math.min(100, score),
    reasons: reasons.length ? reasons.slice(0, 3) : ['Investment profile available for exploration'],
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

const PeopleCard = memo(function PeopleCard({ person, onConnect, onMessage, connectionStatus, connecting }) {
  const isMentor = person._type === 'mentor';
  const isFounder = person._type === 'founder';
  const isConnected = connectionStatus === 'accepted';
  const isPending = connectionStatus === 'pending' || connectionStatus === 'sent';
  const busy = connecting === true;

  return (
    <article className="bg-white rounded-2xl p-5 border border-gray-100 lift">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="hidden sm:block w-1 rounded-full self-stretch g-brand" aria-hidden="true" />

        <Avatar name={person.name} path={person.avatar} grad={gradFor(person.user_id)} size="xl" />

        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
            <div>
              <p className="font-bold text-gray-900 truncate">{person.name}</p>
              <p className="text-xs text-gray-500">
                {person.role}
                {person.org ? ` · ${person.org}` : ''}
                {person.university ? ` · ${person.university}` : ''}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span
                className={`text-xs font-bold px-2.5 py-1 rounded-full ${isMentor ? 'bg-indigo-50 text-indigo-700' : 'bg-purple-50 text-purple-700'
                  }`}
              >
                {isMentor ? 'Mentor Match' : isFounder ? 'Founder Match' : 'Co-Founder Match'}
              </span>

              {/* <span className="text-xs font-black px-2.5 py-1 rounded-full bg-[#98DE38]/20 text-[#1B2D7F]">
                {person.matchScore}% Match
              </span> */}
            </div>
          </div>

          {person.location && (
            <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
              <MapPin className="w-3" />
              {person.location}
            </p>
          )}

          {person.bio && <p className="text-sm text-gray-600 mt-2 line-clamp-2">{person.bio}</p>}

          {person.skills?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {person.skills.slice(0, 4).map((skill, index) => (
                <span
                  key={`${skill}-${index}`}
                  className={`text-xs px-2 py-0.5 rounded-full ${isMentor ? 'bg-indigo-50 text-indigo-700' : 'bg-purple-50 text-purple-700'
                    }`}
                >
                  {skill}
                </span>
              ))}
            </div>
          )}

          <div className="tooltip-wrap mt-3">
            <button
              type="button"
              className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
              aria-label="Why recommended?"
            >
              <Info className="w-3" /> Why this match?
            </button>

            <div className="tooltip-box">
              <p className="font-semibold mb-1">Match Reasons:</p>
              <ul className="list-disc list-inside text-xs space-y-1">
                {(person.reasons || ['Profile alignment']).map((reason, index) => (
                  <li key={`${reason}-${index}`}>{reason}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-4">
            <Link
              to={`/user-profile/${person.user_id}`}
              className="py-2 border-2 border-indigo-100 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-bold hover:bg-indigo-100 transition flex items-center justify-center"
            >
              View Profile
            </Link>

            <button
              type="button"
              onClick={() => {
                if (isConnected) onMessage(person.user_id);
              }}
              disabled={!isConnected}
              title={isConnected ? 'Message this connection' : 'Connect first to send messages'}
              className={`py-2 border-2 rounded-xl text-xs font-bold transition flex items-center justify-center ${isConnected
                  ? 'border-gray-200 hover:border-gray-300 text-gray-800 bg-white'
                  : 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed'
                }`}
            >
              <MessageSquare className="w-3.5 mr-1" />
              {isConnected ? 'Message' : 'Connect first'}
            </button>

            {isConnected ? (
              <button
                type="button"
                disabled
                className="py-2 bg-green-50 border border-green-200 text-green-700 rounded-xl text-xs font-bold flex items-center justify-center"
              >
                <CheckCircle className="w-3.5 mr-1" /> Connected
              </button>
            ) : isPending ? (
              <button
                type="button"
                disabled
                className="py-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl text-xs font-bold flex items-center justify-center"
              >
                <Clock className="w-3.5 mr-1" /> Pending
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onConnect(person)}
                disabled={busy}
                className="py-2 g-brand text-black rounded-xl text-xs font-black hover:opacity-90 transition flex items-center justify-center disabled:opacity-60"
              >
                {busy ? <Loader className="w-3.5 animate-spin mr-1" /> : <UserPlus className="w-3.5 mr-1" />}
                {busy ? 'Sending...' : isMentor ? 'Request' : 'Connect'}
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
});

const StartupCard = memo(function StartupCard({ startup }) {
  return (
    <article className="bg-white rounded-2xl p-5 border border-gray-100 lift">
      <div className="flex gap-4">
        <Avatar name={startup.founderName} path={startup.avatar} grad={gradFor(startup.user_id)} size="lg" />

        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start gap-3">
            <div>
              <p className="font-bold text-gray-900 truncate">{startup.idea_title || 'Startup Idea'}</p>
              <p className="text-xs text-gray-500">by {startup.founderName}</p>
            </div>

            {startup.idea_domain && (
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-green-50 text-green-700">
                {startup.idea_domain}
              </span>
            )}
          </div>

          {startup.description && <p className="text-sm text-gray-600 mt-2 line-clamp-2">{startup.description}</p>}

          <div className="flex flex-wrap gap-2 mt-3">
            {startup.idea_stage && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                {startup.idea_stage.replace('-', ' ')}
              </span>
            )}

            {startup.target_audience && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-gray-50 text-gray-700">
                For: {startup.target_audience}
              </span>
            )}
          </div>

          <div className="mt-4">
            <Link
              to={`/user-profile/${startup.user_id}`}
              className="inline-flex items-center gap-1 py-2 px-3 rounded-xl border border-indigo-100 bg-indigo-50 text-indigo-700 text-xs font-bold hover:bg-indigo-100"
            >
              View Founder Profile <ArrowUpRight className="w-3" />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
});

export default function DiscoverPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [state, setState] = useState({
    loading: true,
    error: null,
  });

  const [data, setData] = useState({
    profile: {},
    startups: [],
    people: [],
    opportunities: [],
    connections: [],
    prefs: null,
  });

  const [filters, setFilters] = useState({
    tab: 'people',
    role: 'All',
    oppType: 'All',
    oppCity: 'All',
    oppArea: 'All',
    oppDomain: 'All',
    oppIndustry: 'All',
    oppMode: 'All',
    query: '',
  });

  const [connecting, setConnecting] = useState({});
  const [connStatusMap, setConnStatusMap] = useState({});

  const load = useCallback(async () => {
    if (!user?.id) return;

    setState({
      loading: true,
      error: null,
    });

    try {
      const [profileRes, studentRes, founderRes, studentsRes, foundersRes, mentorsRes, investorsRes, connectionsRes, prefsRes] = await Promise.allSettled([
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
            idea_stage,
            target_audience,
            unique_value_prop,
            profile_completion
          `)
          .eq('user_id', user.id)
          .maybeSingle(),

        supabase
          .from('founder_profiles')
          .select(`
            user_id,
            company_name,
            idea_title,
            industry,
            startup_stage,
            commitment_level,
            help_needed,
            looking_for,
            founder_skills,
            skills_needed,
            profile_completion
          `)
          .eq('user_id', user.id)
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
            idea_stage,
            target_audience,
            unique_value_prop,
            profile_completion,
            updated_at,
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
          .limit(100),

        supabase
          .from('founder_profiles')
          .select(`
            id,
            user_id,
            company_name,
            idea_title,
            industry,
            startup_stage,
            solution_description,
            unique_value_proposition,
            target_audience,
            looking_for,
            help_needed,
            commitment_level,
            founder_skills,
            profile_completion,
            profiles!founder_profiles_user_id_fkey(
              id,
              full_name,
              avatar_url,
              location,
              bio,
              user_type
            )
          `)
          .neq('user_id', user.id)
          .limit(100),

        supabase
          .from('mentor_profiles')
          .select(`
            *,
            profiles!mentor_profiles_user_id_fkey(
              id, full_name, avatar_url, location, bio, user_type
            )
          `)
          .eq('is_public', true)
          .eq('is_active', true)
          .neq('user_id', user.id)
          .limit(100),

        supabase
          .from('investor_profiles')
          .select(`
            *,
            profiles!investor_profiles_user_id_fkey(
              id, full_name, avatar_url, location, bio, user_type
            )
          `)
          .eq('is_public', true)
          .eq('is_active', true)
          .neq('user_id', user.id)
          .limit(100),

        backendApi.getMyConnections(),

        supabase
          .from('matching_preferences')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle(),
      ]);

      const currentFounder = founderRes.status === 'fulfilled' ? founderRes.value.data || {} : {};
      const profile = {
        ...(profileRes.status === 'fulfilled' ? profileRes.value.data || {} : {}),
        ...(studentRes.status === 'fulfilled' ? studentRes.value.data || {} : {}),
        ...(currentFounder.user_id ? {
          idea_domain: currentFounder.industry,
          idea_stage: currentFounder.startup_stage,
          commitment_level: currentFounder.commitment_level,
          help_needed: currentFounder.help_needed || [],
          looking_for: currentFounder.looking_for || [],
          skills_with_levels: (currentFounder.founder_skills || []).map((skill) => ({ skill })),
          interests: [currentFounder.industry].filter(Boolean),
          has_startup_idea: true,
        } : {}),
      };

      const rawStudents = studentsRes.status === 'fulfilled' ? studentsRes.value.data || [] : [];
      const rawFounders = foundersRes.status === 'fulfilled' ? foundersRes.value.data || [] : [];
      const rawMentors = mentorsRes.status === 'fulfilled' ? mentorsRes.value.data || [] : [];
      const rawInvestors = investorsRes.status === 'fulfilled' ? investorsRes.value.data || [] : [];

      const connections =
        connectionsRes.status === 'fulfilled'
          ? connectionsRes.value?.data || []
          : [];

      const statusMap = {};

      connections.forEach((connection) => {
        const otherId = connection?.otherUser?.id;
        if (otherId) statusMap[otherId] = 'accepted';
      });

      const people = [];
      const startups = [];

      rawStudents.forEach((student) => {
        const p = normalizeProfile(student);
        const skills = (student.skills_with_levels || [])
          .map(normalizeSkill)
          .filter(Boolean);

        if (student.has_startup_idea) {
          startups.push({
            user_id: student.user_id,
            founderName: p.full_name,
            avatar: p.avatar_url,
            location: p.location,
            idea_title: student.idea_title,
            idea_domain: student.idea_domain,
            idea_stage: student.idea_stage,
            target_audience: student.target_audience,
            description: student.startup_idea_description,
            unique_value_prop: student.unique_value_prop,
          });
        }

        if (hasLookingFor(student, 'Co-Founder')) {
          const match = computeDiscoverMatch(profile, student, 'cofounder');

          people.push({
            _type: 'cofounder',
            id: `cofounder-${student.user_id}`,
            user_id: student.user_id,
            name: p.full_name,
            avatar: p.avatar_url,
            location: p.location,
            bio: student.startup_idea_description || p.bio,
            role: 'Co-Founder',
            org: student.university,
            university: student.university,
            skills: skills.slice(0, 5),
            commitment: student.commitment_level,
            has_idea: student.has_startup_idea,
            matchScore: match.score,
            reasons: match.reasons,
          });
        }

      });

      rawFounders.forEach((founder) => {
        const p = normalizeProfile(founder);
        const founderMatchShape = {
          ...founder,
          idea_domain: founder.industry,
          idea_stage: founder.startup_stage,
          has_startup_idea: true,
          startup_idea_description: founder.solution_description,
          skills_with_levels: (founder.founder_skills || []).map((skill) => ({ skill })),
          interests: [founder.industry].filter(Boolean),
        };
        const skills = (founder.founder_skills || []).filter(Boolean);

        if (founder.idea_title || founder.company_name) {
          startups.push({
            user_id: founder.user_id,
            founderName: p.full_name,
            avatar: p.avatar_url,
            location: p.location,
            idea_title: founder.idea_title || founder.company_name,
            idea_domain: founder.industry,
            idea_stage: founder.startup_stage,
            target_audience: founder.target_audience,
            description: founder.solution_description,
            unique_value_prop: founder.unique_value_proposition,
          });
        }

        if (hasLookingFor(founder, 'Co-Founder')) {
          const match = computeDiscoverMatch(profile, founderMatchShape, 'cofounder');

          people.push({
            _type: 'founder',
            id: `founder-${founder.user_id}`,
            user_id: founder.user_id,
            name: p.full_name,
            avatar: p.avatar_url,
            location: p.location,
            bio: p.bio || founder.solution_description || founder.idea_title,
            role: 'Founder',
            org: founder.company_name,
            skills: skills.slice(0, 5),
            commitment: founder.commitment_level,
            has_idea: true,
            matchScore: match.score,
            reasons: match.reasons,
          });
        }
      });

      rawMentors.forEach((mentor) => {
        const p = normalizeProfile(mentor);
        const expertise = mentor.expertise_areas || [];
        const match = computeDiscoverMatch(profile, {
          ...mentor,
          skills_with_levels: expertise.map((skill) => ({ skill })),
          interests: mentor.industries_supported || [],
          commitment_level: mentor.availability_hours || mentor.mentorship_mode,
        }, 'mentor');

        people.push({
          _type: 'mentor',
          id: `professional-mentor-${mentor.user_id}`,
          user_id: mentor.user_id,
          name: p.full_name,
          avatar: p.avatar_url,
          location: p.location,
          bio: p.bio || mentor.mentorship_style || mentor.success_stories,
          role: 'Mentor',
          org: [mentor.current_role, mentor.current_company].filter(Boolean).join(' at '),
          skills: expertise.slice(0, 5),
          commitment: mentor.availability_hours || mentor.mentorship_mode,
          matchScore: match.score,
          reasons: match.reasons,
        });
      });

      rawInvestors.forEach((investor) => {
        const p = normalizeProfile(investor);
        const industries = investor.preferred_industries || investor.industries_of_interest || [];
        const match = computeInvestorDiscoverMatch(profile, investor);

        people.push({
          _type: 'investor',
          id: `investor-${investor.user_id}`,
          user_id: investor.user_id,
          name: p.full_name,
          avatar: p.avatar_url,
          location: p.location || investor.geography_focus || investor.geographic_focus,
          bio: p.bio || investor.investment_thesis || investor.what_i_look_for,
          role: 'Investor',
          org: investor.fund_name || investor.firm_name || investor.investor_type,
          skills: industries.slice(0, 5),
          matchScore: match.score,
          reasons: match.reasons,
        });
      });

      let opportunities = [];

      try {
        const response = await backendApi.getOpportunities({ limit: 80 });
        opportunities = response.data || [];
      } catch (apiErr) {
        console.warn('Backend opportunities unavailable, using Supabase fallback:', apiErr?.message || apiErr);

        try {
          const today = new Date().toISOString().split('T')[0];
          const { data: oppData, error: oppError } = await supabase
            .from('opportunities')
            .select('*')
            .eq('is_active', true)
            .or(`deadline.is.null,deadline.gte.${today}`)
            .order('is_featured', { ascending: false })
            .order('deadline', { ascending: true, nullsFirst: false })
            .limit(80);

          if (oppError) throw oppError;
          opportunities = oppData || [];
        } catch (oppErr) {
          console.warn('Opportunities table unavailable or empty:', oppErr?.message || oppErr);
          opportunities = DEFAULT_OPPORTUNITIES;
        }
      }

      setConnStatusMap(statusMap);

      setData({
        profile,
        startups: startups.sort((a, b) => String(b.idea_title || '').localeCompare(String(a.idea_title || ''))),
        people: people.sort((a, b) => b.matchScore - a.matchScore),
        opportunities,
        connections,
        prefs: prefsRes.status === 'fulfilled' ? prefsRes.value.data || null : null,
      });

      setState({
        loading: false,
        error: null,
      });
    } catch (err) {
      console.error('Discover load failed:', err);
      setState({
        loading: false,
        error: err.message || 'Failed to load discover page',
      });
      toast.error('Could not load discover page');
    }
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredPeople = useMemo(() => {
    const { query, role } = filters;
    const q = query.toLowerCase();

    return data.people.filter((person) => {
      const matchQuery =
        !query ||
        person.name?.toLowerCase().includes(q) ||
        person.bio?.toLowerCase().includes(q) ||
        person.university?.toLowerCase().includes(q) ||
        person.skills?.some((skill) => skill?.toLowerCase().includes(q));

      const matchRole =
        role === 'All' ||
        (role === 'Mentor' && person._type === 'mentor') ||
        (role === 'Co-Founder' && person._type === 'cofounder') ||
        (role === 'Founder' && person._type === 'founder') ||
        (role === 'Investor' && person._type === 'investor');

      return matchQuery && matchRole;
    });
  }, [data.people, filters]);

  const filteredStartups = useMemo(() => {
    const q = filters.query.toLowerCase();

    return data.startups.filter((startup) => {
      return (
        !filters.query ||
        startup.idea_title?.toLowerCase().includes(q) ||
        startup.description?.toLowerCase().includes(q) ||
        startup.idea_domain?.toLowerCase().includes(q) ||
        startup.founderName?.toLowerCase().includes(q)
      );
    });
  }, [data.startups, filters.query]);

  const filteredOpps = useMemo(() => {
    const { query, oppType, oppCity, oppArea, oppDomain, oppIndustry, oppMode } = filters;
    const q = query.toLowerCase();

    return data.opportunities.filter((opp) => {
      const haystack = [
        opp.title,
        opp.description,
        opp.organiser,
        opp.organization,
        opp.location,
        opp.city,
        opp.area,
        opp.domain,
        opp.industry,
        opp.mode,
        ...(Array.isArray(opp.tags) ? opp.tags : []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      const matchQuery =
        !query ||
        haystack.includes(q);

      const matchType = oppType === 'All' || opp.type === oppType;
      const matchCity = oppCity === 'All' || normalizeLower(opp.city || opp.location).includes(normalizeLower(oppCity));
      const matchArea = oppArea === 'All' || normalizeLower(opp.area || opp.location).includes(normalizeLower(oppArea));
      const matchDomain = oppDomain === 'All' || normalizeLower(opp.domain || opp.tags?.join(' ')).includes(normalizeLower(oppDomain));
      const matchIndustry = oppIndustry === 'All' || normalizeLower(opp.industry || opp.tags?.join(' ')).includes(normalizeLower(oppIndustry));
      const matchMode = oppMode === 'All' || normalizeLower(opp.mode || '').includes(normalizeLower(oppMode));

      return matchQuery && matchType && matchCity && matchArea && matchDomain && matchIndustry && matchMode;
    });
  }, [data.opportunities, filters]);

  const handleConnect = async (person) => {
    const targetUserId = person.user_id;
    if (!targetUserId || connecting[targetUserId]) return;

    setConnecting((prev) => ({
      ...prev,
      [targetUserId]: true,
    }));

    try {
      const type = person._type === 'mentor'
        ? 'mentor_request'
        : person._type === 'investor'
          ? 'investor_contact'
          : 'cofounder_request';

      const response = await backendApi.sendConnect(
        targetUserId,
        `Hi ${person.name || 'there'}, I found your profile on Discover and would like to connect.`,
        type
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

      toast.success(response.alreadyPending ? 'Request already pending' : 'Request sent!', {
        style: { background: '#98DE38', color: '#000' },
      });
    } catch (err) {
      console.error('Discover connect failed:', err);
      toast.error(err.message || 'Failed to send request');
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
      console.error('Open conversation failed:', err);
      toast.error('Could not open conversation');
    }
  };

  const resetFilters = () => {
    setFilters({
      tab: 'people',
      role: 'All',
      oppType: 'All',
      oppCity: 'All',
      oppArea: 'All',
      oppDomain: 'All',
      oppIndustry: 'All',
      oppMode: 'All',
      query: '',
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
          <p className="font-bold text-red-600 mb-2">Could not load Discover</p>
          <p className="text-sm text-gray-500 mb-4">{state.error}</p>
          <button type="button" onClick={load} className="px-4 py-2 g-brand text-black rounded-xl text-sm font-bold">
            Try again
          </button>
        </div>
      </div>
    );
  }

  const { people, opportunities, startups } = data;
  const { tab, role, oppType, oppCity, oppArea, oppDomain, oppIndustry, oppMode, query } = filters;

  return (
    <>
      <style>{CSS}</style>

      <div className="min-h-screen page-bg pt-20 pb-16 px-4">
        <div className="max-w-7xl mx-auto">
          <header className="mb-8">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase px-3 py-1 rounded-full bg-green-50 text-green-700 border border-green-200">
              <Globe className="w-3.5" /> Discover
            </span>

            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mt-3">
              <div>
                <h1 className="text-3xl sm:text-4xl font-black text-gray-900">
                  Explore the Ecosystem
                </h1>
                <p className="text-gray-500 text-sm max-w-xl mt-2">
                  Discover students, co-founders, mentor-seekers, startup ideas, and opportunities in one trusted feed.
                </p>
              </div>

              <Link
                to="/profile"
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-bold text-gray-700 hover:bg-gray-50"
              >
                Improve Discoverability <ArrowUpRight className="w-4" />
              </Link>
            </div>
          </header>

          <section className="grid sm:grid-cols-4 gap-3 mb-6">
            <div className="bg-white rounded-2xl p-4 border border-gray-100">
              <p className="text-xs text-gray-500">People</p>
              <p className="text-2xl font-black text-gray-900">{people.length}</p>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-gray-100">
              <p className="text-xs text-gray-500">Startup Ideas</p>
              <p className="text-2xl font-black text-gray-900">{startups.length}</p>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-gray-100">
              <p className="text-xs text-gray-500">Opportunities</p>
              <p className="text-2xl font-black text-gray-900">{opportunities.length}</p>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-gray-100">
              <p className="text-xs text-gray-500">Strong Matches</p>
              <p className="text-2xl font-black text-gray-900">
                {people.filter((person) => person.matchScore >= 60).length}
              </p>
            </div>
          </section>

          <div className="flex items-center bg-white border border-gray-200 rounded-2xl px-4 py-3 mb-6">
            <Search className="w-5 text-gray-400 mr-2" />

            <input
              type="text"
              value={query}
              onChange={(event) => setFilters((prev) => ({ ...prev, query: event.target.value }))}
              placeholder="Search people, ideas, skills, opportunities..."
              className="flex-1 outline-none text-sm"
              aria-label="Search discover"
            />

            {query && (
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

          <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
            {[
              { key: 'people', label: 'People', icon: Users, count: filteredPeople.length },
              { key: 'startups', label: 'Startup Ideas', icon: Lightbulb, count: filteredStartups.length },
              { key: 'opportunities', label: 'Opportunities', icon: Gift, count: filteredOpps.length },
            ].map((item) => {
              const Icon = item.icon;

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setFilters((prev) => ({ ...prev, tab: item.key }))}
                  className={`tab px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap flex items-center gap-2 ${tab === item.key ? 'active' : 'inactive'
                    }`}
                  aria-pressed={tab === item.key}
                >
                  <Icon className="w-4" />
                  {item.label}
                  <span className={`text-xs px-2 py-0.5 rounded-full ${tab === item.key ? 'bg-white/20' : 'bg-gray-100'}`}>
                    {item.count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <main className="lg:col-span-2 space-y-6">
              {tab === 'people' && (
                <section>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                    <div>
                      <h2 className="font-bold text-gray-900">People to Explore</h2>
                      <p className="text-xs text-gray-400">Message unlocks after accepted connection.</p>
                    </div>

                    <div className="flex gap-2">
                      {['All', 'Mentor', 'Co-Founder', 'Founder', 'Investor'].map((item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => setFilters((prev) => ({ ...prev, role: item }))}
                          className={`text-xs font-semibold px-3 py-1.5 rounded-xl ${role === item ? 'g-brand text-black' : 'bg-white border border-gray-200 text-gray-600'
                            }`}
                        >
                          {item}
                        </button>
                      ))}
                    </div>
                  </div>

                  {filteredPeople.length > 0 ? (
                    <div className="space-y-4" aria-live="polite">
                      {filteredPeople.slice(0, 12).map((person) => (
                        <PeopleCard
                          key={person.id}
                          person={person}
                          onConnect={handleConnect}
                          onMessage={handleMessage}
                          connectionStatus={connStatusMap[person.user_id]}
                          connecting={connecting[person.user_id]}
                        />
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      title="No people match your filters."
                      description="Try searching different skills or clearing the role filter."
                      onReset={resetFilters}
                    />
                  )}
                </section>
              )}

              {tab === 'startups' && (
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="font-bold text-gray-900">Startup Ideas</h2>
                      <p className="text-xs text-gray-400">Explore student ideas before connecting.</p>
                    </div>
                  </div>

                  {filteredStartups.length > 0 ? (
                    <div className="space-y-4" aria-live="polite">
                      {filteredStartups.slice(0, 12).map((startup) => (
                        <StartupCard key={`${startup.user_id}-${startup.idea_title}`} startup={startup} />
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      title="No startup ideas found."
                      description="Students with startup ideas will appear here when they complete their profiles."
                      onReset={resetFilters}
                    />
                  )}
                </section>
              )}

              {tab === 'opportunities' && (
                <section>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                    <div>
                      <h2 className="font-bold text-gray-900">Tech Opportunities</h2>
                      <p className="text-xs text-gray-400">Internships, tech events, workshops, hackathons, bootcamps, and startup programs.</p>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4">
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      <label className="space-y-1">
                        <span className="text-xs font-bold text-gray-500">Type</span>
                        <select value={oppType} onChange={(event) => setFilters((prev) => ({ ...prev, oppType: event.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white capitalize">
                          {OPPORTUNITY_TYPES.map((item) => <option key={item} value={item}>{item}</option>)}
                        </select>
                      </label>

                      <label className="space-y-1">
                        <span className="text-xs font-bold text-gray-500">City</span>
                        <select value={oppCity} onChange={(event) => setFilters((prev) => ({ ...prev, oppCity: event.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white">
                          {OPPORTUNITY_CITIES.map((item) => <option key={item} value={item}>{item}</option>)}
                        </select>
                      </label>

                      <label className="space-y-1">
                        <span className="text-xs font-bold text-gray-500">Area</span>
                        <select value={oppArea} onChange={(event) => setFilters((prev) => ({ ...prev, oppArea: event.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white">
                          {OPPORTUNITY_AREAS.map((item) => <option key={item} value={item}>{item}</option>)}
                        </select>
                      </label>

                      <label className="space-y-1">
                        <span className="text-xs font-bold text-gray-500">Domain</span>
                        <select value={oppDomain} onChange={(event) => setFilters((prev) => ({ ...prev, oppDomain: event.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white">
                          {OPPORTUNITY_DOMAINS.map((item) => <option key={item} value={item}>{item}</option>)}
                        </select>
                      </label>

                      <label className="space-y-1">
                        <span className="text-xs font-bold text-gray-500">Industry</span>
                        <select value={oppIndustry} onChange={(event) => setFilters((prev) => ({ ...prev, oppIndustry: event.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white">
                          {OPPORTUNITY_INDUSTRIES.map((item) => <option key={item} value={item}>{item}</option>)}
                        </select>
                      </label>

                      <label className="space-y-1">
                        <span className="text-xs font-bold text-gray-500">Mode</span>
                        <select value={oppMode} onChange={(event) => setFilters((prev) => ({ ...prev, oppMode: event.target.value }))} className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white capitalize">
                          {OPPORTUNITY_MODES.map((item) => <option key={item} value={item}>{item}</option>)}
                        </select>
                      </label>
                    </div>
                  </div>

                  {filteredOpps.length > 0 ? (
                    <div className="space-y-4" aria-live="polite">
                      {filteredOpps.slice(0, 12).map((opp) => {
                        const tl = timeLeft(opp.deadline);
                        const Icon = OPP_ICONS[opp.type] || Gift;
                        const organiser = opp.organiser || opp.organization || 'ScaleScope';
                        const place = [opp.area, opp.city].filter(Boolean).join(', ') || opp.location;
                        const tags = [
                          opp.domain,
                          opp.industry,
                          opp.mode,
                          ...(Array.isArray(opp.tags) ? opp.tags.slice(0, 3) : []),
                        ].filter(Boolean);

                        return (
                          <article key={opp.id} className="bg-white rounded-2xl p-4 border border-gray-100 lift">
                            <div className="flex gap-4">
                              <div className="w-10 h-10 rounded-xl g-brand flex items-center justify-center text-black flex-shrink-0">
                                <Icon className="w-5" />
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex justify-between gap-3">
                                  <p className="font-semibold text-gray-900 truncate">{opp.title}</p>
                                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full capitalize ${oppBadge(opp.type)}`}>
                                    {opp.type || 'opportunity'}
                                  </span>
                                  {Number.isFinite(Number(opp.recommendation_score)) && (
                                    <span className="text-xs font-black px-2 py-0.5 rounded-full bg-[#98DE38]/20 text-[#1B2D7F]">
                                      {Math.round(opp.recommendation_score)}% fit
                                    </span>
                                  )}
                                </div>

                                {organiser && (
                                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                    <Building className="w-3" />
                                    {organiser}
                                  </p>
                                )}

                                {opp.description && <p className="text-sm text-gray-600 mt-2 line-clamp-2">{opp.description}</p>}

                                <div className="flex flex-wrap items-center gap-3 mt-3 text-xs">
                                  {opp.deadline && (
                                    <span className="text-gray-500 flex items-center gap-1">
                                      <Clock className="w-3" />
                                      {new Date(opp.deadline).toLocaleDateString()}
                                    </span>
                                  )}

                                  {tl && <span className={`font-semibold ${tl.cls}`}>{tl.label}</span>}

                                  {place && (
                                    <span className="text-gray-500 flex items-center gap-1">
                                      <MapPin className="w-3" />
                                      {place}
                                    </span>
                                  )}

                                  {opp.link ? (
                                    <a
                                      href={opp.link}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="ml-auto g-brand text-black text-xs font-bold px-3 py-1.5 rounded-lg hover:opacity-90"
                                    >
                                      Apply <ArrowUpRight className="w-3 inline" />
                                    </a>
                                  ) : (
                                    <span className="ml-auto text-xs text-gray-400 font-semibold">Coming soon</span>
                                  )}
                                </div>

                                {tags.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5 mt-3">
                                    {[...new Set(tags)].slice(0, 5).map((tag) => (
                                      <span key={`${opp.id}-${tag}`} className="text-xs px-2 py-0.5 rounded-full bg-gray-50 text-gray-600 border border-gray-100 capitalize">
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                )}

                                {Array.isArray(opp.recommendation_reasons) && opp.recommendation_reasons.length > 0 && (
                                  <p className="text-xs text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-2 mt-3">
                                    {opp.recommendation_reasons.join(' · ')}
                                  </p>
                                )}
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  ) : (
                    <EmptyState
                      title="No opportunities match your filters."
                      description="Try a different opportunity type or clear your search."
                      onReset={resetFilters}
                    />
                  )}
                </section>
              )}
            </main>

            <aside className="space-y-6">
              <div className="bg-white rounded-2xl p-5 border border-gray-100">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Sparkles className="w-4 text-[#1B2D7F]" /> Strong People Matches
                </h3>

                {people.filter((person) => person.matchScore >= 60).slice(0, 4).length > 0 ? (
                  people
                    .filter((person) => person.matchScore >= 60)
                    .slice(0, 4)
                    .map((person) => (
                      <div key={`strong-${person.id}`} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                        <Avatar name={person.name} path={person.avatar} grad={gradFor(person.user_id)} size="md" />

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{person.name}</p>
                          <p className="text-xs text-gray-500 truncate">
                            {person._type === 'mentor' ? 'Mentor' : 'Co-Founder'} · {person.matchScore}%
                          </p>
                        </div>

                        <Link
                          to={`/user-profile/${person.user_id}`}
                          className="text-xs font-bold px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                        >
                          View
                        </Link>
                      </div>
                    ))
                ) : (
                  <p className="text-sm text-gray-500">Complete your profile to get stronger matches.</p>
                )}
              </div>

              <div className="bg-white rounded-2xl p-5 border border-gray-100">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Clock className="w-4 text-orange-500" /> Closing Soon
                </h3>

                {opportunities
                  .filter((opp) => opp.deadline && new Date(opp.deadline) > new Date())
                  .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
                  .slice(0, 4)
                  .map((opp) => {
                    const tl = timeLeft(opp.deadline);
                    const Icon = OPP_ICONS[opp.type] || Gift;

                    return (
                      <div key={`closing-${opp.id}`} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                        <div className="w-8 h-8 rounded-lg g-brand flex items-center justify-center text-black flex-shrink-0">
                          <Icon className="w-4" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{opp.title}</p>
                          <p className="text-xs text-gray-500 capitalize">{opp.type}</p>
                        </div>

                        {tl && <span className={`text-xs font-semibold ${tl.cls}`}>{tl.label}</span>}
                      </div>
                    );
                  })}

                {opportunities.filter((opp) => opp.deadline && new Date(opp.deadline) > new Date()).length === 0 && (
                  <p className="text-sm text-gray-500">No deadlines available yet.</p>
                )}
              </div>

              <div className="bg-white rounded-2xl p-5 border border-gray-100">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <ShieldCheck className="w-4 text-[#1B2D7F]" /> Ecosystem Stats
                </h3>

                <div className="space-y-3">
                  {[
                    { label: 'Mentor-seeking Students', value: people.filter((person) => person._type === 'mentor').length, cls: 'text-indigo-600' },
                    { label: 'Co-Founder Seekers', value: people.filter((person) => person._type === 'cofounder').length, cls: 'text-purple-600' },
                    { label: 'Founder Collaborators', value: people.filter((person) => person._type === 'founder').length, cls: 'text-amber-600' },
                    { label: 'Startup Ideas', value: startups.length, cls: 'text-amber-600' },
                    { label: 'Opportunities', value: opportunities.length, cls: 'text-green-600' },
                  ].map((stat) => (
                    <div key={stat.label} className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">{stat.label}</span>
                      <span className={`font-bold ${stat.cls}`}>{stat.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-gray-100">
                <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
                  <Briefcase className="w-4 text-[#1B2D7F]" /> Opportunity Flow
                </h3>
                <p className="text-sm text-gray-600">
                  Opportunities come from the backend filtered <span className="font-bold">opportunities</span> feed. Add city,
                  area, domain, industry, mode, tags, deadline, organiser, and apply link for clean tech discovery.
                </p>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </>
  );
}

function EmptyState({ title, description, onReset }) {
  return (
    <div className="py-12 text-center bg-white rounded-2xl border border-gray-200 text-gray-500">
      <div className="w-14 h-14 rounded-full bg-gray-50 mx-auto mb-4 flex items-center justify-center">
        <Sparkles className="w-6 text-gray-400" />
      </div>

      <p className="font-semibold text-gray-800">{title}</p>
      <p className="text-sm text-gray-500 mt-1">{description}</p>

      {onReset && (
        <button
          type="button"
          onClick={onReset}
          className="mt-4 px-4 py-2 g-brand text-black rounded-xl text-sm font-black"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
