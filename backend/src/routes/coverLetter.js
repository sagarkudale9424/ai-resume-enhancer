import express from 'express';
import { generateCoverLetter } from '../services/groqService.js';
import { HttpError, asyncHandler } from '../lib/http.js';

const router = express.Router();
const TONES = ['professional', 'enthusiastic', 'confident', 'creative'];

router.post('/generate', asyncHandler(async (req, res) => {
  const { resumeText, jobDescription, companyName, jobTitle, tone } = req.body;
  if (!resumeText?.trim() || !jobDescription?.trim()) throw new HttpError(400, 'Resume and job description are required');
  const data = await generateCoverLetter({
    resumeText: String(resumeText),
    jobDescription: String(jobDescription),
    companyName: String(companyName || '').slice(0, 120),
    jobTitle: String(jobTitle || '').slice(0, 120),
    tone: TONES.includes(tone) ? tone : 'professional',
  });
  res.json({ success: true, data });
}));

export default router;
