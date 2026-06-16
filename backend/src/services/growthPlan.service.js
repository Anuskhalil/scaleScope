const supabase = require('../config/supabase');
const { getGeminiModel } = require('../config/gemini');

const safeArray = (value) => (Array.isArray(value) ? value.filter(Boolean).slice(0, 12) : []);
const clean = (value, limit = 400) => String(value || '').trim().slice(0, limit);
const hasText = (value, min = 1) => clean(value, min + 20).length >= min;
const hasNumber = (value) => Number.isFinite(Number(value)) && Number(value) > 0;

function clampScore(value) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 50;
  return Math.max(0, Math.min(100, Math.round(number)));
}

function compactProfileSummary({ profile, student, founder, mentor, investor }) {
  const role = profile?.user_type || 'student';

  return {
    role,
    name: clean(profile?.full_name, 80),
    bio: clean(profile?.bio, 500),
    location: clean(profile?.location, 120),
    student: student ? {
      university: clean(student.university, 160),
      degree: clean(student.degree, 120),
      major: clean(student.major, 120),
      skills: safeArray(student.skills_with_levels).map((item) => item.skill || item.name || item).slice(0, 10),
      interests: safeArray(student.interests),
      looking_for: safeArray(student.looking_for),
      help_needed: safeArray(student.help_needed),
      has_startup_idea: Boolean(student.has_startup_idea),
      idea_title: clean(student.idea_title, 160),
      idea_domain: clean(student.idea_domain, 120),
      idea_stage: clean(student.idea_stage, 80),
      target_audience: clean(student.target_audience, 220),
      unique_value_prop: clean(student.unique_value_prop, 260),
      startup_idea_description: clean(student.startup_idea_description, 700),
      commitment_level: clean(student.commitment_level, 120),
    } : null,
    founder: founder ? {
      company_name: clean(founder.company_name, 160),
      idea_title: clean(founder.idea_title, 160),
      industry: clean(founder.industry, 120),
      startup_stage: clean(founder.startup_stage || founder.company_stage, 100),
      problem_statement: clean(founder.problem_statement || founder.problem_solving, 700),
      solution: clean(founder.solution, 500),
      target_market: clean(founder.target_market || founder.target_audience, 260),
      unique_value_proposition: clean(founder.unique_value_proposition, 260),
      traction: clean(founder.traction_summary || founder.validation_status, 300),
      monthly_revenue: founder.monthly_revenue || null,
      active_users: founder.active_users || null,
      customer_count: founder.customer_count || null,
      funding_stage: clean(founder.funding_stage, 120),
      investment_readiness: clean(founder.investment_readiness, 120),
      skills_needed: safeArray(founder.skills_needed),
      hiring_roles: safeArray(founder.hiring_roles),
      tech_stack: safeArray(founder.tech_stack),
      key_risks: safeArray(founder.key_risks),
    } : null,
    mentor: mentor ? {
      expertise_areas: safeArray(mentor.expertise_areas),
      years_experience: mentor.years_experience || 0,
      current_role: clean(mentor.current_role, 160),
      current_company: clean(mentor.current_company, 160),
      can_help_with: safeArray(mentor.can_help_with),
      available_for: safeArray(mentor.available_for),
      mentorship_style: clean(mentor.mentorship_style, 260),
      mentorship_capacity: mentor.mentorship_capacity || 0,
      current_mentees: mentor.current_mentees || 0,
      is_pro_bono: Boolean(mentor.is_pro_bono),
    } : null,
    investor: investor ? {
      investor_type: clean(investor.investor_type, 120),
      firm_name: clean(investor.firm_name || investor.fund_name, 160),
      stages: safeArray(investor.preferred_stages || investor.investment_stage),
      industries: safeArray(investor.preferred_industries || investor.industries_of_interest),
      check_range_min: investor.check_range_min || investor.ticket_size_min || null,
      check_range_max: investor.check_range_max || investor.ticket_size_max || null,
      geography_focus: clean(investor.geography_focus || investor.geographic_focus, 160),
      total_investments: investor.total_investments || investor.portfolio_count || 0,
      exits: investor.exits || investor.successful_exits || 0,
      thesis: clean(investor.investment_thesis || investor.what_i_look_for, 700),
      typical_involvement: clean(investor.typical_involvement, 260),
      accepting_pitches: investor.accepting_pitches !== false,
    } : null,
  };
}

async function fetchUserProfileBundle(userId) {
  const [profileRes, studentRes, founderRes, mentorRes, investorRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabase.from('student_profiles').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('founder_profiles').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('mentor_profiles').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('investor_profiles').select('*').eq('user_id', userId).maybeSingle(),
  ]);

  if (profileRes.error || !profileRes.data) {
    throw new Error(profileRes.error?.message || 'Profile not found');
  }

  return {
    profile: profileRes.data,
    student: studentRes.data || null,
    founder: founderRes.data || null,
    mentor: mentorRes.data || null,
    investor: investorRes.data || null,
  };
}

