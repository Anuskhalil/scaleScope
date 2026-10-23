import { founderIntent } from './founderIntent.js';

const list = value => Array.isArray(value) ? value.map(item => String(item).trim().toLowerCase()).filter(Boolean) : [];
const number = value => value === '' || value == null ? null : Number(value);

export function investmentFit(founder = {}, investor = {}) {
  const reasons = [];
  const unknowns = [];
  const mismatches = [];
  let score = 0;
  if (founderIntent(founder) !== 'building') mismatches.push('Not currently building a startup');
  if (founder.metadata?.fundraising_status === 'not_raising') mismatches.push('Not raising investment');
  if (investor.accepting_pitches === false) mismatches.push('Not accepting pitches');
  const industry = String(founder.industry || '').trim().toLowerCase();
  const industries = list(investor.preferred_industries);
  if (industry && industries.length) {
    if (industries.includes(industry)) { score += 40; reasons.push('Industry matches the investment mandate'); }
    else mismatches.push('Industry outside stated preferences');
  } else unknowns.push('Industry mandate incomplete');
  // Legacy preferences mix product stages and funding rounds; compare each axis separately.
  const round = String(founder.funding_stage || '').trim().toLowerCase();
  const stages = list(investor.preferred_stages);
  const product = String(founder.startup_stage || '').trim().toLowerCase();
  const rounds = stages.filter(stage => /^(pre-seed|seed|series a|series b|series b\+|series c|bootstrapped)$/.test(stage));
  const products = stages.filter(stage => !rounds.includes(stage));
  if ((round && rounds.length) || (product && products.length)) {
    if ((round && rounds.includes(round)) || (product && products.includes(product))) {
      score += 30; reasons.push(rounds.includes(round) ? 'Funding round matches' : 'Product stage matches');
    } else mismatches.push('Stage outside stated preferences');
  } else unknowns.push('Comparable stage preference incomplete');
  const min = number(founder.metadata?.desired_check_min);
  const max = number(founder.metadata?.desired_check_max);
  const investorMin = number(investor.check_range_min);
  const investorMax = number(investor.check_range_max);
  const currency = founder.metadata?.funding_currency;
  const investorCurrency = investor.metadata?.check_currency || 'USD';
  if (currency && [min, max, investorMin, investorMax].every(value => Number.isFinite(value) && value >= 0)) {
    if (currency !== investorCurrency) unknowns.push('Different currencies: check size needs review');
    else if (max >= investorMin && min <= investorMax) { score += 30; reasons.push('Individual investment check ranges overlap'); }
    else mismatches.push('Individual investment check ranges do not overlap');
  } else unknowns.push('Individual check size incomplete');
  return {
    matchScore: score,
    reasons,
    unknowns,
    mismatches,
    eligible: founderIntent(founder) === 'building' && founder.metadata?.fundraising_status !== 'not_raising' && investor.accepting_pitches !== false,
  };
}

export function validateCheckRange(minimum, maximum) {
  const min = number(minimum), max = number(maximum);
  if ([min, max].some(value => value !== null && (!Number.isFinite(value) || value < 0))) return 'Check amounts must be valid non-negative numbers.';
  if (min !== null && max !== null && min > max) return 'Minimum check cannot exceed maximum check.';
  return '';
}
