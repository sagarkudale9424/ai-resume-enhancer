import express from 'express';
import { generateInterviewQuestions, evaluateAnswer } from '../services/groqService.js';
import { HttpError, asyncHandler } from '../lib/http.js';

const router = express.Router();

router.post('/generate', asyncHandler(async (req, res) => {
  const { profile, jobRole } = req.body;
  if (!String(profile || '').trim()) throw new HttpError(400, 'Describe your profile or load your resume first');
  const questions = await generateInterviewQuestions(String(profile), String(jobRole || 'Software Engineer'));
  res.json({ success: true, data: questions });
}));

// Score a practice answer and suggest a stronger one
router.post('/evaluate', asyncHandler(async (req, res) => {
  const { question, answer, jobRole } = req.body;
  if (!String(question || '').trim()) throw new HttpError(400, 'question is required');
  if (String(answer || '').trim().length < 15) throw new HttpError(400, 'Write a longer answer (at least a couple of sentences)');
  const feedback = await evaluateAnswer({ question, answer, jobRole: jobRole || 'Software Engineer' });
  res.json({ success: true, data: feedback });
}));

export default router;
