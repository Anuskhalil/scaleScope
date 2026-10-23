export const RULE_VERSION = 'growth-v2.0';
const obj = v => v && typeof v === 'object' && !Array.isArray(v) ? v : {};
const text = v => typeof v === 'string' ? v.trim() : '';
const list = v => Array.isArray(v) ? v.filter(x => typeof x === 'string' && x.trim()) : [];
const number = v => v !== '' && v !== null && v !== undefined && Number.isFinite(Number(v)) && Number(v) >= 0;
const check = (id, label, done) => ({ id, label, done: Boolean(done) });
const score = checks => ({ checks, score: checks.length ? Math.round(checks.filter(c => c.done).length / checks.length * 100) : 0, missing: checks.filter(c => !c.done) });
export function stageOf(raw) {
  const v = text(raw).toLowerCase();
  if (/revenue/.test(v)) return 'revenue';
  if (/growing|growth|traction|live|getting users/.test(v)) return 'live';
  if (/mvp built|mvp launched/.test(v) || v === 'mvp') return 'mvp';
  if (/building|prototype|development|wireframe/.test(v)) return 'building';
  if (/validat|problem|research/.test(v)) return 'validation';
  if (/idea/.test(v)) return 'idea';
  return 'unknown';
}
const stageNames = { idea: 'Idea', validation: 'Validation', building: 'Building MVP', mvp: 'MVP built', live: 'Live product', revenue: 'Revenue', unknown: 'Stage not set' };
export function getGrowthGuidance(input = {}) {
  const p = obj(input.profile), f = obj(input.founderProfile), i = obj(input.investorProfile);
  const role = input.role || p.user_type;
  if (!['early-stage-founder', 'investor'].includes(role)) return null;
  const founder = role === 'early-stage-founder', m = obj(founder ? f.metadata : i.metadata);
  const stage = founder ? stageOf(f.startup_stage || f.company_stage) : null;
  const profilePath = founder ? '/founder/profile' : '/investor/profile';
  const goals = founder ? list(f.looking_for) : [];
  const checks = [
    check('bio', 'Clear introduction', text(p.bio).length >= 20),
    check('location', 'Location', text(p.location)),
  ];
  if (founder) checks.push(
    check('startup', 'Startup name', text(f.company_name || f.idea_title)),
    check('industry', 'Industry', text(f.industry)),
    check('stage', 'Startup stage', stage !== 'unknown'),
    check('problem', 'Problem statement', text(f.problem_statement || f.problem_solving).length >= 30),
    check('solution', 'Solution description', text(f.solution_description).length >= 20),
    check('audience', 'Target customer', text(f.target_market || f.target_audience).length >= 6),
    check('skills', 'Founder skills', list(f.founder_skills).length >= 3),
    check('goals', 'Connection goals', goals.length > 0),
  );
  else checks.push(
    check('type', 'Investor type', text(i.investor_type)),
    check('thesis', 'Investment thesis', text(i.investment_thesis || i.what_i_look_for).length >= 30),
    check('stages', 'Preferred stages', list(i.preferred_stages).length),
    check('industries', 'Preferred industries', list(i.preferred_industries).length),
    check('geography', 'Geographic focus', text(i.geography_focus)),
    check('currency', 'Check currency', text(m.check_currency)),
    check('range', 'Valid investment range', number(i.check_range_min) && number(i.check_range_max) && Number(i.check_range_max) > 0 && Number(i.check_range_max) >= Number(i.check_range_min)),
  );
  const clarity = score(checks);
  const actions = [];
  const add = (id, title, reason, outcome, to = profilePath, priority = 'medium') =>
    actions.push({ id, title, reason, outcome, to, priority, status: 'suggested' });
  if (clarity.missing.length) add('clarify', founder ? 'Clarify your founder profile' : 'Clarify your investment mandate',
    'Missing: ' + clarity.missing.slice(0, 3).map(c => c.label.toLowerCase()).join(', ') + '.',
    'Fill the missing details so matches have useful context.', profilePath, 'high');
  if (founder) {
    if (['idea','validation','unknown'].includes(stage)) add('interviews', 'Understand the customer problem',
      'Your selected stage calls for learning before scaling.',
      'Speak with a small set of target customers about recent problems and existing alternatives; summarize patterns, not just compliments.');
    else if (['building','mvp'].includes(stage)) add('mvp-test', 'Test one core workflow',
      'You are building or testing an MVP; usability and customer feedback are more useful than a revenue target.',
      'Observe target users completing one important task. Record where they struggle and one change to test next.');
    else add('retention', 'Review whether customers return',
      'Your selected stage supports measuring real usage over time.',
      'Compare returning users or repeat purchases over a consistent period. Identify why customers stop and test one improvement.');
    if (goals.includes('Co-Founder')) {
      const needs = list(f.skills_needed).length && text(f.cofounder_requirements) && (text(f.weekly_hours) || text(f.commitment_level));
      add(needs ? 'cofounder-trial' : 'cofounder-needs', needs ? 'Discuss a small co-founder trial' : 'Describe your ideal co-founder',
        needs ? 'Your skill needs and working expectations are recorded.' : 'Complementary skills and time expectations help distinguish genuine fit.',
        needs ? 'After mutual connection, agree a short trial with a clear task, time commitment and feedback conversation. Do not assume equity or partnership is agreed.' : 'Specify missing skills, expected contribution and weekly availability.',
        needs ? '/founder/find-team' : profilePath);
    }
    if (goals.includes('Investor') && m.fundraising_status !== 'not_raising') {
      const range = text(m.funding_currency) && number(m.desired_check_min) && number(m.desired_check_max) && Number(m.desired_check_max) > 0 && Number(m.desired_check_min) <= Number(m.desired_check_max);
      add(range ? 'investor-fit' : 'funding-ask', range ? 'Shortlist investors by fit' : 'Clarify your funding request',
        range ? 'A funding range is recorded; matching still depends on stage, industry and geography.' : 'A funding status, currency and realistic range make outreach easier to understand.',
        range ? 'Review preferred stages, industries and check sizes. Send a specific connection request; discuss private evidence only with consent.' : 'Set fundraising status, currency and minimum/maximum investment per investor.',
        range ? '/founder/find-investors' : profilePath);
    }
  } else {
    add('diligence', 'Review evidence before making claims',
      'Profile details and matching scores are self-reported signals, not due diligence.',
      'Compare the startup with your mandate. After connecting, request permission to review relevant evidence; clarify any inconsistencies.', '/investor/find-startups');
    if (i.accepting_pitches === false) add('pitch-status', 'Review your pitch availability',
      'Your profile currently says you are not accepting pitches.',
      'Keep your availability accurate; reopen pitches only when you can respond.');
    else add('focused-intro', 'Make your first conversation specific',
      'Useful introductions explain fit and set expectations.',
      'Shortlist relevant startups, explain your interest and agree next steps after acceptance. A connection is not an investment commitment.', '/investor/find-startups');
  }
  const updated = founder ? f.updated_at : i.updated_at;
  const age = Date.parse(updated || p.updated_at || '');
  const stale = Number.isFinite(age) && Date.now() - age > 30 * 86400000;
  if (stale) add('refresh', 'Refresh your profile details', 'Your profile was last updated over 30 days ago.', 'Confirm your stage, availability and connection goals are still current.');
  return {
    version: RULE_VERSION, role, stage: founder ? stageNames[stage] : 'Investor mandate',
    stageKey: stage, clarity, actions, updatedAt: updated || p.updated_at || null,
    evidence: founder ? [
      { label: 'Validation context', status: text(f.customer_validation) ? 'Self-reported' : 'Not recorded' },
      { label: 'Pitch / demo link', status: text(f.pitch_deck_url || f.demo_url) ? 'Link provided; not verified here' : 'Not recorded' },
    ] : [
      { label: 'Portfolio context', status: text(i.notable_investments) ? 'Self-reported' : 'Not recorded' },
      { label: 'Investor verification', status: i.is_verified === true ? 'Marked verified by platform' : 'Not confirmed' },
    ],
  };
}
// AI can reorder existing actions only; it cannot change content, scores or priority tiers.
export function applyActionOrder(signals, ids) {
  if (!Array.isArray(ids) || ids.length !== signals.actions.length || new Set(ids).size !== ids.length) return null;
  const byId = new Map(signals.actions.map(a => [a.id, a]));
  if (!ids.every(id => typeof id === 'string' && byId.has(id))) return null;
  const rank = new Map(ids.map((id, index) => [id, index]));
  return { ...signals, actions: [...signals.actions].sort((a,b) => (a.priority === 'high' ? 0 : 1) - (b.priority === 'high' ? 0 : 1) || rank.get(a.id) - rank.get(b.id)) };
}
