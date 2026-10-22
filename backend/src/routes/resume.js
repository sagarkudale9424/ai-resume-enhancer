import express from 'express';
import { enhanceResume, analyzeResumeForRAG, analyzeATSScore } from '../services/groqService.js';
import { indexResume } from '../services/ragService.js';
import { upload, extractPdfText } from '../lib/pdf.js';
import { HttpError, asyncHandler } from '../lib/http.js';

const router = express.Router();

// Text handed back to the browser so the other tools (cover letter, interview, coach) get the whole resume
const MAX_RESUME_TEXT = 12000;

async function readPdf(file) {
  if (!file) throw new HttpError(400, 'No file uploaded');
  if (file.mimetype !== 'application/pdf') throw new HttpError(400, 'Please upload a PDF file');
  const text = await extractPdfText(file);
  if (!text || text.trim().length < 50) {
    throw new HttpError(400, 'Could not extract text from this PDF. Make sure it is not a scanned image.');
  }
  return text.trim();
}

// Index for the AI Coach's RAG mode; never let indexing break the main request
const indexQuietly = (sessionId, text, meta) => (sessionId ? indexResume(sessionId, text, meta).catch(() => null) : null);

router.post('/enhance', asyncHandler(async (req, res) => {
  const { resumeContent, jobDescription } = req.body;
  if (!resumeContent?.trim() || !jobDescription?.trim()) throw new HttpError(400, 'Resume content and job description are required');
  const result = await enhanceResume(String(resumeContent), String(jobDescription));
  res.json({ success: true, data: result });
}));

// Upload a PDF and get a full ATS report
router.post('/ats-check', upload.single('resume'), asyncHandler(async (req, res) => {
  const { jobDescription, sessionId } = req.body;
  const resumeText = await readPdf(req.file);
  const [report] = await Promise.all([
    analyzeATSScore(resumeText, jobDescription || ''),
    indexQuietly(sessionId, resumeText),
  ]);
  res.json({ success: true, data: { ...report, resumeText: resumeText.slice(0, MAX_RESUME_TEXT) } });
}));

// ATS report for resume text (used by the Resume Builder)
router.post('/ats-text', asyncHandler(async (req, res) => {
  const { resumeText, jobDescription } = req.body;
  if (!resumeText || String(resumeText).trim().length < 50) {
    throw new HttpError(400, 'Add more content to your resume before running the ATS check');
  }
  const result = await analyzeATSScore(String(resumeText), jobDescription || '');
  res.json({ success: true, data: result });
}));

// Upload a PDF resume and index it for RAG
router.post('/upload', upload.single('resume'), asyncHandler(async (req, res) => {
  const resumeText = await readPdf(req.file);
  const [analysis, indexResult] = await Promise.all([
    analyzeResumeForRAG(resumeText),
    indexQuietly(req.body.sessionId, resumeText, { filename: req.file.originalname }),
  ]);
  res.json({ success: true, data: { analysis, indexResult, rawText: resumeText.slice(0, MAX_RESUME_TEXT) } });
}));

// Analyze resume text and index it for RAG
router.post('/analyze', asyncHandler(async (req, res) => {
  const { resumeText, sessionId } = req.body;
  if (!resumeText?.trim()) throw new HttpError(400, 'resumeText is required');
  const [analysis, indexResult] = await Promise.all([
    analyzeResumeForRAG(String(resumeText)),
    indexQuietly(sessionId, String(resumeText)),
  ]);
  res.json({ success: true, data: { analysis, indexResult } });
}));

export default router;
