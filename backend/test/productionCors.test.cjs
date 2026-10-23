const { test } = require('node:test');
const assert = require('node:assert/strict');

test('production CORS accepts only explicitly configured origins', () => {
  const keys = ['NODE_ENV', 'FRONTEND_URL', 'FRONTEND_URLS', 'SCALESCOPE_STAGING'];
  const prior = keys.map(key => process.env[key]);
  const modulePath = require.resolve('../src/config/cors');
  try {
    Object.assign(process.env, { NODE_ENV: 'production', FRONTEND_URL: 'https://example.com', FRONTEND_URLS: 'https://app.example.com', SCALESCOPE_STAGING: 'false' });
    delete require.cache[modulePath];
    const { isOriginAllowed } = require(modulePath);
    assert.equal(isOriginAllowed('https://example.com'), true);
    assert.equal(isOriginAllowed('https://app.example.com'), true);
    for (const origin of ['http://localhost:5173', 'https://scale-scope-attacker.vercel.app', 'https://example.com.evil.invalid']) assert.equal(isOriginAllowed(origin), false);
    assert.equal(isOriginAllowed(undefined), true); // Server webhooks still require authentication/signatures.
  } finally {
    keys.forEach((key, i) => { if (prior[i] === undefined) delete process.env[key]; else process.env[key] = prior[i]; });
    delete require.cache[modulePath];
  }
});
