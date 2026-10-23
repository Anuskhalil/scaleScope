const { createClient } = require('@supabase/supabase-js');
require('./environment').loadEnvironment();

module.exports = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { persistSession: false } }
);
