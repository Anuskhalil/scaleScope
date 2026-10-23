const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const dotenv = require('dotenv');
const { validateStaging, STAGING_URL } = require('../src/config/environment');

function buildEnvironment(values, inherited = process.env) {
  const env = {};
  const allowed = new Set(['path', 'systemroot', 'windir', 'comspec', 'temp', 'tmp', 'home', 'userprofile', 'localappdata']);
  for (const [key, value] of Object.entries(inherited)) {
    if (allowed.has(key.toLowerCase())) env[key] = value;
  }
  Object.assign(env, {
    SUPABASE_URL: values.SUPABASE_URL,
    SUPABASE_SERVICE_KEY: values.SUPABASE_SERVICE_KEY,
    PORT: values.PORT || '3031',
    SCALESCOPE_STAGING: 'true',
    NODE_ENV: 'development',
    REVIEWER_MFA_REQUIRED: values.REVIEWER_MFA_REQUIRED === 'true' ? 'true' : 'false',
    FRONTEND_URL: 'http://localhost:5174',
    PROFILE_REVIEW_AI_ENABLED: 'false',
    PASSPORT_WRITES_ENABLED: values.PASSPORT_WRITES_ENABLED ?? 'true',
    PASSPORT_REVIEW_METADATA_ENABLED: values.PASSPORT_REVIEW_METADATA_ENABLED === 'true' ? 'true' : 'false',
    ADMIN_REVIEW_EMAILS: values.STAGING_TEST_REVIEWER === 'true' ? 'passport-reviewer@example.invalid' : '',
  });
  validateStaging(env);
  return env;
}

if (require.main === module) {
  try {
    const root = path.resolve(__dirname, '..');
    const env = buildEnvironment(dotenv.parse(fs.readFileSync(path.join(root, '.env.staging'))));
    console.log(`STAGING ONLY | ${STAGING_URL} | http://127.0.0.1:${env.PORT}`);
    console.log('AI workers, automatic replies, billing and meetings are disabled.');
    const child = spawn(process.execPath, [path.join(root, 'src/app.js')], { cwd: root, env, stdio: 'inherit' });
    child.on('error', () => { console.error('Unable to start staging backend.'); process.exitCode = 1; });
    child.on('exit', code => { process.exitCode = code ?? 1; });
    for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
  } catch (error) {
    console.error(`Staging launch refused: ${error.message}`);
    process.exitCode = 1;
  }
}
module.exports = { buildEnvironment };
