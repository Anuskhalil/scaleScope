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

const app = express();
const server = http.createServer(app);

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
app.options('*', cors(corsOptions));

console.log('Allowed CORS origins:', allowedOrigins);

// Body parser
app.use(express.json({ limit: '10mb' }));

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

// API routes
app.use('/api/cofounders', cofounderRoutes);
app.use('/api/connections', connectionRoutes);
app.use('/api/conversations', conversationRoutes);

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