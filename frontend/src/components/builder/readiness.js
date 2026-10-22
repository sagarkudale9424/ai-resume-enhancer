import { hasContent, splitLines, stripBold } from './resumeData';

const ACTION_VERBS = /^(built|developed|designed|implemented|led|created|reduced|improved|increased|optimi[sz]ed|launched|automated|migrated|engineered|delivered|managed|integrated|architected|deployed|analy[sz]ed|streamlined|collaborated|mentored|achieved|spearheaded|established|enhanced|resolved|wrote|owned|drove|shipped|scaled|containerized|refactored|tested|configured)\b/i;
const METRIC = /\d/;
const PRONOUNS = /\b(I|me|my|mine)\b/;

// Phrases recruiters read as passive or vague, with a stronger alternative
export const WEAK_PHRASES = [
  [/\bresponsible for\b/i, 'responsible for', 'Start with what you did: "Led", "Built", "Managed"'],
  [/\bworked on\b/i, 'worked on', 'Say what you built or changed: "Developed", "Implemented"'],
  [/\bhelped( to| with)?\b/i, 'helped', 'Show your part: "Contributed", "Co-developed", "Drove"'],
  [/\bassisted( in| with)?\b/i, 'assisted', 'Show ownership: "Supported X by doing Y"'],
  [/\bwas involved in\b/i, 'was involved in', 'Name your role: "Owned", "Delivered"'],
  [/\b(various|several|many) (tasks|things|projects)\b/i, 'vague quantity', 'Be specific — name the tasks or give a number'],
  [/\bduties included\b/i, 'duties included', 'List achievements, not duties'],
  [/\bteam player\b/i, 'team player', 'Show collaboration with an example instead'],
  [/\bhard[- ]?working\b/i, 'hard-working', 'Replace with a concrete result'],
];

// Every bullet or summary line that contains a weak phrase
export function findWeakPhrases(resume) {
  const lines = [
    ...splitLines(resume.summary).map(text => ({ where: 'Summary', text })),
    ...resume.experience.flatMap(e => splitLines(e.bullets).map(text => ({ where: e.company || e.role || 'Experience', text }))),
    ...resume.projects.flatMap(p => splitLines(p.bullets).map(text => ({ where: p.name || 'Project', text }))),
  ];
  return lines.flatMap(({ where, text }) => WEAK_PHRASES
    .filter(([re]) => re.test(text))
    .map(([, phrase, tip]) => ({ where, text: stripBold(text), phrase, tip })));
}

// Quick, offline "readiness" check shown in the editor and stored with each resume
export function readiness(resume, pages = 1) {
  const p = resume.personal;
  const bullets = [
    ...resume.experience.filter(hasContent).flatMap(e => splitLines(e.bullets)),
    ...resume.projects.filter(hasContent).flatMap(pr => splitLines(pr.bullets)),
  ].map(stripBold);
  const summaryWords = stripBold(resume.summary).split(/\s+/).filter(Boolean).length;
  const skillCount = resume.skills.flatMap(s => s.items.split(',')).filter(s => s.trim()).length;
  const actionShare = bullets.length ? bullets.filter(b => ACTION_VERBS.test(b)).length / bullets.length : 0;
  const metricShare = bullets.length ? bullets.filter(b => METRIC.test(b)).length / bullets.length : 0;
  const allText = [resume.summary, ...bullets].join(' ');

  const checks = [
    { label: 'Contact details', weight: 15, ok: Boolean(p.name && p.email && p.phone), tip: 'Add your name, email and phone number.' },
    { label: 'Professional links', weight: 5, ok: Boolean(p.linkedin || p.github || p.website), tip: 'Add a LinkedIn, GitHub or portfolio link.' },
    { label: 'Summary length', weight: 10, ok: summaryWords >= 25 && summaryWords <= 90, tip: 'Keep your summary / objective between 25 and 90 words.' },
    { label: 'Education', weight: 10, ok: resume.education.some(e => e.school && e.degree), tip: 'Add at least one education entry with degree and institution.' },
    { label: 'Experience or projects', weight: 15, ok: bullets.length >= 4, tip: 'Add at least 4 bullet points across experience and projects.' },
    { label: 'Action verbs', weight: 15, ok: actionShare >= 0.6, tip: 'Start most bullets with strong verbs like Built, Led, Reduced.' },
    { label: 'Measurable impact', weight: 15, ok: metricShare >= 0.4, tip: 'Add numbers (%, users, time saved) to at least 40% of bullets.' },
    { label: 'Skills', weight: 10, ok: skillCount >= 8, tip: 'List at least 8 relevant skills.' },
    { label: 'One page', weight: 5, ok: pages <= 1, tip: 'Recruiters prefer one page — use "Fit to single page".' },
    { label: 'No personal pronouns', weight: 0, ok: !PRONOUNS.test(allText), tip: 'Avoid "I", "me" and "my" in a resume.' },
    { label: 'No weak phrases', weight: 0, ok: findWeakPhrases(resume).length === 0, tip: 'Replace phrases like "responsible for" or "worked on" — see the list below.' },
  ];

  const total = checks.reduce((sum, c) => sum + c.weight, 0);
  const score = Math.round((checks.reduce((sum, c) => sum + (c.ok ? c.weight : 0), 0) / total) * 100);
  return { score, rating: ratingFor(score), checks };
}

export function ratingFor(score) {
  if (score >= 85) return { label: 'Excellent', tone: 'green' };
  if (score >= 70) return { label: 'Above Average', tone: 'amber' };
  if (score >= 50) return { label: 'Okayish', tone: 'orange' };
  return { label: 'Needs Work', tone: 'red' };
}

export const TONE_CLASSES = {
  green: 'text-green-400 bg-green-500/10 border-green-500/30',
  amber: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  orange: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
  red: 'text-red-400 bg-red-500/10 border-red-500/30',
};
