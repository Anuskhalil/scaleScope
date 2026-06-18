const pct = (value) => Math.max(0, Math.min(100, Math.round(value || 0)));

export const safeArray = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (value === null || value === undefined || value === '') return [];
  return [value];
};

export const normalizeTerm = (value) =>
  String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9+#./\s-]/g, '')
    .replace(/\s+/g, ' ');

const normalizeSkill = (skill) => {
  if (!skill) return '';
  if (typeof skill === 'string') return skill;
  return skill.skill || skill.name || skill.title || skill.label || '';
};

const terms = (...values) =>
  values
    .flatMap((value) => safeArray(value))
    .map(normalizeSkill)
    .map(normalizeTerm)
    .filter(Boolean);

const getProfile = (item = {}) => {
  if (Array.isArray(item.profiles)) return item.profiles[0] || {};
  return item.profiles || item.profile || item.user || {};
};

const containsFit = (left, right) => {
  if (!left || !right) return false;
  return left.includes(right) || right.includes(left);
};

const matchTerms = (needs, strengths) => {
  const cleanNeeds = [...new Set(terms(needs))];
  const cleanStrengths = [...new Set(terms(strengths))];

  if (!cleanNeeds.length || !cleanStrengths.length) return [];

  return cleanNeeds.filter((need) =>
    cleanStrengths.some((strength) => {
      const tokens = need.split(/\s+|\/|&/).filter((token) => token.length > 2);
      return containsFit(need, strength) || tokens.some((token) => strength.includes(token));
    })
  );
};

const daysSince = (dateLike) => {
  if (!dateLike) return null;
  const date = new Date(dateLike);
  if (Number.isNaN(date.getTime())) return null;
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000));
};

const getBaseScore = (candidate = {}) =>
  Number(candidate.smartScore || candidate._smartScore || candidate.matchScore || candidate._score || candidate.score || candidate.ai_score || 0);

export const getProofBadges = (candidate = {}) => {
  const p = getProfile(candidate);
  const badges = [];

  if (p.linkedin_url || candidate.linkedin_url) badges.push('LinkedIn');
  if (p.github_url || candidate.github_url) badges.push('GitHub');
  if (p.portfolio_url || candidate.portfolio_url || candidate.website_url) badges.push('Portfolio');
  if (candidate.pitch_deck_url) badges.push('Pitch deck');
  if (candidate.demo_url || candidate.product_demo_url) badges.push('Demo');
  if (candidate.is_verified) badges.push('Verified');
  if (Number(candidate.profile_completion || p.profile_completion || 0) >= 80) badges.push('Complete profile');
  if (Number(candidate.successful_exits || candidate.exits || 0) > 0) badges.push('Exits');

  return [...new Set(badges)].slice(0, 4);
};

const trustScore = (candidate = {}) => {
  const p = getProfile(candidate);
  let score = 0;

  if ((p.full_name || candidate.full_name || '').trim().length > 1) score += 10;
  if ((p.bio || candidate.bio || '').trim().length > 30) score += 12;
  if (p.avatar_url || candidate.avatar_url) score += 12;
  if (p.location || candidate.location) score += 6;
  score += Math.min(25, Number(candidate.profile_completion || p.profile_completion || 0) * 0.25);
  score += getProofBadges(candidate).length * 8;
  if (candidate.is_verified) score += 10;
  if (candidate.is_public === false || candidate.is_active === false) score -= 25;

  return pct(score);
};

const activityScore = (candidate = {}) => {
  const p = getProfile(candidate);
  const age = daysSince(candidate.last_active || p.last_active || candidate.updated_at || p.updated_at || candidate.created_at);

  if (age === null) return 35;
  if (age <= 7) return 100;
  if (age <= 30) return 75;
  if (age <= 90) return 50;
  return 20;
};

const activityLabel = (candidate = {}) => {
  const p = getProfile(candidate);
  const age = daysSince(candidate.last_active || p.last_active || candidate.updated_at || p.updated_at || candidate.created_at);

  if (age === null) return 'Activity unknown';
  if (age <= 7) return 'Active this week';
  if (age <= 30) return 'Active this month';
  if (age <= 90) return 'Recently updated';
  return 'Stale profile';
};

const roleAlignment = (candidate = {}, context = '') => {
  const looking = terms(candidate.looking_for, candidate.available_for);
  const roleText = normalizeTerm(context);

  if (!looking.length) return context.includes('investor') || context.includes('startup') ? 55 : 35;
  if (roleText.includes('cofounder') && looking.some((item) => item.includes('co-founder') || item.includes('cofounder'))) return 100;
  if (roleText.includes('mentor') && looking.some((item) => item.includes('mentor') || item.includes('advice'))) return 100;
  if (roleText.includes('team') && looking.some((item) => item.includes('startup') || item.includes('co-founder'))) return 85;
  return 55;
};

