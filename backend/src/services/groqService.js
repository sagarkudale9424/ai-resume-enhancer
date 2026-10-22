import { complete } from '../lib/groq.js';
import { parseModelJSON } from '../lib/http.js';

// Keep prompts inside the model's context window
const cap = (text, n) => String(text || '').slice(0, n);
const RESUME_CHARS = 12000;
const JOB_CHARS = 6000;

const clampScore = v => Math.max(0, Math.min(100, Math.round(Number(v) || 0)));
const optionalScore = v => (v === null || v === undefined || v === '' || Number.isNaN(Number(v)) ? null : clampScore(v));
const strings = v => (Array.isArray(v) ? v.filter(x => typeof x === 'string' && x.trim()).slice(0, 30) : []);

async function chat(systemPrompt, userPrompt, jsonMode = false) {
  return complete(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    { json: jsonMode }
  );
}

export async function enhanceResume(resumeContent, jobDescription) {
  const text = await chat(
    `You are an expert ATS resume optimizer. Rewrite resume bullets with strong action verbs, quantifiable achievements, and job-aligned keywords. Always respond with valid JSON only.`,
    `Resume Content:\n${cap(resumeContent, RESUME_CHARS)}\n\nJob Description:\n${cap(jobDescription, JOB_CHARS)}\n\nReturn JSON:
{
  "enhanced_bullets": ["bullet1", "bullet2"],
  "ats_score": 85,
  "keyword_score": 78,
  "impact_score": 82,
  "matched_keywords": ["kw1", "kw2"],
  "missing_keywords": ["kw3"],
  "suggestions": ["tip1", "tip2"]
}`, true);
  const data = parseModelJSON(text);
  return {
    enhanced_bullets: strings(data.enhanced_bullets),
    // null (shown as "—") when the model leaves a score out, rather than a misleading 0%
    ats_score: optionalScore(data.ats_score),
    keyword_score: optionalScore(data.keyword_score),
    impact_score: optionalScore(data.impact_score),
    matched_keywords: strings(data.matched_keywords),
    missing_keywords: strings(data.missing_keywords),
    suggestions: strings(data.suggestions),
  };
}

export async function analyzeATSScore(resumeText, jobDescription) {
  const text = await chat(
    `You are an expert ATS (Applicant Tracking System) analyst and career coach. Analyze the resume deeply and provide detailed ATS compatibility report. Always respond with valid JSON only.`,
    `Resume:\n${cap(resumeText, RESUME_CHARS)}\n\nJob Description:\n${cap(jobDescription, JOB_CHARS) || 'General software engineering role'}\n\nAnalyze and return JSON:
{
  "candidate_name": "extracted name or Unknown",
  "overall_ats_score": 72,
  "section_scores": {
    "contact_info": 90,
    "work_experience": 75,
    "skills": 80,
    "education": 85,
    "formatting": 70,
    "keywords": 65
  },
  "matched_keywords": ["keyword1", "keyword2"],
  "missing_keywords": ["keyword3", "keyword4"],
  "skills_found": ["skill1", "skill2"],
  "experience_years": 3,
  "education_level": "Bachelor's",
  "strengths": ["strength1", "strength2", "strength3"],
  "weaknesses": ["weakness1", "weakness2"],
  "critical_fixes": ["fix1", "fix2"],
  "suggestions": ["suggestion1", "suggestion2", "suggestion3"],
  "rewritten_summary": "A powerful 2-3 sentence professional summary rewritten for ATS"
}`, true);
  const data = parseModelJSON(text);
  const sections = data.section_scores && typeof data.section_scores === 'object' ? data.section_scores : {};
  return {
    candidate_name: String(data.candidate_name || 'Unknown'),
    overall_ats_score: clampScore(data.overall_ats_score),
    section_scores: Object.fromEntries(Object.entries(sections).map(([k, v]) => [k, clampScore(v)])),
    matched_keywords: strings(data.matched_keywords),
    missing_keywords: strings(data.missing_keywords),
    skills_found: strings(data.skills_found),
    experience_years: Number(data.experience_years) || 0,
    education_level: String(data.education_level || ''),
    strengths: strings(data.strengths),
    weaknesses: strings(data.weaknesses),
    critical_fixes: strings(data.critical_fixes),
    suggestions: strings(data.suggestions),
    rewritten_summary: String(data.rewritten_summary || ''),
  };
}

