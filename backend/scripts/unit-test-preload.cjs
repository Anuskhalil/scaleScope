// Loaded only by the isolated unit-test runner, including child test processes.
const dotenv = require('dotenv');
dotenv.config = () => ({ parsed: {} });
process.env.SUPABASE_URL = 'https://unit-test.invalid';
process.env.SUPABASE_SERVICE_KEY = 'unit-test';
process.env.NODE_ENV = 'test';

