const BRAND = {
  primary: '#98DE38',
  secondary: '#1B2D7F',
};

const safeArray = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);
const clean = (value) => String(value || '').trim();
const hasText = (value, min = 1) => clean(value).length >= min;
const hasNumber = (value) => Number.isFinite(Number(value)) && Number(value) > 0;

const pct = (earned, total) => {
  if (!total) return 0;
  return Math.max(0, Math.min(100, Math.round((earned / total) * 100)));
};

function scoreChecks(checks) {
  const total = checks.reduce((sum, check) => sum + check.points, 0);
  const earned = checks
    .filter((check) => check.done)
    .reduce((sum, check) => sum + check.points, 0);

  return {
    score: pct(earned, total),
    checks,
    missing: checks.filter((check) => !check.done).slice(0, 4),
  };
}

export function getRoleProfile({ role, studentProfile, founderProfile, mentorProfile, investorProfile }) {
  if (role === 'student') return studentProfile || {};
  if (role === 'early-stage-founder') return founderProfile || {};
  if (role === 'mentor') return mentorProfile || {};
  if (role === 'investor') return investorProfile || {};
  return studentProfile || founderProfile || mentorProfile || investorProfile || {};
}

export function calculateTrustScore({
  profile = {},
  studentProfile = {},
  founderProfile = {},
  mentorProfile = {},
  investorProfile = {},
  role,
} = {}) {
  const currentRole = role || profile.user_type || 'student';
  const checks = [
    { id: 'name', label: 'Full name', done: hasText(profile.full_name, 2), points: 8 },
    { id: 'avatar', label: 'Profile photo', done: hasText(profile.avatar_url), points: 8 },
    { id: 'bio', label: 'Clear bio', done: hasText(profile.bio, 30), points: 10 },
    { id: 'location', label: 'Location', done: hasText(profile.location), points: 6 },
    { id: 'linkedin', label: 'LinkedIn profile', done: hasText(profile.linkedin_url), points: 10 },
  ];

  if (currentRole === 'student') {
    checks.push(
      { id: 'education', label: 'Education details', done: hasText(studentProfile.university) && hasText(studentProfile.degree), points: 10 },
      { id: 'skills', label: '3+ skills', done: safeArray(studentProfile.skills_with_levels).length >= 3, points: 10 },
      { id: 'looking', label: 'Looking for preference', done: safeArray(studentProfile.looking_for).length > 0, points: 8 },
      { id: 'idea', label: 'Startup idea context', done: Boolean(studentProfile.has_startup_idea) && hasText(studentProfile.startup_idea_description, 30), points: 10 },
      { id: 'help', label: 'Help needed', done: safeArray(studentProfile.help_needed).length > 0, points: 8 },
      { id: 'portfolio', label: 'Portfolio or GitHub', done: hasText(studentProfile.portfolio_url) || hasText(profile.github_url), points: 6 }
    );
  }

  if (currentRole === 'early-stage-founder') {
    checks.push(
      { id: 'startup', label: 'Startup name and industry', done: hasText(founderProfile.company_name || founderProfile.idea_title) && hasText(founderProfile.industry), points: 10 },
      { id: 'problem', label: 'Problem and solution', done: hasText(founderProfile.problem_statement || founderProfile.problem_solving, 30) && hasText(founderProfile.solution, 20), points: 12 },
      { id: 'traction', label: 'Traction metrics', done: hasNumber(founderProfile.monthly_revenue) || hasNumber(founderProfile.active_users) || hasNumber(founderProfile.customer_count), points: 10 },
      { id: 'deck', label: 'Pitch deck or demo', done: hasText(founderProfile.pitch_deck_url) || hasText(founderProfile.demo_url), points: 10 },
      { id: 'team', label: 'Team and hiring clarity', done: safeArray(founderProfile.team_members).length > 0 || safeArray(founderProfile.hiring_roles).length > 0 || hasText(founderProfile.cofounder_status), points: 8 },
      { id: 'legal', label: 'Legal status', done: hasText(founderProfile.legal_status), points: 6 }
    );
  }

  if (currentRole === 'mentor') {
    checks.push(
      { id: 'expertise', label: 'Expertise areas', done: safeArray(mentorProfile.expertise_areas).length >= 2, points: 12 },
      { id: 'experience', label: 'Experience and current role', done: hasNumber(mentorProfile.years_experience) && hasText(mentorProfile.current_role), points: 12 },
      { id: 'help', label: 'Can help with', done: safeArray(mentorProfile.can_help_with).length >= 2, points: 10 },
      { id: 'availability', label: 'Availability and capacity', done: safeArray(mentorProfile.available_for).length > 0 && Number(mentorProfile.mentorship_capacity || 0) > 0, points: 10 },
      { id: 'booking', label: 'Booking or contact path', done: hasText(mentorProfile.booking_url) || hasText(profile.linkedin_url), points: 8 },
      { id: 'proof', label: 'Proof of impact', done: safeArray(mentorProfile.success_stories).length > 0 || Number(mentorProfile.successful_exits || 0) > 0, points: 6 }
    );
  }

  if (currentRole === 'investor') {
    checks.push(
      { id: 'firm', label: 'Firm or fund identity', done: hasText(investorProfile.firm_name) || hasText(investorProfile.fund_name), points: 10 },
      { id: 'thesis', label: 'Investment thesis', done: hasText(investorProfile.investment_thesis || investorProfile.what_i_look_for, 40), points: 12 },
      { id: 'focus', label: 'Stages and industries', done: safeArray(investorProfile.preferred_stages || investorProfile.investment_stage).length > 0 && safeArray(investorProfile.preferred_industries || investorProfile.industries_of_interest).length > 0, points: 12 },
      { id: 'check', label: 'Check range', done: hasNumber(investorProfile.check_range_min || investorProfile.ticket_size_min) && hasNumber(investorProfile.check_range_max || investorProfile.ticket_size_max), points: 10 },
      { id: 'portfolio', label: 'Portfolio proof', done: hasNumber(investorProfile.total_investments || investorProfile.portfolio_count) || hasText(investorProfile.portfolio_url), points: 8 },
      { id: 'contact', label: 'Pitch/contact method', done: hasText(investorProfile.preferred_contact_method) || hasText(investorProfile.booking_url), points: 6 }
    );
  }

  const result = scoreChecks(checks);
  const badges = [];
  if (result.score >= 80) badges.push('High-trust profile');
  if (hasText(profile.linkedin_url)) badges.push('LinkedIn added');
  if (currentRole === 'investor' && investorProfile.is_verified) badges.push('Verified investor');
  if (currentRole === 'mentor' && mentorProfile.is_pro_bono) badges.push('Pro-bono mentor');
  if ((studentProfile.has_startup_idea || founderProfile.company_name || founderProfile.idea_title) && result.score >= 60) badges.push('Startup context ready');

  return {
    ...result,
    level: result.score >= 80 ? 'Strong' : result.score >= 60 ? 'Improving' : 'Needs work',
    badges,
    color: result.score >= 70 ? BRAND.primary : BRAND.secondary,
  };
}

