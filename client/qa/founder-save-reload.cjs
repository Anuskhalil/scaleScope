const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// Exercise the real service against an in-memory Supabase query adapter.
const source = fs.readFileSync(path.join(__dirname, '../src/services/founderService.js'), 'utf8')
  .replace(/^import .*;\r?\n/gm, '')
  .replace(/import\.meta\.env/g, '({})')
  .replace(/export /g, '');
const rows = { profiles: { id: 'founder-1', full_name: 'Founder' }, founder_profiles: { user_id: 'founder-1' } };
const supabase = { from(table) {
  const query = {
    select() { return this; }, eq() { return this; },
    async maybeSingle() { return { data: { ...rows[table] }, error: null }; },
    async upsert(payload) { rows[table] = { ...rows[table], ...payload }; return { error: null }; },
  };
  return query;
} };
const service = new Function('supabase', source + '\nreturn {fetchFounderProfile, saveFounderBaseProfile, saveFounderStartupProfile};')(supabase);
(async () => {
  assert.equal((await service.fetchFounderProfile('founder-1')).founderProfile.company_name, undefined);
  await service.saveFounderBaseProfile('founder-1', { full_name: 'Founder', email: 'test@example.com', bio: 'Saved founder biography', location: 'Karachi' });
  await service.saveFounderStartupProfile('founder-1', { company_name: 'Fresh Startup', founder_skills: ['Design', 'Sales', 'Engineering'], metadata: { founder_background: 'student' } });
  const loaded = await service.fetchFounderProfile('founder-1');
  assert.equal(loaded.profile.bio, 'Saved founder biography');
  assert.equal(loaded.profile.location, 'Karachi');
  assert.equal(loaded.founderProfile.company_name, 'Fresh Startup');
  assert.equal(loaded.founderProfile.founder_skills.length, 3);
  assert.equal(loaded.founderProfile.metadata.founder_background, 'student');
  console.log('PASS: immediate save/reload returns updated base and founder data, not cached empty data.');
})().catch(error => { console.error(error); process.exitCode = 1; });
