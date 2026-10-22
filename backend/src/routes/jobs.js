import express from 'express';
import { getDB } from '../lib/db.js';
import { authMiddleware } from './auth.js';
import { HttpError, asyncHandler, toObjectId } from '../lib/http.js';

const router = express.Router();
router.use(authMiddleware);

export const JOB_STATUSES = ['wishlist', 'applied', 'interview', 'offer', 'rejected'];
const TEXT_FIELDS = { company: 120, role: 120, location: 120, link: 500, salary: 60, notes: 5000, resumeId: 40, appliedOn: 20, followUpOn: 20 };

// Only known fields, trimmed to sane lengths
function jobBody(body, partial = false) {
  const job = {};
  for (const [field, max] of Object.entries(TEXT_FIELDS)) {
    if (body[field] !== undefined) job[field] = String(body[field] ?? '').trim().slice(0, max);
  }
  if (body.status !== undefined) {
    if (!JOB_STATUSES.includes(body.status)) throw new HttpError(400, `status must be one of ${JOB_STATUSES.join(', ')}`);
    job.status = body.status;
  }
  if (!partial) {
    if (!job.company || !job.role) throw new HttpError(400, 'Company and role are required');
    job.status = job.status || 'wishlist';
  }
  if (partial && (job.company === '' || job.role === '')) throw new HttpError(400, 'Company and role cannot be empty');
  return job;
}

const owner = req => toObjectId(req.user.userId, 'user');

router.get('/', asyncHandler(async (req, res) => {
  const userId = owner(req);
  const db = await getDB();
  const jobs = await db.collection('jobs').find({ userId }).sort({ updatedAt: -1 }).limit(500).toArray();
  res.json({ success: true, data: jobs });
}));

router.post('/', asyncHandler(async (req, res) => {
  const job = jobBody(req.body);
  const userId = owner(req);
  const now = new Date();
  const db = await getDB();
  const doc = { ...job, userId, createdAt: now, updatedAt: now };
  const result = await db.collection('jobs').insertOne(doc);
  res.json({ success: true, data: { ...doc, _id: result.insertedId } });
}));

router.put('/:id', asyncHandler(async (req, res) => {
  const job = jobBody(req.body, true);
  const filter = { _id: toObjectId(req.params.id, 'job id'), userId: owner(req) };
  const db = await getDB();
  const updated = await db.collection('jobs').findOneAndUpdate(
    filter, { $set: { ...job, updatedAt: new Date() } }, { returnDocument: 'after' }
  );
  if (!updated) throw new HttpError(404, 'Job not found');
  res.json({ success: true, data: updated });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const filter = { _id: toObjectId(req.params.id, 'job id'), userId: owner(req) };
  const db = await getDB();
  const result = await db.collection('jobs').deleteOne(filter);
  if (!result.deletedCount) throw new HttpError(404, 'Job not found');
  res.json({ success: true });
}));

export default router;