export async function generateInterviewQuestions(profile, jobRole) {
  const text = await chat(
    `You are an expert interviewer. Generate personalized interview questions with detailed sample answers. Always respond with valid JSON only.`,
    `Candidate: ${cap(profile, RESUME_CHARS)}\nRole: ${cap(jobRole, 200)}\n\nReturn JSON:
{
  "technical": [{"question":"...","sample_answer":"...","key_points":["..."],"difficulty":"medium"}],
  "behavioral": [{"question":"...","sample_answer":"...","key_points":["..."],"difficulty":"easy"}],
  "situational": [{"question":"...","sample_answer":"...","key_points":["..."],"difficulty":"hard"}]
}
Give 4 questions per category.`, true);
  const data = parseModelJSON(text);
  const clean = list => (Array.isArray(list) ? list : [])
    .filter(q => q && typeof q.question === 'string')
    .map(q => ({
      question: q.question,
      sample_answer: String(q.sample_answer || ''),
      key_points: strings(q.key_points),
      difficulty: ['easy', 'medium', 'hard'].includes(q.difficulty) ? q.difficulty : 'medium',
    }));
  return { technical: clean(data.technical), behavioral: clean(data.behavioral), situational: clean(data.situational) };
}

export async function chatWithAI(messages, resumeContext = '') {
  const systemPrompt = `You are an expert career coach and interview preparation assistant.
${resumeContext ? `Candidate resume context:\n${resumeContext}\n` : ''}
Help with resume improvement, interview prep, project explanations, and career guidance. Be concise and practical.`;

  return complete([{ role: 'system', content: systemPrompt }, ...messages], {
    temperature: 0.5,
    maxTokens: 1000,
  });
}

export async function analyzeResumeForRAG(resumeText) {
  const text = await chat(
    `Extract structured information from resume. Always respond with valid JSON only.`,
    `Resume:\n${cap(resumeText, RESUME_CHARS)}\n\nReturn JSON:
{
  "name": "...",
  "skills": ["skill1"],
  "experience": [{"role":"...","company":"...","duration":"...","highlights":["..."]}],
  "projects": [{"name":"...","tech":["..."],"description":"..."}],
  "education": [{"degree":"...","institution":"...","year":"..."}],
  "summary": "2-3 sentence professional summary"
}`, true);
  return parseModelJSON(text);
}

const FALLBACK_KEY_POINTS = ['Strong technical skills', 'Relevant project experience', 'Team collaboration'];

// Rough keyword-overlap score, clamped to 45–95.
function keywordMatchScore(resumeText, jobDescription) {
  const resumeWords = new Set(resumeText.toLowerCase().split(/\W+/));
  const jobWords = jobDescription.toLowerCase().split(/\W+/).filter(w => w.length > 4);
  const matched = jobWords.filter(w => resumeWords.has(w)).length;
  return Math.min(95, Math.max(45, Math.round((matched / Math.max(jobWords.length, 1)) * 100 * 2.5)));
}

export async function generateCoverLetter({ resumeText, jobDescription, companyName, jobTitle, tone }) {
  const company = companyName || 'the company';
  const title = jobTitle || 'the position';
  const style = tone || 'professional';

  const [letterText, pointsText] = await Promise.all([
    complete(
      [
        {
          role: 'system',
          content: `You are an expert career coach. Write a ${style} cover letter. Return only the cover letter text, nothing else.`,
        },
        {
          role: 'user',
          content: `Write a cover letter for:
Company: ${company}
Job Title: ${title}
Tone: ${style}

Resume: ${cap(resumeText, 4000)}
Job Description: ${cap(jobDescription, 3000)}

Use specific achievements from the resume that match the job. Do not invent experience.

Write 3-4 paragraphs. Start with "Dear Hiring Manager," and end with "Sincerely, [Your Name]"`,
        },
      ],
      { maxTokens: 800, temperature: 0.7 }
    ),
    complete(
      [
        {
          role: 'system',
          content: 'Extract 3 key strengths from this resume for this job. Return only 3 bullet points, one per line, no numbering.',
        },
        { role: 'user', content: `Resume: ${cap(resumeText, 3000)}\nJob: ${cap(jobDescription, 2000)}` },
      ],
      { maxTokens: 200, temperature: 0.3 }
    ),
  ]);

  const coverLetter = letterText.trim();
  const keyPoints = pointsText
    .trim()
    .split('\n')
    .filter(p => p.trim())
    .slice(0, 3)
    .map(p => p.replace(/^[-•*]\s*/, '').trim());

  return {
    subject: `Application for ${title} at ${company}`,
    coverLetter,
    keyPoints: keyPoints.length > 0 ? keyPoints : FALLBACK_KEY_POINTS,
    wordCount: coverLetter.split(/\s+/).filter(Boolean).length,
    matchScore: keywordMatchScore(resumeText, jobDescription),
  };
}

