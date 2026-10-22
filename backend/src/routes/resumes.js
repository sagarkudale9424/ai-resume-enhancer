import express from 'express';
import crypto from 'node:crypto';
import { getDB } from '../lib/db.js';
import { authMiddleware } from './auth.js';
import { writeResumeSection, parseResumeForBuilder, generateResume, tailorResume } from '../services/groqService.js';
import { upload, extractPdfText } from '../lib/pdf.js';
import { HttpError, asyncHandler, toObjectId } from '../lib/http.js';

const router = express.Router();
const MAX_RESUME_BYTES = 500 * 1024;

// AI helper for the resume builder (no login needed)
router.post('/ai', asyncHandler(async (req, res) => {
  const { action, content, context } = req.body;
  if (!['summary', 'bullets', 'skills'].includes(action)) throw new HttpError(400, 'action must be summary, bullets or skills');
  const text = await writeResumeSection(action, String(content || ''), context && typeof context === 'object' ? context : {});
  res.json({ success: true, data: { text } });
}));

// Turn an uploaded PDF into Resume Builder data
router.post('/import', upload.single('resume'), asyncHandler(async (req, res) => {
  if (!req.file) throw new HttpError(400, 'No file uploaded');
  if (req.file.mimetype !== 'application/pdf') throw new HttpError(400, 'Please upload a PDF file');
  const text = await extractPdfText(req.file);
  if (!text || text.trim().length < 50) throw new HttpError(400, 'Could not read text from this PDF. Make sure it is not a scanned image.');
  const data = await parseResumeForBuilder(text);
  res.json({ success: true, data });
}));

// Full first draft from a short questionnaire
router.post('/generate', asyncHandler(async (req, res) => {
  const { targetRole, level, skills, background, education } = req.body;
  if (!String(targetRole || '').trim()) throw new HttpError(400, 'Tell us the role you are targeting');
  if (String(background || '').trim().length < 20) throw new HttpError(400, 'Write a few lines about your experience or projects (at least 20 characters)');
  const data = await generateResume({ targetRole, level, skills, background, education });
  res.json({ success: true, data });
}));

// Rewrite an existing resume's summary, bullets and skills for a job description
router.post('/tailor', asyncHandler(async (req, res) => {
  const { resume, jobDescription } = req.body;
  if (!resume || typeof resume !== 'object') throw new HttpError(400, 'resume is required');
  if (String(jobDescription || '').trim().length < 30) throw new HttpError(400, 'Paste the full job description first');
  const data = await tailorResume(resume, String(jobDescription));
  res.json({ success: true, data });
}));

router.use(authMiddleware);

const own = req => ({ _id: toObjectId(req.params.id, 'resume id'), userId: toObjectId(req.user.userId, 'user') });

// Strip fields the client must not set and reject oversized documents
function resumeBody(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new HttpError(400, 'Invalid resume');
  const { _id, userId, createdAt, updatedAt, shareId, ...resume } = body;
  if (Buffer.byteLength(JSON.stringify(resume)) > MAX_RESUME_BYTES) throw new HttpError(413, 'Resume is too large');
  if (resume.title !== undefined) resume.title = String(resume.title).slice(0, 200);
  if (resume.readiness !== undefined) resume.readiness = Math.max(0, Math.min(100, Number(resume.readiness) || 0));
  return resume;
}

// List saved resumes (without the full content)
router.get('/', asyncHandler(async (req, res) => {
  const db = await getDB();
  const resumes = await db.collection('resumes')
    .find({ userId: toObjectId(req.user.userId, 'user') }, { projection: { title: 1, template: 1, readiness: 1, shareId: 1, updatedAt: 1 } })
    .sort({ updatedAt: -1 })
    .limit(200)
    .toArray();
  res.json({ success: true, data: resumes });
}));

router.get('/:id', asyncHandler(async (req, res) => {
  const filter = own(req);
  const db = await getDB();
  const resume = await db.collection('resumes').findOne(filter);
  if (!resume) throw new HttpError(404, 'Resume not found');
  res.json({ success: true, data: resume });
}));

router.post('/', asyncHandler(async (req, res) => {
  const resume = resumeBody(req.body);
  const now = new Date();
  const db = await getDB();
  const result = await db.collection('resumes').insertOne({
    ...resume,
    title: resume.title || 'Untitled Resume',
    userId: toObjectId(req.user.userId, 'user'),
    createdAt: now,
    updatedAt: now,
  });
  res.json({ success: true, data: { _id: result.insertedId } });
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const resume = resumeBody(req.body);
  const filter = own(req);
  const db = await getDB();
  const result = await db.collection('resumes').updateOne(filter, { $set: { ...resume, updatedAt: new Date() } });
  if (!result.matchedCount) throw new HttpError(404, 'Resume not found');
  res.json({ success: true });
}));

// Turn a public read-only link on or off
router.put('/:id/share', asyncHandler(async (req, res) => {
  const filter = own(req);
  const enabled = Boolean(req.body.enabled);
  const shareId = enabled ? crypto.randomBytes(9).toString('base64url') : null;
  const db = await getDB();
  const update = enabled ? { $set: { shareId } } : { $set: { shareId: null } };
  const result = await db.collection('resumes').updateOne(filter, update);
  if (!result.matchedCount) throw new HttpError(404, 'Resume not found');
  res.json({ success: true, data: { shareId } });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const filter = own(req);
  const db = await getDB();
  const result = await db.collection('resumes').deleteOne(filter);
  if (!result.deletedCount) throw new HttpError(404, 'Resume not found');
  res.json({ success: true });
}));

export default router;
