const strings = value => Array.isArray(value) ? value.filter(item => typeof item === 'string').map(item => item.trim().toLowerCase()).filter(Boolean) : [];

function canMatchCofounders(viewer = {}, candidate = {}) {
  const intent = value => value.metadata?.founder_intent || 'building';
  const joining = value => intent(value) === 'joining' || value.metadata?.open_to_joining === true;
  const recruiting = value => intent(value) === 'building' && (value.looking_for || []).includes('Co-Founder');
  return (recruiting(viewer) && joining(candidate)) || (joining(viewer) && recruiting(candidate));
}

function scoreFounderMatch(viewer, candidate) {
  const needs = strings(viewer.skills_needed);
  const skills = strings(candidate.founder_skills);
  const ownSkills = strings(viewer.founder_skills);
  const complementary = skills.filter(skill => !ownSkills.includes(skill));
  const matchingNeeds = needs.filter(need => skills.includes(need));
  let score = Math.min(40, matchingNeeds.length * 20);
  const reasons = [];
  if (matchingNeeds.length) reasons.push('Skills match your team requirements');
  score += Math.min(20, complementary.length * 5);
  if (complementary.length) reasons.push('Adds complementary skills');
  if (viewer.industry && candidate.industry && viewer.industry.toLowerCase() === candidate.industry.toLowerCase()) {
    score += 20;
    reasons.push('Shared industry focus');
  }
  if (viewer.commitment_level && viewer.commitment_level === candidate.commitment_level) {
    score += 20;
    reasons.push('Aligned working commitment');
  }
  return { matchScore: Math.min(100, score), reasons };
}
module.exports = { scoreFounderMatch, canMatchCofounders };
