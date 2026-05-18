const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const pinoHttp = require('pino-http');
require('dotenv').config();

const { setupSocket } = require('./config/socket');
const cofounderRoutes = require('./routes/cofounder.routes');
const connectionRoutes = require('./routes/connection.routes');
const conversationRoutes = require('./routes/conversation.routes');

const app = express();
const server = http.createServer(app);

// 🔒 Security middleware
app.use(helmet());
const allowedOrigins = [
  'http://localhost:5173',
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(pinoHttp({ level: process.env.NODE_ENV === 'production' ? 'info' : 'debug' }));

// 🛣️ Routes
app.use('/api/cofounders', cofounderRoutes);
app.use('/api/connections', connectionRoutes);
app.use('/api/conversations', conversationRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    ok: true,
    service: 'ScaleScope API',
    time: new Date().toISOString(),
  });
});

// 🔌 Setup Socket.IO
setupSocket(server);

// 🚀 Start server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`✅ Backend running on http://localhost:${PORT}`);
  console.log(`🔌 Socket.IO ready`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Shutting down...');
  server.close(() => {
    process.exit(0);
  });
});