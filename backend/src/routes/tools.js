import express from 'express';
import { linkedinProfile } from '../services/groqService.js';
import { HttpError, asyncHandler } from '../lib/http.js';

const router = express.Router();

// LinkedIn headline + About section from the user's resume
router.post('/linkedin', asyncHandler(async (req, res) => {
  const { resumeText, targetRole } = req.body;
  if (String(resumeText || '').trim().length < 50) throw new HttpError(400, 'Add your resume or profile details first');
  const data = await linkedinProfile({ resumeText: String(resumeText), targetRole: String(targetRole || '') });
  res.json({ success: true, data });
}));

export default router;
