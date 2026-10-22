import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import { getDB } from '../lib/db.js';
import { config } from '../lib/config.js';
import { HttpError, asyncHandler, toObjectId } from '../lib/http.js';

const router = express.Router();
const googleClient = new OAuth2Client();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const normalizeEmail = email => String(email || '').trim().toLowerCase();

function issueToken(user) {
  return jwt.sign({ userId: user._id, email: user.email, name: user.name }, config.jwtSecret, { expiresIn: '7d' });
}

function authResponse(user) {
  return {
    success: true,
    token: issueToken(user),
    user: { name: user.name, email: user.email, id: user._id, avatar: user.avatar || '' },
  };
}

export function authMiddleware(req, res, next) {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) return res.status(401).json({ error: 'Please sign in to continue' });
  try {
    req.user = jwt.verify(token, config.jwtSecret);
    next();
  } catch (err) {
    const message = err.name === 'TokenExpiredError' ? 'Your session has expired. Please sign in again.' : 'Invalid session. Please sign in again.';
    res.status(401).json({ error: message });
  }
}

router.post('/register', asyncHandler(async (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password || '');
  if (!name || !email || !password) throw new HttpError(400, 'Name, email and password are required');
  if (!EMAIL_RE.test(email)) throw new HttpError(400, 'Please enter a valid email address');
  if (password.length < 6) throw new HttpError(400, 'Password must be at least 6 characters');

  const db = await getDB();
  if (await db.collection('users').findOne({ email })) throw new HttpError(409, 'Email already registered. Please sign in.');
  const hashed = await bcrypt.hash(password, 12);
  const user = { name, email, password: hashed, provider: 'email', createdAt: new Date() };
  const result = await db.collection('users').insertOne(user);
  res.json(authResponse({ ...user, _id: result.insertedId }));
}));

router.post('/login', asyncHandler(async (req, res) => {
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password || '');
  if (!email || !password) throw new HttpError(400, 'Email and password are required');

  const db = await getDB();
  // Older accounts may have been saved with the email exactly as typed
  const typed = String(req.body.email || '').trim();
  const user = await db.collection('users').findOne({ email: { $in: [...new Set([email, typed])] } });
  if (user && !user.password) throw new HttpError(400, 'This account uses Google sign-in. Please use "Continue with Google".');
  if (!user || !await bcrypt.compare(password, user.password)) throw new HttpError(401, 'Invalid email or password');
  res.json(authResponse(user));
}));

// Google Identity Services sends an ID token ("credential"); verify it with Google
// before trusting the email inside it.
router.get('/google/config', (req, res) => res.json({ clientId: config.googleClientId }));

router.post('/google', asyncHandler(async (req, res) => {
  if (!config.googleClientId) throw new HttpError(503, 'Google sign-in is not configured on the server');
  const { credential } = req.body;
  if (!credential) throw new HttpError(400, 'Missing Google credential');

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: config.googleClientId });
    payload = ticket.getPayload();
  } catch {
    throw new HttpError(401, 'Google sign-in failed. Please try again.');
  }
  if (!payload?.email || !payload.email_verified) throw new HttpError(401, 'Your Google email is not verified');

  const email = normalizeEmail(payload.email);
  const db = await getDB();
  const users = db.collection('users');
  let user = await users.findOne({ email });
  if (user) {
    const updates = { googleId: payload.sub, avatar: user.avatar || payload.picture || '' };
    await users.updateOne({ _id: user._id }, { $set: updates });
    user = { ...user, ...updates };
  } else {
    user = {
      name: payload.name || email.split('@')[0], email, googleId: payload.sub,
      avatar: payload.picture || '', provider: 'google', createdAt: new Date(),
    };
    const result = await users.insertOne(user);
    user._id = result.insertedId;
  }
  res.json(authResponse(user));
}));

router.get('/me', authMiddleware, asyncHandler(async (req, res) => {
  const db = await getDB();
  const user = await db.collection('users').findOne(
    { _id: toObjectId(req.user.userId, 'user') },
    { projection: { password: 0 } }
  );
  if (!user) throw new HttpError(401, 'Account not found. Please sign in again.');
  res.json({ success: true, user });
}));

const PROFILE_FIELDS = ['name', 'headline', 'phone', 'location', 'linkedin', 'github', 'website', 'targetRole', 'bio', 'skills'];

router.put('/profile', authMiddleware, asyncHandler(async (req, res) => {
  const updates = {};
  for (const field of PROFILE_FIELDS) {
    if (req.body[field] === undefined) continue;
    updates[field] = field === 'skills' ? req.body[field] : String(req.body[field]).slice(0, 2000);
  }
  if (updates.name !== undefined && !updates.name.trim()) throw new HttpError(400, 'Name cannot be empty');
  if (updates.skills !== undefined) {
    if (!Array.isArray(updates.skills)) throw new HttpError(400, 'skills must be an array');
    updates.skills = updates.skills.map(s => String(s).trim()).filter(Boolean).slice(0, 100);
  }

  const db = await getDB();
  const user = await db.collection('users').findOneAndUpdate(
    { _id: toObjectId(req.user.userId, 'user') },
    { $set: { ...updates, updatedAt: new Date() } },
    { returnDocument: 'after', projection: { password: 0 } }
  );
  if (!user) throw new HttpError(404, 'User not found');
  res.json({ ...authResponse(user), profile: user });
}));

export default router;
