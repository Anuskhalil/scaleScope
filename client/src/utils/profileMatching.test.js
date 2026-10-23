import test from 'node:test';
import assert from 'node:assert/strict';
import { canMatchCofounders, founderIntent, personalFounderChecks } from './founderIntent.js';
import { investmentFit, validateCheckRange } from './investmentFit.js';

const builder = { industry: 'FinTech', funding_stage: 'Seed', looking_for: ['Co-Founder'], metadata: { founder_intent: 'building', funding_currency: 'USD', desired_check_min: 25000, desired_check_max: 50000 } };
const joiner = { metadata: { founder_intent: 'joining' } };
const investor = { preferred_industries: ['FinTech'], preferred_stages: ['Seed'], check_range_min: 10000, check_range_max: 30000 };

test('legacy founders are builders, not implicitly willing to join', () => {
  assert.equal(founderIntent({}), 'building');
  assert.equal(canMatchCofounders(builder, { looking_for: ['Co-Founder'] }), false);
});
test('joining consent is reciprocal and recruiting must be explicit', () => {
  assert.equal(canMatchCofounders(builder, joiner), true);
  assert.equal(canMatchCofounders(joiner, builder), true);
  assert.equal(canMatchCofounders(joiner, joiner), false);
  assert.equal(canMatchCofounders(builder, { metadata: { founder_intent: 'exploring' } }), false);
});
test('non-building profiles do not require invented startup details', () => {
  assert.equal(personalFounderChecks(joiner).some(item => item.field === 'startup_name'), false);
});
test('investment fit compares individual checks and same currency', () => {
  assert.equal(investmentFit(builder, investor).matchScore, 100);
  const different = investmentFit(builder, { ...investor, metadata: { check_currency: 'PKR' } });
  assert.equal(different.matchScore, 70);
  assert.ok(different.unknowns.some(item => item.includes('currencies')));
});
test('profile completeness and verification do not pad fit scores', () => {
  assert.equal(investmentFit({}, { is_verified: true, profile_completion: 100 }).matchScore, 0);
});
test('closed mandates and join-only founders are not investment suggestions', () => {
  assert.equal(investmentFit(joiner, investor).eligible, false);
  assert.equal(investmentFit(builder, { ...investor, accepting_pitches: false }).eligible, false);
});
test('unknown check range is not zero and invalid ranges are rejected', () => {
  assert.ok(investmentFit({ ...builder, metadata: {} }, investor).unknowns.length);
  assert.equal(validateCheckRange('', ''), '');
  assert.notEqual(validateCheckRange(-1, 20), '');
  assert.notEqual(validateCheckRange(30, 20), '');
  assert.notEqual(validateCheckRange('bad', 20), '');
});
