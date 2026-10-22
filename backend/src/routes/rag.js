import express from 'express';
import { indexResume, queryResume, clearSession } from '../services/ragService.js';
import { HttpError, asyncHandler } from '../lib/http.js';

const router = express.Router();

router.post('/index', asyncHandler(async (req, res) => {
  const { resumeText, sessionId } = req.body;
  if (!resumeText || !sessionId) throw new HttpError(400, 'resumeText and sessionId are required');
  const result = await indexResume(String(sessionId), String(resumeText).slice(0, 20000));
  res.json({ success: true, data: result });
}));

router.post('/query', asyncHandler(async (req, res) => {
  const { query, sessionId, topK } = req.body;
  if (!query || !sessionId) throw new HttpError(400, 'query and sessionId are required');
  const k = Math.min(Math.max(Number(topK) || 3, 1), 8);
  const answer = await queryResume(String(sessionId), String(query).slice(0, 2000), k);
  res.json({ success: true, data: { answer } });
}));

router.delete('/session/:sessionId', asyncHandler(async (req, res) => {
  await clearSession(req.params.sessionId);
  res.json({ success: true, message: 'Session cleared' });
}));

export default router;
