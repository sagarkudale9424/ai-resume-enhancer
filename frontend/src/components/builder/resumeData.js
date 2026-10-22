export const TEMPLATES = [
  { id: 'classic', label: 'Classic', desc: 'Serif, ATS-safe, recruiter favourite' },
  { id: 'modern', label: 'Modern', desc: 'Clean sans-serif with accent colour' },
  { id: 'minimal', label: 'Minimal', desc: 'Centered, airy and simple' },
  { id: 'elegant', label: 'Elegant', desc: 'Refined serif with accent rules' },
  { id: 'sidebar', label: 'Sidebar', desc: 'Two columns: skills & contact on the side' },
];

// Default font for each template when it is picked
export const TEMPLATE_FONTS = { classic: 'serif', modern: 'sans', minimal: 'sans', elegant: 'serif', sidebar: 'sans' };

export const ACCENTS = ['#111827', '#6d28d9', '#2563eb', '#0f766e', '#be123c', '#c2410c'];

export const FONTS = [
  { id: 'serif', label: 'Serif', css: '"Times New Roman", Times, Georgia, serif' },
  { id: 'sans', label: 'Sans', css: 'Inter, "Segoe UI", Arial, sans-serif' },
];

export const FONT_SIZES = [
  { id: 'S', label: 'Small', base: 10.5 },
  { id: 'M', label: 'Medium', base: 11.5 },
  { id: 'L', label: 'Large', base: 12.5 },
];

export const DENSITIES = [
  { id: 'compact', label: 'Compact', padX: 30, padY: 26, gap: 0.7 },
  { id: 'normal', label: 'Normal', padX: 40, padY: 34, gap: 1 },
  { id: 'relaxed', label: 'Relaxed', padX: 50, padY: 44, gap: 1.35 },
];

// Loosest to tightest; "Fit to single page" walks down this list
export const FIT_STEPS = [
  { density: 'relaxed', fontSize: 'L' },
  { density: 'relaxed', fontSize: 'M' },
  { density: 'normal', fontSize: 'M' },
  { density: 'normal', fontSize: 'S' },
  { density: 'compact', fontSize: 'M' },
  { density: 'compact', fontSize: 'S' },
];

export const PAGE_WIDTH = 794;   // A4 at 96 dpi
export const PAGE_HEIGHT = 1123;

export const SECTION_TYPES = {
  summary: 'Career Objective',
  education: 'Education',
  experience: 'Work Experience',
  projects: 'Projects',
  skills: 'Skills',
  certifications: 'Certifications',
  achievements: 'Achievements',
};

export const DEFAULT_ORDER = ['summary', 'education', 'experience', 'projects', 'skills', 'certifications', 'achievements'];

export const emptyExperience = () => ({ role: '', company: '', location: '', start: '', end: '', bullets: '' });
export const emptyEducation = () => ({ school: '', location: '', degree: '', start: '', end: '', score: '', details: '' });
export const emptyProject = () => ({ name: '', role: '', link: '', start: '', end: '', bullets: '', tech: '' });
export const emptySkill = () => ({ label: '', items: '' });

export function emptyResume() {
  return {
    title: 'Untitled Resume',
    template: 'classic',
    style: { accent: ACCENTS[0], font: 'serif', fontSize: 'M', density: 'normal' },
    personal: { name: '', title: '', email: '', phone: '', location: '', linkedin: '', github: '', website: '' },
    order: [...DEFAULT_ORDER],
    titles: {},
    summary: '',
    experience: [],
    education: [emptyEducation()],
    projects: [emptyProject()],
    skills: [
      { label: 'Programming Languages', items: '' },
      { label: 'Frameworks & Libraries', items: '' },
      { label: 'Tools', items: '' },
    ],
    certifications: '',
    achievements: '',
    custom: [],
  };
}

