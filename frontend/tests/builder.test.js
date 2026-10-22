import { describe, test, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import ResumeDocument from '../src/components/builder/ResumeDocument';
import {
  emptyResume, sampleResume, normalizeResume, resumeToText, fromProfile, sectionTitle, FIT_STEPS, TEMPLATES, mergeTailored,
} from '../src/components/builder/resumeData';
import { readiness, ratingFor, findWeakPhrases } from '../src/components/builder/readiness';
import Markdown from '../src/components/Markdown';
import { tokenExpiry } from '../src/context/AuthContext';

describe('normalizeResume', () => {
  test('upgrades resumes saved by the first builder version', () => {
    const legacy = {
      title: 'Old', template: 'sidebar', accent: '#2563eb',
      skills: 'React, Node.js',
      projects: [{ name: 'App', tech: 'React', link: '', description: 'Built it' }],
      certifications: ['AWS'],
    };
    const r = normalizeResume(legacy);
    expect(r.template).toBe('classic');
    expect(r.style.accent).toBe('#2563eb');
    expect(r.skills).toEqual([{ label: 'Skills', items: 'React, Node.js' }]);
    expect(r.projects[0].bullets).toBe('Built it');
    expect(r.certifications).toBe('AWS');
    expect(r.order.length).toBeGreaterThan(0);
    expect(r).not.toHaveProperty('accent');
  });

  test('drops unknown sections and keeps custom ones', () => {
    const r = normalizeResume({ order: ['summary', 'bogus', 'custom:x1'], custom: [{ id: 'x1', title: 'Volunteering', content: 'NSS' }] });
    expect(r.order).toEqual(['summary', 'custom:x1']);
    expect(sectionTitle(r, 'custom:x1')).toBe('Volunteering');
  });

  test('is safe on empty input', () => {
    expect(() => normalizeResume()).not.toThrow();
    expect(() => normalizeResume({ skills: null, education: null })).not.toThrow();
  });
});

describe('resumeToText', () => {
  test('follows section order and strips **bold** markers', () => {
    const text = resumeToText(sampleResume());
    expect(text).toContain('Aarav Sharma');
    expect(text).not.toContain('**');
    expect(text.indexOf('CAREER OBJECTIVE')).toBeLessThan(text.indexOf('EDUCATION'));
  });
});

describe('fromProfile', () => {
  test('fills blanks without overwriting what the user wrote', () => {
    const resume = { ...emptyResume(), summary: 'Mine' };
    const filled = fromProfile(resume, { name: 'Sahil', bio: 'Profile bio', skills: ['Java'] });
    expect(filled.personal.name).toBe('Sahil');
    expect(filled.summary).toBe('Mine');
    expect(filled.skills).toEqual([{ label: 'Skills', items: 'Java' }]);
  });
});

describe('readiness', () => {
  test('a complete sample scores well, an empty resume does not', () => {
    expect(readiness(sampleResume(), 1).score).toBeGreaterThanOrEqual(70);
    expect(readiness(emptyResume(), 1).score).toBeLessThan(30);
  });

  test('going over one page fails the one-page check', () => {
    const check = readiness(sampleResume(), 2).checks.find(c => c.label === 'One page');
    expect(check.ok).toBe(false);
  });

  test('ratings cover the whole range', () => {
    expect(ratingFor(95).label).toBe('Excellent');
    expect(ratingFor(75).label).toBe('Above Average');
    expect(ratingFor(55).label).toBe('Okayish');
    expect(ratingFor(10).label).toBe('Needs Work');
  });

  test('fit steps go from loosest to tightest', () => {
    expect(FIT_STEPS[0]).toEqual({ density: 'relaxed', fontSize: 'L' });
    expect(FIT_STEPS.at(-1)).toEqual({ density: 'compact', fontSize: 'S' });
  });
});

describe('ResumeDocument', () => {
  const render = resume => renderToStaticMarkup(<ResumeDocument resume={resume} />);

  test('renders every template without crashing', () => {
    for (const { id: template } of TEMPLATES) {
      const html = render({ ...sampleResume(), template });
      expect(html).toContain('Aarav Sharma');
      expect(html).toContain('<strong>2+ years</strong>');
    }
  });

  test('skips empty sections and handles a blank resume', () => {
    const html = render(emptyResume());
    expect(html).toContain('Your Name');
    expect(html).not.toContain('Career Objective');
  });

  test('uses custom section headings', () => {
    const r = { ...sampleResume(), titles: { summary: 'Profile' } };
    expect(render(r)).toContain('>Profile<');
  });
});

describe('tokenExpiry', () => {
  const make = payload => `x.${Buffer.from(JSON.stringify(payload)).toString('base64url')}.y`;
  test('reads exp from a JWT and returns 0 for garbage', () => {
    expect(tokenExpiry(make({ exp: 2000000000 }))).toBe(2000000000 * 1000);
    expect(tokenExpiry('not-a-jwt')).toBe(0);
  });
});

describe('sidebar template', () => {
  test('puts contact and skills in the side column', () => {
    const html = renderToStaticMarkup(<ResumeDocument resume={{ ...sampleResume(), template: 'sidebar' }} />);
    const aside = html.slice(html.indexOf('<aside'), html.indexOf('</aside>'));
    expect(aside).toContain('aarav.sharma@email.com');
    expect(aside).toContain('Programming Languages');
    expect(aside).not.toContain('TechNova');
  });
});

describe('mergeTailored', () => {
  test('replaces text by position and keeps anything the AI left empty', () => {
    const base = sampleResume();
    const merged = mergeTailored(base, {
      summary: 'New summary',
      experience: [{ bullets: 'Tailored bullet' }, { bullets: 'extra entry ignored' }],
      projects: [{ bullets: '' }],
      skills: [],
    }, 'Copy for Acme');
    expect(merged.title).toBe('Copy for Acme');
    expect(merged.summary).toBe('New summary');
    expect(merged.experience).toHaveLength(base.experience.length);
    expect(merged.experience[0].bullets).toBe('Tailored bullet');
    expect(merged.experience[0].company).toBe(base.experience[0].company);
    expect(merged.projects[0].bullets).toBe(base.projects[0].bullets);
    expect(merged.skills).toEqual(base.skills);
  });
});

describe('findWeakPhrases', () => {
  test('flags passive phrases with where they appear', () => {
    const r = { ...sampleResume(), experience: [{ ...sampleResume().experience[0], bullets: 'Responsible for the **backend**\nBuilt 3 APIs' }] };
    const found = findWeakPhrases(r);
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ where: 'TechNova Solutions', phrase: 'responsible for', text: 'Responsible for the backend' });
    expect(findWeakPhrases(sampleResume())).toHaveLength(0);
  });
});

describe('Markdown', () => {
  test('renders bold, lists and never raw HTML', () => {
    const html = renderToStaticMarkup(<Markdown text={'Here is **advice**:\n- one\n- two\n1. first\n<script>alert(1)</script>'} />);
    expect(html).toContain('<strong>advice</strong>');
    expect(html).toMatch(/<ul[^>]*><li>one<\/li><li>two<\/li><\/ul>/);
    expect(html).toContain('<ol');
    expect(html).not.toContain('<script>');
  });
});
