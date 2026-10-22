import express from 'express';
import { getDB } from '../lib/db.js';
import { authMiddleware } from './auth.js';
import { HttpError, asyncHandler, toObjectId } from '../lib/http.js';

const router = express.Router();
router.use(authMiddleware);

const asList = value => (Array.isArray(value) ? value.slice(0, 100) : []);

// Save an ATS scan for the signed-in user
router.post('/save', asyncHandler(async (req, res) => {
  const { resumeName, atsScore, sectionScores, matchedKeywords, missingKeywords, suggestions } = req.body;
  const score = Number(atsScore);
  if (!Number.isFinite(score) || score < 0 || score > 100) throw new HttpError(400, 'atsScore must be a number from 0 to 100');

  const db = await getDB();
  const result = await db.collection('resume_history').insertOne({
    userId: String(req.user.userId),
    resumeName: String(resumeName || 'Untitled Resume').slice(0, 200),
    atsScore: Math.round(score),
    sectionScores: sectionScores && typeof sectionScores === 'object' ? sectionScores : {},
    matchedKeywords: asList(matchedKeywords),
    missingKeywords: asList(missingKeywords),
    suggestions: asList(suggestions),
    createdAt: new Date(),
  });
  res.json({ success: true, id: result.insertedId });
}));

// The signed-in user's recent scans
router.get('/', asyncHandler(async (req, res) => {
  const db = await getDB();
  const history = await db.collection('resume_history')
    .find({ userId: String(req.user.userId) })
    .sort({ createdAt: -1 })
    .limit(20)
    .toArray();
  res.json({ success: true, data: history });
}));

router.delete('/:id', asyncHandler(async (req, res) => {
  const filter = { _id: toObjectId(req.params.id, 'scan id'), userId: String(req.user.userId) };
  const db = await getDB();
  const result = await db.collection('resume_history').deleteOne(filter);
  if (!result.deletedCount) throw new HttpError(404, 'Scan not found');
  res.json({ success: true });
}));

export default router;
