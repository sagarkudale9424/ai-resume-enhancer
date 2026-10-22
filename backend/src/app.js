import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import resumeRoutes from './routes/resume.js';
import interviewRoutes from './routes/interview.js';
import chatRoutes from './routes/chat.js';
import ragRoutes from './routes/rag.js';
import authRoutes from './routes/auth.js';
import coverLetterRoutes from './routes/coverLetter.js';
import historyRoutes from './routes/history.js';
import resumesRoutes from './routes/resumes.js';
import jobsRoutes from './routes/jobs.js';
import publicRoutes from './routes/public.js';
import toolsRoutes from './routes/tools.js';
import { config } from './lib/config.js';
import { pingDB } from './lib/db.js';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  const origins = config.clientOrigins;
  app.use(cors({ origin: origins.length ? origins : '*' }));
  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: true, limit: '2mb' }));

  app.use('/api/', rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false }));
  // Stricter limit for login/register to slow down password guessing
  app.use(['/api/auth/login', '/api/auth/register', '/api/auth/google'],
    rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { error: 'Too many attempts. Please wait a few minutes and try again.' } }));

  // Every AI call costs money: cap them per visitor
  const aiLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false,
    message: { error: 'You are using the AI a lot right now. Please wait a few minutes and try again.' },
  });
  app.use([
    '/api/resume', '/api/interview', '/api/chat/message', '/api/rag/query', '/api/cover-letter',
    '/api/resumes/ai', '/api/resumes/import', '/api/resumes/generate', '/api/resumes/tailor', '/api/tools',
  ], (req, res, next) => (req.method === 'POST' ? aiLimiter(req, res, next) : next()));

  app.get('/api/health', async (req, res) => {
    const db = await pingDB();
    res.status(db ? 200 : 503).json({ status: db ? 'ok' : 'degraded', db: db ? 'ok' : 'unreachable' });
  });

  app.use('/api/auth', authRoutes);
  app.use('/api/resume', resumeRoutes);
  app.use('/api/interview', interviewRoutes);
  app.use('/api/chat', chatRoutes);
  app.use('/api/rag', ragRoutes);
  app.use('/api/cover-letter', coverLetterRoutes);
  app.use('/api/history', historyRoutes);
  app.use('/api/resumes', resumesRoutes);
  app.use('/api/jobs', jobsRoutes);
  app.use('/api/public', publicRoutes);
  app.use('/api/tools', toolsRoutes);

  app.use('/api', (req, res) => res.status(404).json({ error: `Not found: ${req.method} ${req.originalUrl}` }));

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
      const message = err.code === 'LIMIT_FILE_SIZE' ? 'File is too large (max 5 MB)' : err.message;
      return res.status(400).json({ error: message });
    }
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON body' });
    if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Request is too large' });

    const status = err.status && err.status < 600 ? err.status : 500;
    if (status >= 500) console.error(`${req.method} ${req.originalUrl}:`, err);
    res.status(status).json({
      error: status >= 500 && config.isProd ? 'Something went wrong on our side. Please try again.' : err.message,
    });
  });

  return app;
}
