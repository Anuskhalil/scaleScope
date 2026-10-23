const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../src/pages/EarlyStageFounderRolePages/FounderProfile.jsx'), 'utf8');
const start = source.indexOf("      if (key === 'metadata' && value.founder_background");
const end = source.indexOf('      return { ...prev, [key]: value };', start);
const transition = new Function('prev', 'value', 'savedProfileRef', 'makeEmpty', 'const key = "metadata";\n' + source.slice(start, end) + '\nreturn prev;');
for (const background of ['student', 'professional']) {
  const other = background === 'student' ? 'professional' : 'student';
  const saved = { full_name: 'Founder', email: 'test@example.com', bio: 'Saved biography', company_name: 'Saved startup', metadata: { founder_background: background } };
  saved.linkedin_url = 'https://www.linkedin.com/in/test-founder';
  saved.github_url = 'https://github.com/test-founder';
  const ref = { current: saved };
  const empty = () => ({ bio: '', company_name: '', metadata: {} });
  const switched = transition(saved, { founder_background: other }, ref, empty);
  assert.equal(switched.bio, '');
  assert.equal(switched.company_name, '');
  assert.equal(switched.linkedin_url, saved.linkedin_url);
  assert.equal(switched.github_url, saved.github_url);
  const restored = transition({ ...switched, bio: 'Unsaved other background' }, { founder_background: background }, ref, empty);
  assert.equal(restored.bio, 'Saved biography');
  assert.equal(restored.company_name, 'Saved startup');
  assert.equal(restored.linkedin_url, saved.linkedin_url);
  assert.equal(restored.github_url, saved.github_url);
  assert.equal(ref.current, saved);
}
console.log('PASS: saved Student and Professional profiles restore after switching back; alternative background starts empty.');