function fallbackPlan(summary) {
  const role = summary.role || 'student';
  const common = {
    source: 'deterministic_fallback',
    confidence: 0.62,
    headline: 'Your next steps are based on profile completeness, trust, and startup readiness.',
    mentor_gap: 'Add more specific needs so mentors can understand where they can help.',
    investor_gap: 'Investors need clearer traction, market, and trust signals before outreach.',
  };

  if (role === 'student') {
    const hasIdea = summary.student?.has_startup_idea && hasText(summary.student?.startup_idea_description, 40);
    return {
      ...common,
      headline: hasIdea
        ? 'Validate your idea with mentors before searching broadly.'
        : 'Start with a structured student-founder path before outreach.',
      weekly_plan: [
        { week: 1, focus: 'Problem clarity', actions: ['Write the exact user problem', 'List 10 target users', 'Ask one mentor for validation feedback'] },
        { week: 2, focus: 'Team fit', actions: ['Define missing co-founder skills', 'Shortlist 3 complementary profiles', 'Prepare a short intro message'] },
        { week: 3, focus: 'MVP direction', actions: ['Sketch the first MVP workflow', 'Pick one success metric', 'Update your profile with help-needed areas'] },
      ],
      match_strategy: ['Prioritize mentors who match your help-needed areas', 'Prefer co-founders with skills you do not already have', 'Avoid messaging until connection is accepted'],
      risk_flags: hasIdea ? ['Idea may still need validation evidence'] : ['Startup idea is not clear yet'],
    };
  }

  if (role === 'early-stage-founder') {
    const hasTraction = hasNumber(summary.founder?.monthly_revenue) || hasNumber(summary.founder?.active_users) || hasNumber(summary.founder?.customer_count);
    return {
      ...common,
      headline: hasTraction
        ? 'Turn traction into a sharper investor-ready story.'
        : 'Build proof before investor outreach.',
      weekly_plan: [
        { week: 1, focus: 'Investor narrative', actions: ['Clarify problem, solution, and ICP', 'Add traction or validation proof', 'Prepare a 5-slide pitch summary'] },
        { week: 2, focus: 'Warm support', actions: ['Connect with mentors in your weak areas', 'Add team gaps and hiring roles', 'Ask for pitch feedback'] },
        { week: 3, focus: 'Fundraising precision', actions: ['Shortlist investors by stage and industry', 'Check readiness score before outreach', 'Track every conversation outcome'] },
      ],
      match_strategy: ['Use mentors before investors if readiness is below 80', 'Target investors by stage, ticket size, and industry', 'Use warm introductions where possible'],
      risk_flags: hasTraction ? ['Investor assets may still need refinement'] : ['No traction metric added yet'],
    };
  }

  if (role === 'mentor') {
    return {
      ...common,
      headline: 'Focus your time on founders where your expertise has clear leverage.',
      weekly_plan: [
        { week: 1, focus: 'Mentor positioning', actions: ['Add exact expertise areas', 'Set capacity and availability', 'Add proof of impact'] },
        { week: 2, focus: 'Founder review', actions: ['Review 60%+ founders first', 'Prioritize startups with clear problem and ask', 'Send structured feedback'] },
        { week: 3, focus: 'Impact loop', actions: ['Track mentee milestones', 'Ask for feedback after sessions', 'Update success stories'] },
      ],
      match_strategy: ['Prefer startups matching can-help-with areas', 'Reject vague asks politely', 'Use readiness score to reduce noise'],
      risk_flags: ['Availability or proof of impact may be incomplete'],
    };
  }

  return {
    ...common,
    headline: 'Use readiness and trust signals to filter deal flow before conversations.',
    weekly_plan: [
      { week: 1, focus: 'Thesis clarity', actions: ['Add preferred stages and industries', 'Set check range', 'Clarify what you look for'] },
      { week: 2, focus: 'Deal-flow review', actions: ['Review 60%+ startup matches', 'Check traction and pitch assets', 'Save only thesis-aligned startups'] },
      { week: 3, focus: 'Warm intro path', actions: ['Prefer trusted profiles', 'Ask mentors for context where available', 'Track response and outcome quality'] },
    ],
    match_strategy: ['Rank startups by stage, industry, and readiness', 'Avoid low-trust profiles until improved', 'Use founder progress as signal, not just pitch claims'],
    risk_flags: ['Thesis or contact preference may be incomplete'],
  };
}

