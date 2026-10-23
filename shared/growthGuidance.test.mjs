import test from 'node:test';
import assert from 'node:assert/strict';
import { getGrowthGuidance, stageOf, applyActionOrder } from './growthGuidance.mjs';
const founder = { company_name: 'Example', industry: 'EdTech', startup_stage: 'Building MVP',
  problem_statement: 'Students cannot find suitable project collaborators.',
  solution_description: 'A platform for complementary founder matching.',
  target_market: 'University founders', founder_skills: ['Code','Design','Sales'],
  looking_for: ['Investor'], metadata: { fundraising_status: 'planning' } };
const input = { role: 'early-stage-founder', profile: { bio: 'I am building a startup with my team.', location: 'Karachi' }, founderProfile: founder };
test('uses real solution_description and current fields', () => {
  const s = getGrowthGuidance(input);
  assert.equal(s.clarity.score, 100);
  assert.equal(s.clarity.checks.some(c => /help|legal|traction/.test(c.id)), false);
  assert(s.actions.some(a => a.id === 'mvp-test'));
  assert(s.actions.some(a => a.id === 'funding-ask'));
  assert.equal(s.actions.some(a => /mentor|cofounder/.test(a.id)), false);
});
test('null and unsupported roles are safe', () => {
  assert.equal(getGrowthGuidance({ role: 'mentor' }), null);
  const s = getGrowthGuidance({ role: 'early-stage-founder', founderProfile: null, profile: null });
  assert.equal(s.stageKey, 'unknown');
  assert.equal(s.actions[0].id, 'clarify');
});
test('all supported stages select relevant guidance', () => {
  for (const [name, expected] of [['Just an idea','idea'],['Problem validated','validation'],['Building MVP','building'],['MVP Built','mvp'],['Live Product','live'],['Growing','live'],['Generating revenue','revenue']]) assert.equal(stageOf(name), expected);
  for (const stage of ['Just an idea','Problem validated']) {
    const s = getGrowthGuidance({ ...input, founderProfile: { ...founder, startup_stage: stage } });
    assert(s.actions.some(a => a.id === 'interviews'));
    assert.equal(s.actions.some(a => a.id === 'retention'), false);
  }
});
test('goal-specific actions and no fundraising when not raising', () => {
  const s = getGrowthGuidance({ ...input, founderProfile: { ...founder, looking_for: ['Co-Founder','Investor'], metadata: { fundraising_status: 'not_raising' } } });
  assert(s.actions.some(a => a.id === 'cofounder-needs'));
  assert.equal(s.actions.some(a => /funding|investor/.test(a.id)), false);
  assert(s.actions.every(a => a.status === 'suggested'));
});
test('invalid/zero check ranges are not treated as investment fit', () => {
  for (const values of [[20,10],['',10],[0,0]]) {
    const s = getGrowthGuidance({ ...input, founderProfile: { ...founder, metadata: { funding_currency: 'USD', desired_check_min: values[0], desired_check_max: values[1] } } });
    assert(s.actions.some(a => a.id === 'funding-ask'));
  }
});
test('investor guidance does not demand a firm for an angel', () => {
  const s = getGrowthGuidance({ role:'investor', investorProfile:{investor_type:'Angel', accepting_pitches:false} });
  assert(s.actions.some(a=>a.id==='pitch-status'));
  assert.equal(s.clarity.checks.some(c=>c.id==='firm'),false);
  assert.equal(s.evidence.find(e=>e.label==='Investor verification').status,'Not confirmed');
});
test('AI cannot invent IDs, remove actions or alter high priority', () => {
  const s=getGrowthGuidance({role:'early-stage-founder'});
  assert.equal(applyActionOrder(s,['invented']),null);
  assert.equal(applyActionOrder(s,s.actions.map(()=>s.actions[0].id)),null);
  const ordered=applyActionOrder(s,s.actions.map(a=>a.id).reverse());
  assert.equal(ordered.actions[0].id,'clarify');
  assert.equal(ordered.clarity.score,s.clarity.score);
  assert.deepEqual([...ordered.actions].sort((a,b)=>a.id.localeCompare(b.id)),[...s.actions].sort((a,b)=>a.id.localeCompare(b.id)));
});
test('self-reported metrics never become verified or investor ready', () => {
  const s=getGrowthGuidance({...input,founderProfile:{...founder,monthly_revenue:100000,customer_validation:'We spoke to customers',pitch_deck_url:'https://example.com'}});
  assert.equal(s.evidence[0].status,'Self-reported');
  assert.equal(JSON.stringify(s).includes('Investor ready'),false);
  assert.equal(JSON.stringify(s).includes('High-trust'),false);
});

