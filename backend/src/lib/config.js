const isProd = process.env.NODE_ENV === 'production';
const DEV_JWT_SECRET = 'dev-only-insecure-secret';

// Fail fast on missing configuration instead of breaking on the first request
export function checkConfig() {
  const missing = ['GROQ_API_KEY', 'MONGODB_URI'].filter(key => !process.env[key]);
  if (isProd && !process.env.JWT_SECRET) missing.push('JWT_SECRET');
  if (missing.length) {
    throw new Error(`Missing environment variables: ${missing.join(', ')}. See backend/.env.example.`);
  }
  if (!process.env.JWT_SECRET) console.warn('JWT_SECRET is not set — using an insecure development secret.');
  if (!process.env.GOOGLE_CLIENT_ID) console.warn('GOOGLE_CLIENT_ID is not set — "Continue with Google" is disabled.');
}

export const config = {
  isProd,
  get jwtSecret() { return process.env.JWT_SECRET || DEV_JWT_SECRET; },
  get googleClientId() { return process.env.GOOGLE_CLIENT_ID || ''; },
  // Comma-separated list of allowed frontend origins; empty allows all
  get clientOrigins() { return (process.env.CLIENT_URL || '').split(',').map(s => s.trim()).filter(Boolean); },
};
