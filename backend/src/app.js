const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const pinoHttp = require('pino-http');
require('dotenv').config();

const { corsOptions, allowedOrigins } = require('./config/cors');
const { setupSocket } = require('./config/socket');

const cofounderRoutes = require('./routes/cofounder.routes');
const connectionRoutes = require('./routes/connection.routes');
const conversationRoutes = require('./routes/conversation.routes');
const opportunityRoutes = require('./routes/opportunity.routes');
const meetingRoutes = require('./routes/meeting.routes');
const growthRoutes = require('./routes/growth.routes');

const app = express();
const server = http.createServer(app);
const jsonLimit = process.env.JSON_BODY_LIMIT || '1mb';

function createApiRateLimiter({
  windowMs = Number(process.env.API_RATE_LIMIT_WINDOW_MS || 60 * 1000),
  max = Number(process.env.API_RATE_LIMIT_MAX || 120),
} = {}) {
  const hits = new Map();

  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip || req.headers['x-forwarded-for'] || 'unknown';
    const bucket = (hits.get(key) || []).filter((ts) => now - ts < windowMs);

    if (bucket.length >= max) {
      return res.status(429).json({
        error: 'Too many requests. Please wait and try again.',
      });
    }

    bucket.push(now);
    hits.set(key, bucket);

    if (hits.size > 10000) {
      for (const [entryKey, timestamps] of hits.entries()) {
        const active = timestamps.filter((ts) => now - ts < windowMs);
        if (active.length) hits.set(entryKey, active);
        else hits.delete(entryKey);
      }
    }

    return next();
  };
}

// Trust proxy for Render / reverse proxies
app.set('trust proxy', 1);

// Security middleware
app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: 'cross-origin',
    },
  })
);

// CORS
app.use(cors(corsOptions));

if (process.env.NODE_ENV !== 'production') {
  console.log('Allowed CORS origins:', allowedOrigins);
  console.log('FRONTEND_URL:', process.env.FRONTEND_URL);
}

// Body parser
app.use(express.json({ limit: jsonLimit }));

// Logger
app.use(
  pinoHttp({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  })
);

// Health check
app.get('/health', (req, res) => {
  res.json({
    ok: true,
    service: 'ScaleScope API',
    environment: process.env.NODE_ENV || 'development',
    time: new Date().toISOString(),
  });
});

app.use('/api', createApiRateLimiter());

// API routes
app.use('/api/cofounders', cofounderRoutes);
app.use('/api/connections', connectionRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/opportunities', opportunityRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/growth', growthRoutes);

// Not found handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Route not found',
    path: req.originalUrl,
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);

  if (err.message?.startsWith('Not allowed by CORS')) {
    return res.status(403).json({
      error: 'CORS blocked',
      message: err.message,
    });
  }

  return res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message || 'Internal server error',
  });
});

// Setup Socket.IO
setupSocket(server);

// Start server
const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
  console.log('Socket.IO ready');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down...');

  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('Interrupted. Shutting down...');

  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