const SECTION_PROMPTS = {
  summary: 'Write a 2-3 sentence professional resume summary in first person without pronouns. Use strong, specific, ATS-friendly wording.',
  bullets: 'Rewrite these resume bullet points: start each with a strong action verb, add measurable impact where plausible (do not invent specific company names), keep each under 30 words. Return 3-5 bullets.',
  skills: 'Suggest a comma-separated list of 10-15 relevant hard skills for this resume. Return only the list.',
};

export async function writeResumeSection(action, content, context) {
  const details = [
    context.title && `Target role: ${context.title}`,
    context.role && `Position: ${context.role}${context.company ? ` at ${context.company}` : ''}`,
    context.skills && `Skills: ${context.skills}`,
    context.experience && `Experience:\n${context.experience}`,
    context.jobDescription && `Tailor it to this job description:\n${String(context.jobDescription).slice(0, 1500)}`,
  ].filter(Boolean).join('\n');

  const format = action === 'bullets'
    ? 'Return only the bullet points, one per line, with no leading symbols or numbering.'
    : 'Return only the text, with no preamble or quotes.';

  const text = await complete(
    [
      { role: 'system', content: `You are an expert resume writer. ${SECTION_PROMPTS[action]} ${format}` },
      { role: 'user', content: `${details}\n\nCurrent content:\n${content.slice(0, 2000) || '(empty — write from scratch)'}` },
    ],
    { maxTokens: 600, temperature: 0.6 }
  );

  if (action !== 'bullets') return text.trim();
  return text
    .split('\n')
    .map(line => line.replace(/^\s*(?:[-•*]|\d+[.)])\s*/, '').trim())
    .filter(Boolean)
    .join('\n');
}

// --- Resume Builder ---------------------------------------------------------

const BUILDER_SHAPE = `{
  "personal": {"name":"","title":"short headline","email":"","phone":"","location":"","linkedin":"","github":"","website":""},
  "summary": "",
  "experience": [{"role":"","company":"","location":"","start":"","end":"","bullets":"one bullet per line"}],
  "education": [{"school":"","location":"","degree":"","start":"","end":"","score":"","details":"one item per line"}],
  "projects": [{"name":"","role":"","link":"","start":"","end":"","bullets":"one bullet per line","tech":"comma separated"}],
  "skills": [{"label":"group name","items":"comma separated"}],
  "certifications": "one per line",
  "achievements": "one per line"
}`;

const str = v => (typeof v === 'string' ? v : v == null ? '' : String(v));
const lines = v => (Array.isArray(v) ? v.map(str).filter(Boolean).join('\n') : str(v));
const commas = v => (Array.isArray(v) ? v.map(str).filter(Boolean).join(', ') : str(v));
const items = (list, fields) => (Array.isArray(list) ? list : []).filter(x => x && typeof x === 'object').slice(0, 15)
  .map(x => Object.fromEntries(Object.entries(fields).map(([k, fn]) => [k, fn(x[k])])));

// Coerce whatever the model returned into exactly the shape the builder expects
export function toBuilderData(data = {}) {
  const p = data.personal && typeof data.personal === 'object' ? data.personal : {};
  return {
    personal: Object.fromEntries(['name', 'title', 'email', 'phone', 'location', 'linkedin', 'github', 'website'].map(k => [k, str(p[k])])),
    summary: str(data.summary),
    experience: items(data.experience, { role: str, company: str, location: str, start: str, end: str, bullets: lines }),
    education: items(data.education, { school: str, location: str, degree: str, start: str, end: str, score: str, details: lines }),
    projects: items(data.projects, { name: str, role: str, link: str, start: str, end: str, bullets: lines, tech: commas }),
    skills: items(data.skills, { label: str, items: commas }).filter(s => s.items),
    certifications: lines(data.certifications),
    achievements: lines(data.achievements),
  };
}

// Structured data for the Resume Builder from a resume's plain text
export async function parseResumeForBuilder(resumeText) {
  const text = await chat(
    `You convert resumes into structured JSON for a resume builder. Copy the candidate's wording faithfully; do not invent facts. Use "" for anything missing. Always respond with valid JSON only.`,
    `Resume:\n${cap(resumeText, RESUME_CHARS)}\n\nReturn JSON exactly in this shape:\n${BUILDER_SHAPE}`, true);
  return toBuilderData(parseModelJSON(text));
}

