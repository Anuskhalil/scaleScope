const STAGING_URL = 'https://sopklyxvzmungxwgboqs.supabase.co';

function validateStaging(env) {
  if (env.SUPABASE_URL !== STAGING_URL) throw new Error('Staging URL mismatch. Production is forbidden.');
  let payload;
  try { payload = JSON.parse(Buffer.from(env.SUPABASE_SERVICE_KEY.split('.')[1], 'base64url').toString()); }
  catch { throw new Error('Add the staging legacy service_role JWT key to backend/.env.staging.'); }
  // Local guard only; Supabase validates the actual JWT signature on each request.
  if (payload.ref !== 'sopklyxvzmungxwgboqs' || payload.role !== 'service_role') {
    throw new Error('Key is not a service_role key for the approved staging project.');
  }
  if (!/^\d+$/.test(env.PORT || '') || Number(env.PORT) < 1024 || Number(env.PORT) > 65535 || env.PORT === '3001') {
    throw new Error('Choose a separate staging PORT (default 3031), not 3001.');
  }
}

function loadEnvironment() {
  if (process.env.SCALESCOPE_STAGING === 'true') {
    validateStaging(process.env);
    return; // Never fall back to production .env in staging mode.
  }
  require('dotenv').config();
}

module.exports = { loadEnvironment, validateStaging, STAGING_URL };