export function calculateStartupReadiness({ studentProfile = {}, founderProfile = {}, role } = {}) {
  const isFounder = role === 'early-stage-founder' || hasText(founderProfile.company_name) || hasText(founderProfile.problem_statement);
  const source = isFounder ? founderProfile : studentProfile;

  const title = isFounder
    ? source.company_name || source.idea_title || 'Startup'
    : source.idea_title || 'Startup idea';

  const checks = [
    { id: 'problem', label: 'Problem is specific', done: hasText(source.problem_statement || source.problem_solving || source.startup_idea_description, 40), points: 14 },
    { id: 'solution', label: 'Solution is clear', done: hasText(source.solution || source.unique_value_proposition || source.unique_value_prop, 25), points: 12 },
    { id: 'audience', label: 'Target audience defined', done: hasText(source.target_market || source.target_audience, 10), points: 10 },
    { id: 'domain', label: 'Industry/domain selected', done: hasText(source.industry || source.idea_domain), points: 8 },
    { id: 'stage', label: 'Stage selected', done: hasText(source.startup_stage || source.company_stage || source.idea_stage), points: 8 },
    { id: 'validation', label: 'Validation or traction', done: hasText(source.validation_status) || hasNumber(source.active_users) || hasNumber(source.customer_count) || hasNumber(source.monthly_revenue), points: 16 },
    { id: 'team', label: 'Team or skill gaps known', done: safeArray(source.team_members).length > 0 || safeArray(source.skills_needed).length > 0 || safeArray(source.help_needed).length > 0, points: 10 },
    { id: 'deck', label: 'Investor-ready assets', done: hasText(source.pitch_deck_url) || hasText(source.demo_url) || hasText(source.website_url), points: 12 },
    { id: 'funding', label: 'Funding/readiness clarity', done: hasText(source.funding_stage) || hasText(source.investment_readiness) || hasNumber(source.funding_amount_needed), points: 10 },
  ];

  const result = scoreChecks(checks);
  const risks = result.missing.map((item) => item.label);
  const strengths = checks.filter((check) => check.done).slice(0, 4).map((item) => item.label);

  return {
    ...result,
    title,
    stage: result.score >= 80 ? 'Investor ready' : result.score >= 60 ? 'Mentor ready' : 'Build fundamentals',
    investorReady: result.score >= 80,
    strengths,
    risks,
  };
}