const complementaryScore = (current = {}, candidate = {}, context = '') => {
  const p = getProfile(candidate);

  if (context === 'investor-to-startup') {
    const industryHits = matchTerms(
      [current.preferred_industries, current.industries_of_interest],
      [candidate.industry, candidate.idea_domain]
    );
    const stageHits = matchTerms(
      [current.preferred_stages, current.investment_stage],
      [candidate.funding_stage, candidate.startup_stage, candidate.company_stage, candidate.idea_stage]
    );
    let score = industryHits.length ? 35 : 0;
    score += stageHits.length ? 30 : 0;
    if (candidate.pitch_deck_url || candidate.demo_url) score += 15;
    if (candidate.traction_summary || candidate.active_users || candidate.monthly_revenue) score += 10;
    if (candidate.problem_solving || candidate.problem_statement || candidate.startup_idea_description) score += 10;
    return { score: pct(score), hits: [...industryHits, ...stageHits] };
  }

  if (context === 'founder-to-investor') {
    const industryHits = matchTerms(
      [current.industry, current.idea_domain],
      [candidate.preferred_industries, candidate.industries_of_interest]
    );
    const stageHits = matchTerms(
      [current.funding_stage, current.startup_stage, current.company_stage],
      [candidate.preferred_stages, candidate.investment_stage]
    );
    let score = industryHits.length ? 35 : 0;
    score += stageHits.length ? 30 : 0;
    if (candidate.accepting_pitches !== false) score += 15;
    if (candidate.what_i_look_for || candidate.investment_thesis) score += 10;
    if (candidate.is_verified) score += 10;
    return { score: pct(score), hits: [...industryHits, ...stageHits] };
  }

  const needs = [
    current.help_needed,
    current.skills_needed,
    current.hiring_roles,
    current.current_challenges,
    current.preferred_role,
  ];
  const strengths = [
    candidate.skills,
    candidate.skills_with_levels,
    candidate.founder_skills,
    candidate.expertise_areas,
    candidate.can_help_with,
    candidate.current_role,
    p.skills,
  ];
  const hits = matchTerms(needs, strengths);
  let score = Math.min(55, hits.length * 18);

  const sameIndustry = matchTerms(
    [current.industry, current.idea_domain, current.interests],
    [candidate.industry, candidate.idea_domain, candidate.interests]
  );
  if (sameIndustry.length) score += 15;

  if (current.commitment_level && candidate.commitment_level && current.commitment_level === candidate.commitment_level) score += 10;
  if (candidate.has_startup_idea || candidate.company_name || candidate.idea_title) score += 10;
  if (context === 'mentor-to-founder' && Number(candidate.profile_completion || 0) >= 60) score += 10;

  return { score: pct(score), hits: [...hits, ...sameIndustry] };
};

export function buildMatchIntelligence({ currentProfile = {}, candidate = {}, context = 'cofounder', baseScore } = {}) {
  const base = Number.isFinite(Number(baseScore)) ? Number(baseScore) : getBaseScore(candidate);
  const complement = complementaryScore(currentProfile, candidate, context);
  const trust = trustScore(candidate);
  const active = activityScore(candidate);
  const alignment = roleAlignment(candidate, context);

  const weighted = base > 0
    ? (base * 0.35) + (complement.score * 0.35) + (trust * 0.18) + (active * 0.07) + (alignment * 0.05)
    : (complement.score * 0.5) + (trust * 0.25) + (active * 0.15) + (alignment * 0.1);

  const proofBadges = getProofBadges(candidate);
  const hits = complement.hits.slice(0, 3);
  const reasons = [
    hits.length ? `Complementary fit: ${hits.join(', ')}` : 'Complementary fit needs more profile data',
    proofBadges.length ? `Proof signals: ${proofBadges.join(', ')}` : 'No external proof added yet',
    activityLabel(candidate),
  ];

  return {
    smartScore: pct(weighted),
    scoreBreakdown: [
      { label: 'Complementary fit', value: complement.score },
      { label: 'Trust signals', value: trust },
      { label: 'Activity', value: active },
      { label: 'Role alignment', value: alignment },
    ],
    proofBadges,
    activityLabel: activityLabel(candidate),
    outreachSuggestion:
      hits.length > 0
        ? `Open with ${hits[0]} and ask for a specific next step.`
        : 'Ask a specific question instead of sending a generic intro.',
    reasons,
  };
}

export function attachMatchIntelligence(items = [], currentProfile = {}, context = 'cofounder') {
  return safeArray(items)
    .map((item) => {
      const intelligence = buildMatchIntelligence({ currentProfile, candidate: item, context });
      return {
        ...item,
        ...intelligence,
        matchScore: intelligence.smartScore,
        _score: intelligence.smartScore,
        reasons: item.reasons?.length ? item.reasons : intelligence.reasons,
      };
    })
    .sort((a, b) => Number(b.smartScore || b.matchScore || 0) - Number(a.smartScore || a.matchScore || 0));
}
