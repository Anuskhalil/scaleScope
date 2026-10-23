const test = require('node:test');
const assert = require('node:assert/strict');
const { buildEnvironment } = require('../scripts/start-staging.cjs');
const { STAGING_URL } = require('../src/config/environment');
const key = (ref, role = 'service_role') => 'test.' + Buffer.from(JSON.stringify({ ref, role })).toString('base64url') + '.fake';
const values = { SUPABASE_URL: STAGING_URL, SUPABASE_SERVICE_KEY: key('sopklyxvzmungxwgboqs') };

test('reviewer opt-in is limited to the synthetic staging identity', () => {
  assert.equal(buildEnvironment(values, { ADMIN_REVIEW_EMAILS: 'real@example.com' }).ADMIN_REVIEW_EMAILS, '');
  assert.equal(buildEnvironment({ ...values, STAGING_TEST_REVIEWER: 'true', ADMIN_REVIEW_EMAILS: 'real@example.com' }).ADMIN_REVIEW_EMAILS, 'passport-reviewer@example.invalid');
});

test('staging never inherits production credentials or Node injection options', () => {
  const result = buildEnvironment({ ...values, GEMINI_API_KEY: 'ignored', LEMONSQUEEZY_API_KEY: 'ignored' }, {
    Path: 'system path', SUPABASE_URL: 'production', GEMINI_API_KEY: 'secret', NODE_OPTIONS: '--require unsafe', PROFILE_REVIEW_AI_ENABLED: 'true',
  });
  assert.equal(result.SUPABASE_URL, STAGING_URL);
  assert.equal(result.Path, 'system path');
  assert.equal(result.NODE_OPTIONS, undefined);
  assert.equal(result.GEMINI_API_KEY, undefined);
  assert.equal(result.LEMONSQUEEZY_API_KEY, undefined);
  assert.equal(result.PROFILE_REVIEW_AI_ENABLED, 'false');
});
test('wrong project, anon key, placeholders and production port fail closed', () => {
  assert.throws(() => buildEnvironment({ ...values, SUPABASE_URL: 'https://gqkjvxcyetesvqmjkuus.supabase.co' }));
  assert.throws(() => buildEnvironment({ ...values, SUPABASE_SERVICE_KEY: key('gqkjvxcyetesvqmjkuus') }));
  assert.throws(() => buildEnvironment({ ...values, SUPABASE_SERVICE_KEY: key('sopklyxvzmungxwgboqs', 'anon') }));
  assert.throws(() => buildEnvironment({ ...values, SUPABASE_SERVICE_KEY: 'REPLACE_ME' }));
  assert.throws(() => buildEnvironment({ ...values, PORT: '3001' }));
});