// A complete first draft from a short description of the candidate
export async function generateResume({ targetRole, level, skills, background, education }) {
  const text = await complete([
    {
      role: 'system',
      content: `You generate a complete resume draft for a resume builder. Use only facts the candidate gives you; where details are missing, write realistic placeholders in [square brackets] (e.g. "[Company Name]", "[X]%") so the candidate knows to fill them in. Bullets start with strong action verbs and include measurable impact. Wrap 1-3 key terms per bullet in **double asterisks**. Always respond with valid JSON only.`,
    },
    {
      role: 'user',
      content: `Target role: ${cap(targetRole, 200)}
Experience level: ${cap(level, 50)}
Skills: ${cap(skills, 1000)}
Education: ${cap(education, 1000)}
About the candidate (experience, projects, achievements):
${cap(background, 6000)}

Return JSON exactly in this shape (personal.name/email/phone may stay ""):
${BUILDER_SHAPE}`,
    },
  ], { json: true, maxTokens: 3000, temperature: 0.6 });
  return toBuilderData(parseModelJSON(text));
}

// Rewrite summary, bullets and skills of an existing resume for one job description
export async function tailorResume(resume, jobDescription) {
  const source = {
    summary: str(resume.summary),
    experience: (resume.experience || []).map(e => ({ role: str(e.role), company: str(e.company), bullets: str(e.bullets) })),
    projects: (resume.projects || []).map(p => ({ name: str(p.name), bullets: str(p.bullets), tech: str(p.tech) })),
    skills: (resume.skills || []).map(s => ({ label: str(s.label), items: str(s.items) })),
  };
  const text = await complete([
    {
      role: 'system',
      content: `You tailor a resume to a job description. Rewrite the summary and every bullet to emphasise relevant experience and use the job's keywords where they are truthful. Never invent employers, degrees, tools or numbers that are not in the resume. Keep the same number of experience and project entries in the same order. Reorder skills so the most relevant come first. Wrap 1-3 key terms per bullet in **double asterisks**. Always respond with valid JSON only.`,
    },
    {
      role: 'user',
      content: `Job description:\n${cap(jobDescription, JOB_CHARS)}\n\nResume:\n${cap(JSON.stringify(source), RESUME_CHARS)}\n\nReturn JSON: {"summary":"","experience":[{"bullets":"one per line"}],"projects":[{"bullets":"one per line"}],"skills":[{"label":"","items":"comma separated"}]}`,
    },
  ], { json: true, maxTokens: 3000, temperature: 0.4 });
  const data = parseModelJSON(text);
  return {
    summary: str(data.summary),
    experience: (Array.isArray(data.experience) ? data.experience : []).map(e => ({ bullets: lines(e?.bullets) })),
    projects: (Array.isArray(data.projects) ? data.projects : []).map(p => ({ bullets: lines(p?.bullets) })),
    skills: items(data.skills, { label: str, items: commas }).filter(s => s.items),
  };
}

// --- Interview practice -----------------------------------------------------

export async function evaluateAnswer({ question, answer, jobRole }) {
  const text = await complete([
    {
      role: 'system',
      content: 'You are a strict but encouraging interview coach. Evaluate the candidate\'s answer to the interview question. Score 0-10. Always respond with valid JSON only.',
    },
    {
      role: 'user',
      content: `Role: ${cap(jobRole, 200)}\nQuestion: ${cap(question, 1000)}\nCandidate's answer: ${cap(answer, 5000)}\n\nReturn JSON: {"score": 7, "verdict": "one short sentence", "strengths": ["..."], "improvements": ["..."], "improved_answer": "a stronger version of their answer"}`,
    },
  ], { json: true, maxTokens: 1200, temperature: 0.3 });
  const data = parseModelJSON(text);
  return {
    score: Math.max(0, Math.min(10, Math.round(Number(data.score) || 0))),
    verdict: str(data.verdict),
    strengths: strings(data.strengths),
    improvements: strings(data.improvements),
    improved_answer: str(data.improved_answer),
  };
}

// --- LinkedIn ---------------------------------------------------------------

export async function linkedinProfile({ resumeText, targetRole }) {
  const text = await complete([
    {
      role: 'system',
      content: 'You are a LinkedIn profile expert. Write a LinkedIn headline (max 220 characters) and an About section (3 short paragraphs, first person, no emojis overload) based on the resume. Always respond with valid JSON only.',
    },
    {
      role: 'user',
      content: `Target role: ${cap(targetRole, 200)}\nResume:\n${cap(resumeText, RESUME_CHARS)}\n\nReturn JSON: {"headlines": ["option 1", "option 2", "option 3"], "about": "..."}`,
    },
  ], { json: true, maxTokens: 1200, temperature: 0.7 });
  const data = parseModelJSON(text);
  return { headlines: strings(data.headlines).map(h => h.slice(0, 220)).slice(0, 3), about: str(data.about) };
}