export function sampleResume() {
  return normalizeResume({
    title: 'Sample Resume',
    personal: {
      name: 'Aarav Sharma',
      title: 'Software Development Engineer',
      email: 'aarav.sharma@email.com',
      phone: '+91 98765 43210',
      location: 'Pune, India',
      linkedin: 'linkedin.com/in/aaravsharma',
      github: 'github.com/aaravsharma',
      website: '',
    },
    summary: 'Full-stack developer with **2+ years** of experience building scalable web applications with **React, Node.js and MongoDB**. Shipped features used by 50K+ users and cut API response times by 40%.',
    experience: [{
      role: 'Software Engineer',
      company: 'TechNova Solutions',
      location: 'Pune',
      start: 'Jul 2023',
      end: 'Present',
      bullets: 'Built a **React + Node.js** analytics dashboard used by 200+ clients\nReduced average API latency by **40%** through query optimisation and Redis caching\nLed migration of 12 services to **Docker** and GitHub Actions CI/CD',
    }],
    education: [{
      school: 'University of Pune', location: 'Pune, Maharashtra', degree: 'B.E. Computer Engineering',
      start: 'Jul 2019', end: 'Jun 2023', score: 'CGPA: 8.6', details: '',
    }],
    projects: [{
      name: 'AI Resume Enhancer',
      role: 'Individual Project',
      link: 'github.com/aaravsharma/resume-enhancer',
      start: 'Jan 2025',
      end: 'Present',
      bullets: 'Built an AI platform for **ATS scoring**, resume rewriting and interview prep\nImplemented a RAG pipeline for personalised career coaching',
      tech: 'Next.js, Express, MongoDB, Groq',
    }],
    skills: [
      { label: 'Programming Languages', items: 'JavaScript, TypeScript, Java, SQL' },
      { label: 'Frameworks & Libraries', items: 'React, Next.js, Node.js, Express, Tailwind CSS' },
      { label: 'Tools', items: 'Git, Docker, AWS, Postman' },
    ],
    certifications: 'AWS Certified Cloud Practitioner (2024)',
    achievements: 'Winner, Smart India Hackathon 2022',
  });
}

const asLines = list => (Array.isArray(list) ? list.join('\n') : list || '');

// Fill in defaults and upgrade resumes saved by the first version of the builder
export function normalizeResume(raw = {}) {
  const base = emptyResume();
  const r = { ...base, ...raw };
  r.style = { ...base.style, ...(raw.style || {}), ...(raw.accent ? { accent: raw.accent } : {}) };
  r.personal = { ...base.personal, ...(raw.personal || {}) };
  r.titles = { ...(raw.titles || {}) };
  r.custom = raw.custom || [];
  // v1 had a different 'sidebar' (no style object); start those on Classic
  if (!TEMPLATES.some(t => t.id === r.template) || (raw.template === 'sidebar' && !raw.style)) r.template = 'classic';
  if (raw.template && !raw.style) r.style.font = TEMPLATE_FONTS[r.template];

  r.order = (raw.order || DEFAULT_ORDER).filter(id => SECTION_TYPES[id] || r.custom.some(c => `custom:${c.id}` === id));
  r.experience = (raw.experience || []).map(e => ({ ...emptyExperience(), ...e }));
  r.education = (raw.education || base.education).map(e => ({ ...emptyEducation(), ...e }));
  r.projects = (raw.projects || base.projects).map(p => ({
    ...emptyProject(), ...p, bullets: p.bullets ?? p.description ?? '',
  }));
  r.skills = typeof raw.skills === 'string'
    ? [{ label: 'Skills', items: raw.skills }]
    : (raw.skills || base.skills).map(s => ({ ...emptySkill(), ...s }));
  r.certifications = asLines(raw.certifications);
  r.achievements = asLines(raw.achievements);
  delete r.accent;
  return r;
}

// Prefill personal details, summary and skills from the user's profile
export function fromProfile(resume, profile) {
  const pick = (a, b) => a || b || '';
  const skills = (profile.skills || []).join(', ');
  return {
    ...resume,
    personal: {
      ...resume.personal,
      name: pick(profile.name, resume.personal.name),
      title: pick(profile.headline || profile.targetRole, resume.personal.title),
      email: pick(profile.email, resume.personal.email),
      phone: pick(profile.phone, resume.personal.phone),
      location: pick(profile.location, resume.personal.location),
      linkedin: pick(profile.linkedin, resume.personal.linkedin),
      github: pick(profile.github, resume.personal.github),
      website: pick(profile.website, resume.personal.website),
    },
    summary: resume.summary || profile.bio || '',
    skills: skills && !resume.skills.some(s => s.items.trim())
      ? [{ label: 'Skills', items: skills }]
      : resume.skills,
  };
}

