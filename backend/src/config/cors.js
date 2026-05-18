const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://scale-scope-nine.vercel.app',
    process.env.FRONTEND_URL,
  ]
    .filter(Boolean)
    .map((origin) => origin.replace(/\/$/, ''));
  
  const uniqueAllowedOrigins = [...new Set(allowedOrigins)];
  
  const corsOptions = {
    origin(origin, callback) {
      if (!origin) {
        return callback(null, true);
      }
  
      const cleanOrigin = origin.replace(/\/$/, '');
  
      if (uniqueAllowedOrigins.includes(cleanOrigin)) {
        return callback(null, true);
      }
  
      return callback(new Error(`Not allowed by CORS: ${origin}`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  };
  
  module.exports = {
    allowedOrigins: uniqueAllowedOrigins,
    corsOptions,
  };