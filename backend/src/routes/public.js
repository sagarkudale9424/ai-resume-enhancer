import express from 'express';
import { getDB } from '../lib/db.js';
import { HttpError, asyncHandler } from '../lib/http.js';

const router = express.Router();

// Read-only view of a resume whose owner turned on its share link
router.get('/resumes/:shareId', asyncHandler(async (req, res) => {
  const shareId = String(req.params.shareId);
  if (!/^[\w-]{8,32}$/.test(shareId)) throw new HttpError(404, 'This link is invalid or has been turned off');
  const db = await getDB();
  const resume = await db.collection('resumes').findOne(
    { shareId },
    { projection: { userId: 0, shareId: 0, readiness: 0 } }
  );
  if (!resume) throw new HttpError(404, 'This link is invalid or has been turned off');
  res.json({ success: true, data: resume });
}));

export default router;
