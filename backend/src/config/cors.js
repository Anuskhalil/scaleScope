const envOrigins = [
  process.env.FRONTEND_URL,
  ...(process.env.FRONTEND_URLS || '').split(','),
];

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://scale-scope-nine.vercel.app',
  'https://scale-scope-git-main-anushkhalils-projects.vercel.app',
  ...envOrigins,
]
  .map((origin) => origin?.trim())
  .filter(Boolean)
  .map((origin) => origin.replace(/\/$/, ''));

const uniqueAllowedOrigins = [...new Set(allowedOrigins)];

const allowedOriginPatterns = [
  /^https:\/\/scale-scope(?:-[a-z0-9-]+)?\.vercel\.app$/i,
  /^https:\/\/scale-scope-git-[a-z0-9-]+-anushkhalils-projects\.vercel\.app$/i,
];

function isOriginAllowed(origin) {
  if (!origin) return true;

  const cleanOrigin = origin.replace(/\/$/, '');

  return (
    uniqueAllowedOrigins.includes(cleanOrigin) ||
    allowedOriginPatterns.some((pattern) => pattern.test(cleanOrigin))
  );
}

const corsOptions = {
  origin(origin, callback) {
    if (isOriginAllowed(origin)) {
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
  allowedOriginPatterns,
  corsOptions,
  isOriginAllowed,
};
