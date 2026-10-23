const test = require('node:test');
const assert = require('node:assert/strict');
const { scoreFounderMatch } = require('../src/services/founderMatchScore');

test('empty profiles do not gain points from two missing commitments', () => {
  assert.equal(scoreFounderMatch({}, {}).matchScore, 0);
});
test('complementary skills rank above a duplicate skill set', () => {
  const viewer = { founder_skills: ['Engineering'], skills_needed: ['Sales'], industry: 'SaaS' };
  const complement = scoreFounderMatch(viewer, { founder_skills: ['Sales'], industry: 'SaaS' });
  const duplicate = scoreFounderMatch(viewer, { founder_skills: ['Engineering'], industry: 'SaaS' });
  assert.ok(complement.matchScore > duplicate.matchScore);
});
test('score is bounded and handles null skill arrays', () => {
  assert.equal(scoreFounderMatch({ skills_needed: null }, { founder_skills: null }).matchScore, 0);
  const profile = { skills_needed: ['a', 'b', 'c'], industry: 'SaaS', commitment_level: 'Full time' };
  const score = scoreFounderMatch(profile, { founder_skills: ['a', 'b', 'c', 'd'], industry: 'saas', commitment_level: 'Full time' });
  assert.equal(score.matchScore, 100);
});
