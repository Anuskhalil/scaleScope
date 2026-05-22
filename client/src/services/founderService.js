// src/services/founderService.js
// ─── All Supabase calls for the early-stage founder role ────────────────────

import { supabase } from '../lib/supabaseClient';

const BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

// ═══════════════════════════════════════════════════════════════════════════
// API HELPERS
// ═══════════════════════════════════════════════════════════════════════════

const getAuthHeaders = async () => {
  const { data } = await supabase.auth.getSession();

  if (!data.session?.access_token) {
    throw new Error('Missing auth token. Please login again.');
  }

  return {
    Authorization: `Bearer ${data.session.access_token}`,
    'Content-Type': 'application/json',
  };
};

const unwrapApiData = async (res, fallbackError = 'Request failed') => {
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || data.message || fallbackError);
  }

  return data;
};

const cleanText = (value) => {
  const text = typeof value === 'string' ? value.trim() : value;
  return text || null;
};

const safeArray = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean);
  return [];
};

const safeJson = (value, fallback = {}) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fallback;
  return value;
};

const parseNumber = (value) => {
  if (value === null || value === undefined || value === '') return null;

  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const parseFunding = (value) => {
  if (!value) return null;

  const n = parseFloat(String(value).replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? n : null;
};

// ═══════════════════════════════════════════════════════════════════════════
// FOUNDER PROFILE
// ═══════════════════════════════════════════════════════════════════════════

export async function fetchFounderProfile(userId) {
  if (!userId) throw new Error('userId is required');

  const [profRes, fpRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle(),

    supabase
      .from('founder_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle(),
  ]);

  if (profRes.error) throw profRes.error;
  if (fpRes.error) throw fpRes.error;

  return {
    profile: profRes.data || {},
    founderProfile: fpRes.data || {},
  };
}

export async function saveFounderBaseProfile(userId, data = {}) {
  if (!userId) throw new Error('userId is required');

  const payload = {
    id: userId,
    full_name: cleanText(data.full_name),
    email: cleanText(data.email),
    user_type: 'early-stage-founder',
    location: cleanText(data.location),
    bio: cleanText(data.bio),
    avatar_url: cleanText(extractAvatarPath(data.avatar_url)),
    linkedin_url: cleanText(data.linkedin_url),
    github_url: cleanText(data.github_url),
    twitter_url: cleanText(data.twitter_url),
    // profile_completion: data.profile_completion || 0,
    // onboarding_completed: Boolean(data.onboarding_completed),
    updated_at: new Date().toISOString(),
    last_active: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('profiles')
    .upsert(payload, { onConflict: 'id' });

  if (error) throw error;

  return payload;
}

export async function saveFounderStartupProfile(userId, data = {}) {
  if (!userId) throw new Error('userId is required');

  const payload = {
    user_id: userId,

    // Basic startup identity
    company_name: cleanText(data.company_name),
    idea_title: cleanText(data.idea_title),
    industry: cleanText(data.industry),
    startup_stage: cleanText(data.startup_stage),
    company_stage: cleanText(data.startup_stage || data.company_stage),

    // Startup story
    problem_solving: cleanText(data.problem_solving),
    problem_statement: cleanText(data.problem_statement || data.problem_solving),
    solution_description: cleanText(data.solution_description),
    unique_value_proposition: cleanText(data.unique_value_proposition),
    target_market: cleanText(data.target_market),
    target_audience: cleanText(data.target_audience || data.target_market),
    competitors: cleanText(data.competitors),

    // Business model and strategy
    revenue_model: cleanText(data.revenue_model),
    business_model_details: cleanText(data.business_model_details),
    go_to_market_strategy: cleanText(data.go_to_market_strategy),
    current_challenges: cleanText(data.current_challenges),
    launch_timeline: cleanText(data.launch_timeline),
    market_size: cleanText(data.market_size),
    product_status: cleanText(data.product_status),
    validation_status: cleanText(data.validation_status),
    customer_validation: cleanText(data.customer_validation),

    // Team and founder commitment
    founder_role: cleanText(data.founder_role),
    commitment_level: cleanText(data.commitment_level),
    weekly_hours: cleanText(data.weekly_hours),
    team_size: parseNumber(data.team_size) || 1,
    founding_year: parseNumber(data.founding_year),
    founder_skills: safeArray(data.founder_skills),

    // Traction and funding
    traction_summary: cleanText(data.traction_summary),
    traction_metrics: safeJson(data.traction_metrics, {}),
    funding_raised: parseFunding(data.funding_raised),
    funding_stage: cleanText(data.funding_stage),
    ask_amount: cleanText(data.ask_amount),
    use_of_funds: cleanText(data.use_of_funds),
    milestones_next_6_months: cleanText(data.milestones_next_6_months),

    // Links/assets
    pitch_deck_url: cleanText(data.pitch_deck_url),
    demo_url: cleanText(data.demo_url),
    website_url: cleanText(data.website_url),

    // Matching fields
    looking_for: safeArray(data.looking_for),
    help_needed: safeArray(data.help_needed),
    skills_needed: safeArray(data.skills_needed),
    // skills: safeArray(data.skills),
    hiring_roles: safeArray(data.hiring_roles),
    tech_stack: safeArray(data.tech_stack),
    key_risks: safeArray(data.key_risks),

    // Team/cofounder info
    equity_available: cleanText(data.equity_available),
    cofounder_requirements: cleanText(data.cofounder_requirements),

    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('founder_profiles')
    .upsert(payload, { onConflict: 'user_id' });

  if (error) throw error;

  return payload;
}

const slugify = (value = 'founder') =>
  String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'founder';

export function extractAvatarPath(value) {
  if (!value) return '';

  // Already a clean storage path
  if (!value.startsWith('http')) {
    return value.replace(/^avatars\//, '');
  }

  try {
    const url = new URL(value);

    const signedMarker = '/storage/v1/object/sign/avatars/';
    const publicMarker = '/storage/v1/object/public/avatars/';

    if (url.pathname.includes(signedMarker)) {
      return decodeURIComponent(url.pathname.split(signedMarker)[1] || '');
    }

    if (url.pathname.includes(publicMarker)) {
      return decodeURIComponent(url.pathname.split(publicMarker)[1] || '');
    }

    return value;
  } catch {
    return value;
  }
}

export async function resolveAvatarUrl(pathOrUrl) {
  if (!pathOrUrl) return '';

  // If already signed/public URL, use it for current preview
  if (String(pathOrUrl).startsWith('http')) {
    return pathOrUrl;
  }

  const cleanPath = extractAvatarPath(pathOrUrl);

  if (!cleanPath) return '';

  const { data, error } = await supabase
    .storage
    .from('avatars')
    .createSignedUrl(cleanPath, 86400);

  if (error || !data?.signedUrl) {
    console.warn('Avatar signed URL failed:', error?.message);
    return '';
  }

  return data.signedUrl;
}

export async function uploadFounderAvatar(userId, file, displayName = 'founder') {
  if (!userId) throw new Error('userId is required');
  if (!file) throw new Error('file is required');

  if (!file.type.startsWith('image/')) {
    throw new Error('Invalid file type');
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error('File too large (max 5MB)');
  }

  const ext = file.name.split('.').pop().toLowerCase();

  const safeName = slugify(displayName);
  const path = `founders/${safeName}_${userId}.${ext}`;

  const { error: uploadError } = await supabase
    .storage
    .from('avatars')
    .upload(path, file, {
      upsert: true,
      cacheControl: '3600',
    });

  if (uploadError) throw uploadError;

  const { data: signedData, error: signedError } = await supabase
    .storage
    .from('avatars')
    .createSignedUrl(path, 86400);

  if (signedError || !signedData?.signedUrl) {
    throw new Error('Failed to generate avatar URL');
  }

  // ✅ DB mein signed URL nahi, sirf path save karo
  const { error } = await supabase
    .from('profiles')
    .update({
      avatar_url: path,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) throw error;

  return {
    path,
    signedUrl: signedData.signedUrl,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════

export async function fetchFounderDashboardData(userId) {
  if (!userId) throw new Error('userId is required');

  const [profRes, fpRes, reqRes, convRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle(),

    supabase
      .from('founder_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle(),

    supabase
      .from('connection_requests')
      .select(`
        id,
        type,
        message,
        status,
        created_at,
        sender:profiles!connection_requests_sender_id_fkey (
          id,
          full_name,
          avatar_url,
          user_type,
          location,
          bio
        )
      `)
      .eq('receiver_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(8),

    supabase
      .from('conversations')
      .select(`
        id,
        type,
        title,
        last_message_at,
        conversation_participants!inner (
          user_id,
          profiles (
            id,
            full_name,
            avatar_url,
            user_type,
            location
          )
        )
      `)
      .eq('conversation_participants.user_id', userId)
      .order('last_message_at', { ascending: false, nullsFirst: false })
      .limit(5),
  ]);

  if (profRes.error) throw profRes.error;
  if (fpRes.error) throw fpRes.error;
  if (reqRes.error) console.warn('Founder requests fetch:', reqRes.error.message);
  if (convRes.error) console.warn('Founder conversations fetch:', convRes.error.message);

  const profile = profRes.data || {};
  const founderProfile = fpRes.data || {};

  let mentors = [];
  let investors = [];
  let teamCandidates = [];

  try {
    mentors = await fetchMentorsForFounder({
      industry: founderProfile.industry || '',
      expertise: safeArray(founderProfile.help_needed),
      limit: 6,
    });
  } catch (e) {
    console.warn('Founder dashboard mentors:', e.message);
  }

  try {
    investors = await fetchInvestors({
      stage: founderProfile.funding_stage || founderProfile.startup_stage || '',
      industry: founderProfile.industry || '',
      limit: 6,
    });
  } catch (e) {
    console.warn('Founder dashboard investors:', e.message);
  }

  try {
    teamCandidates = await fetchTeamCandidates({
      skills: safeArray(founderProfile.skills_needed),
      commitment: founderProfile.commitment_level || '',
      limit: 6,
    });
  } catch (e) {
    console.warn('Founder dashboard team candidates:', e.message);
  }

  return {
    profile,
    founderProfile,
    requests: reqRes.data || [],
    conversations: convRes.data || [],
    mentors,
    investors,
    teamCandidates,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// FIND TEAM
// ═══════════════════════════════════════════════════════════════════════════

export async function fetchTeamCandidates({
  skills = [],
  commitment = '',
  industry = '',
  limit = 24,
} = {}) {
  let query = supabase
    .from('student_profiles')
    .select(`
      id,
      user_id,
      skills_with_levels,
      looking_for,
      help_needed,
      interests,
      commitment_level,
      hours_per_week,
      has_startup_idea,
      startup_idea_description,
      career_goals,
      idea_title,
      idea_domain,
      idea_stage,
      target_audience,
      unique_value_prop,
      profiles (
        id,
        full_name,
        bio,
        avatar_url,
        location,
        skills,
        linkedin_url,
        github_url
      )
    `)
    .or('looking_for.cs.{"Co-Founder"},looking_for.cs.{"Startup"}')
    .limit(limit);

  const { data, error } = await query;

  if (error) throw error;

  let result = data || [];

  if (skills.length > 0) {
    const lowerSkills = skills.map((skill) => String(skill).toLowerCase());

    result = result.filter((student) => {
      const studentSkills = [
        ...safeArray(student.skills_with_levels).map((item) =>
          String(item?.skill || item).toLowerCase()
        ),
        ...safeArray(student.profiles?.skills).map((item) =>
          String(item).toLowerCase()
        ),
      ];

      return lowerSkills.some((wanted) =>
        studentSkills.some((skill) => skill.includes(wanted) || wanted.includes(skill))
      );
    });
  }

  if (commitment) {
    result = result.filter((student) => student.commitment_level === commitment);
  }

  if (industry) {
    const lowerIndustry = industry.toLowerCase();

    result = result.filter((student) => {
      return safeArray(student.interests).some((interest) =>
        String(interest).toLowerCase().includes(lowerIndustry)
      ) || String(student.idea_domain || '').toLowerCase().includes(lowerIndustry);
    });
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// FIND MENTORS
// ═══════════════════════════════════════════════════════════════════════════

export async function fetchMentorsForFounder({
  industry = '',
  expertise = [],
  limit = 20,
} = {}) {
  let query = supabase
    .from('mentor_profiles')
    .select(`
      id,
      user_id,
      expertise_areas,
      years_experience,
      current_role,
      current_company,
      is_pro_bono,
      can_help_with,
      available_for,
      successful_exits,
      companies_founded,
      mentorship_style,
      profiles (
        id,
        full_name,
        bio,
        avatar_url,
        location,
        skills,
        linkedin_url,
        github_url
      )
    `)
    .limit(limit);

  if (expertise.length > 0) {
    query = query.overlaps('expertise_areas', expertise);
  }

  const { data, error } = await query;

  if (error) throw error;

  let result = data || [];

  if (industry) {
    const lowerIndustry = industry.toLowerCase();

    result = result.filter((mentor) => {
      return safeArray(mentor.can_help_with).some((help) =>
        String(help).toLowerCase().includes(lowerIndustry)
      ) || safeArray(mentor.expertise_areas).some((area) =>
        String(area).toLowerCase().includes(lowerIndustry)
      );
    });
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// FIND INVESTORS
// ═══════════════════════════════════════════════════════════════════════════

export async function fetchInvestors({
  stage = '',
  industry = '',
  limit = 20,
} = {}) {
  let query = supabase
    .from('investor_profiles')
    .select(`
      id,
      profile_id,
      investor_type,
      fund_name,
      preferred_stages,
      preferred_industries,
      check_range_min,
      check_range_max,
      investment_thesis,
      geography_focus,
      total_investments,
      exits,
      what_i_look_for,
      is_verified,
      is_active,
      response_time,
      profiles!investor_profiles_profile_id_fkey (
        id,
        full_name,
        bio,
        avatar_url,
        location,
        linkedin_url,
        twitter_url
      )
    `)
    .eq('is_active', true)
    .limit(limit);

  if (stage) {
    query = query.contains('preferred_stages', [stage]);
  }

  if (industry) {
    query = query.contains('preferred_industries', [industry]);
  }

  const { data, error } = await query;

  if (error) throw error;

  return data || [];
}

// ═══════════════════════════════════════════════════════════════════════════
// CONNECTIONS / CONVERSATIONS — BACKEND SECURED
// ═══════════════════════════════════════════════════════════════════════════

export async function respondToConnectionRequest(requestId, status) {
  const action =
    status === 'accepted'
      ? 'accept'
      : status === 'declined' || status === 'rejected'
        ? 'decline'
        : status;

  const res = await fetch(`${BASE}/api/connections/respond`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify({
      requestId,
      action,
    }),
  });

  return unwrapApiData(res, 'Failed to respond to request');
}

export async function sendConnectionRequest(senderId, receiverId, type, message = '') {
  if (!receiverId) {
    throw new Error('receiverId is required');
  }

  const res = await fetch(`${BASE}/api/connections/request`, {
    method: 'POST',
    headers: await getAuthHeaders(),
    body: JSON.stringify({
      receiverId,
      type,
      message: message?.slice(0, 500),
    }),
  });

  return unwrapApiData(res, 'Failed to send connection request');
}

export async function getOrCreateConversation(userId, otherUserId) {
  if (!otherUserId) {
    throw new Error('otherUserId is required');
  }

  const res = await fetch(`${BASE}/api/conversations/with/${otherUserId}`, {
    method: 'POST',
    headers: await getAuthHeaders(),
  });

  const data = await unwrapApiData(res, 'Failed to open conversation');

  return data.conversationId || data.id || data.data?.id;
}

export async function getMyConnections() {
  const res = await fetch(`${BASE}/api/connections/mine`, {
    headers: await getAuthHeaders(),
  });

  return unwrapApiData(res, 'Failed to fetch connections');
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════════════════════════════════════

export function calcFounderCompletion(profile = {}, founderProfile = {}) {
  const p = profile || {};
  const fp = founderProfile || {};

  let score = 0;

  // Identity: 25
  if ((p.full_name || '').trim().length > 1) score += 5;
  if ((p.bio || '').trim().length > 20) score += 5;
  if (p.avatar_url) score += 4;
  if (p.location) score += 3;
  if (p.linkedin_url) score += 4;
  if (safeArray(fp.founder_skills).length >= 3) score += 4;
  
  // Startup foundation: 35
  if ((fp.company_name || fp.idea_title || '').trim().length > 1) score += 6;
  if (fp.industry) score += 4;
  if (fp.startup_stage || fp.company_stage) score += 4;
  if (fp.product_status) score += 4;
  if (fp.validation_status) score += 4;
  if ((fp.problem_solving || fp.problem_statement || '').trim().length > 20) score += 6;
  if ((fp.unique_value_proposition || '').trim().length > 10) score += 4;
  if (fp.target_market || fp.target_audience) score += 3;

  // Strategy and traction: 20
  if ((fp.go_to_market_strategy || '').trim().length > 10) score += 4;
  if ((fp.customer_validation || '').trim().length > 10) score += 4;
  if ((fp.traction_summary || '').trim().length > 10) score += 4;
  if (fp.revenue_model) score += 3;
  if (fp.funding_stage) score += 3;
  if (fp.pitch_deck_url) score += 2;

  // Matching: 20
  if (safeArray(fp.looking_for).length > 0) score += 4;
  if (safeArray(fp.help_needed).length > 0) score += 4;
  if (safeArray(fp.skills_needed).length > 0) score += 4;
  if (safeArray(fp.hiring_roles).length > 0) score += 3;
  if (safeArray(fp.tech_stack).length > 0) score += 3;
  if (fp.commitment_level || fp.weekly_hours) score += 2;

  return Math.min(score, 100);
}

export function formatCheckSize(min, max) {
  const fmt = (n) => {
    const value = Number(n);

    if (!Number.isFinite(value)) return 'Undisclosed';

    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;

    return `$${(value / 1000).toFixed(0)}K`;
  };

  if (!min && !max) return 'Undisclosed';
  if (!min) return `Up to ${fmt(max)}`;
  if (!max) return `${fmt(min)}+`;

  return `${fmt(min)} – ${fmt(max)}`;
}