export const splitLines = text => (text || '').split('\n').map(l => l.trim()).filter(Boolean);
export const splitList = text => (text || '').split(',').map(s => s.trim()).filter(Boolean);
export const hasContent = obj => Object.values(obj).some(v => String(v || '').trim());
export const stripBold = text => (text || '').replace(/\*\*/g, '');

export function sectionTitle(resume, id) {
  if (id.startsWith('custom:')) return resume.custom.find(c => `custom:${c.id}` === id)?.title || 'Custom Section';
  return resume.titles[id] || SECTION_TYPES[id];
}

// Plain-text version used for ATS checks and as context for the other AI tools
export function resumeToText(r) {
  const p = r.personal;
  const dates = (s, e) => [s, e].filter(Boolean).join(' - ');
  const out = [p.name, p.title, [p.email, p.phone, p.location, p.linkedin, p.github, p.website].filter(Boolean).join(' | '), ''];

  for (const id of r.order) {
    const title = sectionTitle(r, id).toUpperCase();
    if (id === 'summary' && r.summary) out.push(title, r.summary, '');
    if (id === 'experience' && r.experience.some(hasContent)) {
      out.push(title);
      r.experience.filter(hasContent).forEach(e => out.push(
        `${e.role} - ${e.company}, ${e.location} (${dates(e.start, e.end)})`,
        ...splitLines(e.bullets).map(b => `• ${b}`), ''));
    }
    if (id === 'education' && r.education.some(hasContent)) {
      out.push(title);
      r.education.filter(hasContent).forEach(e => out.push(
        `${e.degree} - ${e.school}, ${e.location} (${dates(e.start, e.end)}) ${e.score}`, ...splitLines(e.details).map(b => `• ${b}`)));
      out.push('');
    }
    if (id === 'projects' && r.projects.some(hasContent)) {
      out.push(title);
      r.projects.filter(hasContent).forEach(pr => out.push(
        `${pr.name} (${dates(pr.start, pr.end)})`, ...splitLines(pr.bullets).map(b => `• ${b}`),
        pr.tech ? `Technologies: ${pr.tech}` : '', ''));
    }
    if (id === 'skills' && r.skills.some(s => s.items.trim())) {
      out.push(title, ...r.skills.filter(s => s.items.trim()).map(s => `${s.label}: ${s.items}`), '');
    }
    if ((id === 'certifications' || id === 'achievements') && r[id].trim()) out.push(title, ...splitLines(r[id]).map(b => `• ${b}`), '');
    if (id.startsWith('custom:')) {
      const c = r.custom.find(x => `custom:${x.id}` === id);
      if (c?.content.trim()) out.push(title, ...splitLines(c.content).map(b => `• ${b}`), '');
    }
  }
  return stripBold(out.filter(l => l !== undefined).join('\n')).replace(/\n{3,}/g, '\n\n').trim();
}

// Map the structure returned by POST /api/resumes/import onto the builder model
export function fromImported(data, fileName) {
  return normalizeResume({
    ...data,
    title: (fileName || 'Imported Resume').replace(/\.pdf$/i, ''),
  });
}

// Apply AI-tailored text (from POST /api/resumes/tailor) onto a copy of the resume.
// Entries are matched by position; anything the AI left empty keeps the original.
export function mergeTailored(resume, tailored, title) {
  const byIndex = (list, updates = []) => list.map((item, i) => (updates[i]?.bullets?.trim() ? { ...item, bullets: updates[i].bullets } : item));
  return {
    ...resume,
    title: title || `${resume.title} (tailored)`,
    summary: tailored.summary?.trim() ? tailored.summary : resume.summary,
    experience: byIndex(resume.experience, tailored.experience),
    projects: byIndex(resume.projects, tailored.projects),
    skills: tailored.skills?.length ? tailored.skills : resume.skills,
  };
}
