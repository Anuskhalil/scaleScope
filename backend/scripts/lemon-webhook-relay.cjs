const http = require('node:http');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const env = require('dotenv').parse(fs.readFileSync(path.join(__dirname, '../.env')));
if (env.LEMONSQUEEZY_TEST_MODE === 'false' || !env.LEMONSQUEEZY_WEBHOOK_SECRET) throw new Error('Test webhook configuration required');
const server = http.createServer(async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST' || req.url !== '/api/billing/webhook') { res.writeHead(404).end(); return; }
  const signature = req.headers['x-signature'];
  if (!/^[a-f0-9]{64}$/i.test(signature || '')) { res.writeHead(401).end(); return; }
  const chunks = []; let size = 0;
  try {
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 1048576) { res.writeHead(413).end(); return; }
      chunks.push(chunk);
    }
    const body = Buffer.concat(chunks);
    const digest = crypto.createHmac('sha256', env.LEMONSQUEEZY_WEBHOOK_SECRET).update(body).digest();
    if (!crypto.timingSafeEqual(digest, Buffer.from(signature, 'hex'))) { res.writeHead(401).end(); return; }
    if (JSON.parse(body).meta?.test_mode !== true) { res.writeHead(403).end(); return; }
    const response = await fetch('http://127.0.0.1:3001/api/billing/webhook', {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(25000),
      headers: { 'Content-Type': 'application/json', 'X-Signature': signature }, body,
    });
    console.log(JSON.stringify({ time: new Date().toISOString(), status: response.status }));
    res.writeHead(response.status).end(response.ok ? 'Accepted' : 'Webhook processing failed');
  } catch { if (!res.headersSent) res.writeHead(502); res.end(); }
});
server.requestTimeout = 30000;
server.headersTimeout = 10000;
server.listen(3032, '127.0.0.1', () => console.log('Test-only webhook relay listening on 127.0.0.1:3032'));