function extractJson(text) {
  const raw = String(text || '').trim();
  const fenced = raw.match(/```json\s*([\s\S]*?)```/i) || raw.match(/```\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : raw;
  const start = candidate.indexOf('{');
  const end = candidate.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('AI response did not include JSON');
  }
  return JSON.parse(candidate.slice(start, end + 1));
}

function normalizePlan(plan, fallback) {
  return {
    source: clean(plan.source, 40) || 'gemini',
    confidence: Math.max(0, Math.min(1, Number(plan.confidence || 0.7))),
    headline: clean(plan.headline, 220) || fallback.headline,
    weekly_plan: Array.isArray(plan.weekly_plan) && plan.weekly_plan.length
      ? plan.weekly_plan.slice(0, 4).map((week, index) => ({
        week: Number(week.week || index + 1),
        focus: clean(week.focus, 90),
        actions: safeArray(week.actions).map((action) => clean(action, 140)).slice(0, 4),
      }))
      : fallback.weekly_plan,
    match_strategy: safeArray(plan.match_strategy).map((item) => clean(item, 160)).slice(0, 5) || fallback.match_strategy,
    mentor_gap: clean(plan.mentor_gap, 220) || fallback.mentor_gap,
    investor_gap: clean(plan.investor_gap, 220) || fallback.investor_gap,
    risk_flags: safeArray(plan.risk_flags).map((item) => clean(item, 140)).slice(0, 5) || fallback.risk_flags,
  };
}

async function generateAiPlan(summary, signals) {
  if (!process.env.GEMINI_API_KEY) {
    return null;
  }

  const model = getGeminiModel({
    temperature: 0.25,
    maxTokens: 900,
  });

  const prompt = `
You are ScaleScope's startup ecosystem advisor for Pakistan and emerging markets.
Use the research principles below:
- Do not behave like a directory. Give guided next steps.
- Explain recommendations transparently.
- Prefer complementary fit over keyword similarity.
- Reduce cold outreach by preparing users before messaging.
- Build trust through verification, proof, traction, and profile completeness.
- Students need hand-holding from idea to mentor/co-founder/MVP.
- Founders need structured path from idea to traction to investor readiness.
- Mentors need promising startups without noise.
- Investors need readiness-ranked deal flow and warm-intro logic.

Return ONLY valid JSON matching this schema:
{
  "source": "gemini",
  "confidence": 0.0,
  "headline": "one concise insight",
  "weekly_plan": [
    { "week": 1, "focus": "short focus", "actions": ["action 1", "action 2", "action 3"] }
  ],
  "match_strategy": ["specific matching instruction"],
  "mentor_gap": "what blocks mentor value",
  "investor_gap": "what blocks investor value",
  "risk_flags": ["short risk"]
}

Do not include private assumptions, medical/legal/financial guarantees, or any instruction to bypass platform connection rules.

Profile summary:
${JSON.stringify(summary)}

Phase 1 signals:
${JSON.stringify(signals)}
`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  return extractJson(response.text());
}

async function cachePlan(userId, role, plan) {
  try {
    await supabase
      .from('ai_growth_plans')
      .upsert({
        user_id: userId,
        role,
        source: plan.source || 'deterministic_fallback',
        headline: plan.headline || null,
        weekly_plan: plan.weekly_plan || [],
        match_strategy: plan.match_strategy || [],
        mentor_gap: plan.mentor_gap || null,
        investor_gap: plan.investor_gap || null,
        risk_flags: plan.risk_flags || [],
        confidence: plan.confidence || null,
        generated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });
  } catch (err) {
    console.warn('AI growth plan cache skipped:', err.message);
  }
}

exports.getGrowthPlan = async (userId, signals = {}) => {
  const bundle = await fetchUserProfileBundle(userId);
  const summary = compactProfileSummary(bundle);
  const fallback = fallbackPlan(summary);

  try {
    const aiPlan = await generateAiPlan(summary, signals);
    if (!aiPlan) {
      const plan = { ...fallback, ai_enabled: false, profile_summary: summary };
      await cachePlan(userId, summary.role, plan);
      return plan;
    }

    const plan = {
      ...normalizePlan(aiPlan, fallback),
      source: 'gemini',
      ai_enabled: true,
      profile_summary: summary,
    };

    await cachePlan(userId, summary.role, plan);
    return plan;
  } catch (err) {
    console.warn('Growth plan AI fallback:', err.message);
    const plan = {
      ...fallback,
      ai_enabled: false,
      fallback_reason: 'AI plan unavailable, using deterministic guidance.',
      profile_summary: summary,
    };

    await cachePlan(userId, summary.role, plan);
    return plan;
  }
};