export function buildRoadmap({
  role,
  profile = {},
  founderProfile = {},
  mentorProfile = {},
  trust,
  readiness,
} = {}) {
  const currentRole = role || profile.user_type || 'student';
  const tasks = [];
  const add = (task) => tasks.push({ status: task.done ? 'done' : 'active', priority: task.priority || 'medium', ...task });

  if (currentRole === 'student') {
    add({ id: 'profile', title: 'Complete your identity', description: 'Add bio, avatar, education, LinkedIn, and 3+ skills.', done: trust.score >= 70, to: '/student/profile', cta: 'Edit Profile', priority: 'high' });
    add({ id: 'idea', title: 'Shape your startup idea', description: 'Define problem, audience, uniqueness, and help-needed areas.', done: readiness.score >= 60, to: '/student/profile', cta: 'Add Idea', priority: 'high' });
    add({ id: 'mentor', title: 'Get a mentor review', description: 'Connect with a 60%+ mentor match before sending cold messages.', done: false, to: '/find-mentors', cta: 'Find Mentors' });
    add({ id: 'cofounder', title: 'Find complementary builders', description: 'Look for co-founders who fill your missing skills.', done: false, to: '/find-cofounders', cta: 'Find Co-Founder' });
  }

  if (currentRole === 'early-stage-founder') {
    add({ id: 'startup', title: 'Make the startup profile investor-readable', description: 'Clarify problem, solution, market, traction, and pitch assets.', done: readiness.score >= 70, to: '/founder/profile', cta: 'Edit Startup', priority: 'high' });
    add({ id: 'traction', title: 'Add traction proof', description: 'Revenue, users, customers, pilots, or validation reduce trust friction.', done: hasNumber(founderProfile.monthly_revenue) || hasNumber(founderProfile.active_users) || hasNumber(founderProfile.customer_count), to: '/founder/profile', cta: 'Add Metrics' });
    add({ id: 'team', title: 'Close team gaps', description: 'Publish hiring roles or co-founder requirements for better matching.', done: safeArray(founderProfile.hiring_roles).length > 0 || safeArray(founderProfile.skills_needed).length > 0, to: '/founder/find-team', cta: 'Find Team' });
    add({ id: 'investors', title: 'Approach aligned investors', description: 'Prioritize investors after readiness crosses 60%.', done: readiness.score >= 80, to: '/find-investors', cta: 'Find Investors' });
  }

  if (currentRole === 'mentor') {
    add({ id: 'profile', title: 'Build a high-trust mentor profile', description: 'Expertise, experience, help areas, availability, and proof of impact matter most.', done: trust.score >= 75, to: '/mentor/profile', cta: 'Edit Profile', priority: 'high' });
    add({ id: 'capacity', title: 'Set clear mentorship capacity', description: 'Founders need to know your availability before requesting help.', done: Number(mentorProfile.mentorship_capacity || 0) > 0 && safeArray(mentorProfile.available_for).length > 0, to: '/mentor/profile', cta: 'Set Capacity' });
    add({ id: 'founders', title: 'Review 60%+ founders first', description: 'Focus your time on startups where your expertise creates a real lift.', done: false, to: '/mentor/find-founders', cta: 'Find Founders' });
  }

  if (currentRole === 'investor') {
    add({ id: 'thesis', title: 'Make your thesis machine-readable', description: 'Add stages, industries, geography, check range, and what you look for.', done: trust.score >= 75, to: '/investor/profile', cta: 'Edit Profile', priority: 'high' });
    add({ id: 'dealflow', title: 'Review readiness-ranked startups', description: 'Start with 60%+ matches and check readiness before messaging.', done: false, to: '/investor/find-startups', cta: 'Find Startups' });
    add({ id: 'warm-intro', title: 'Use trust before outreach', description: 'Prefer startups with complete profiles, pitch assets, and traction proof.', done: false, to: '/investor/find-startups', cta: 'Review Matches' });
  }

  return tasks.slice(0, 5);
}

export function getNextBestAction(tasks = []) {
  return tasks.find((task) => task.status !== 'done' && task.priority === 'high')
    || tasks.find((task) => task.status !== 'done')
    || tasks[0];
}

export function getGrowthSignals(input = {}) {
  const role = input.role || input.profile?.user_type || 'student';
  const trust = calculateTrustScore({ ...input, role });
  const readiness = ['student', 'early-stage-founder'].includes(role)
    ? calculateStartupReadiness({ ...input, role })
    : null;
  const roadmap = buildRoadmap({ ...input, role, trust, readiness: readiness || { score: 0 } });

  return {
    role,
    trust,
    readiness,
    roadmap,
    nextAction: getNextBestAction(roadmap),
  };
}
