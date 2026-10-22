import { renderToStaticMarkup } from 'react-dom/server';
import {
  FONTS, FONT_SIZES, DENSITIES, PAGE_WIDTH, splitLines, splitList, hasContent, sectionTitle,
} from './resumeData';

// Pure, hook-free and styled inline only, so it renders the same on screen
// and through renderToStaticMarkup for PDF export. (globals.css also force-
// overrides Tailwind gray/white utilities for the dark theme, which a white
// page must not inherit.)

const INK = '#111111';
const MUTED = '#444444';

const ICONS = {
  phone: 'M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z',
  mail: 'M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zm18 2-10 7L2 6',
  github: 'M9 19c-5 1.5-5-2.5-7-3m14 6v-3.9a3.4 3.4 0 0 0-.9-2.6c3.1-.3 6.4-1.5 6.4-7A5.4 5.4 0 0 0 20 4.8 5 5 0 0 0 19.9 1S18.7.7 16 2.5a13.4 13.4 0 0 0-7 0C6.3.7 5.1 1 5.1 1A5 5 0 0 0 5 4.8a5.4 5.4 0 0 0-1.5 3.7c0 5.4 3.3 6.6 6.4 7a3.4 3.4 0 0 0-.9 2.6V22',
  linkedin: 'M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2zM4 2a2 2 0 1 1 0 4 2 2 0 0 1 0-4z',
  pin: 'M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0zM12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  globe: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM2 12h20M12 2a15 15 0 0 1 4 10 15 15 0 0 1-4 10 15 15 0 0 1-4-10 15 15 0 0 1 4-10z',
};

function Icon({ name, size }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
      strokeLinecap="round" strokeLinejoin="round" style={{ display: 'inline-block', verticalAlign: '-1px', marginRight: 3 }}>
      <path d={ICONS[name]} />
    </svg>
  );
}

const href = url => (/^https?:\/\//.test(url) ? url : `https://${url}`);

// Supports **bold** inside any text field
function Rich({ text }) {
  return (text || '').split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith('**') && part.endsWith('**') && part.length > 4
      ? <strong key={i}>{part.slice(2, -2)}</strong>
      : part);
}

function theme(resume) {
  const { template, style } = resume;
  const base = (FONT_SIZES.find(f => f.id === style.fontSize) || FONT_SIZES[1]).base;
  const density = DENSITIES.find(d => d.id === style.density) || DENSITIES[1];
  const font = (FONTS.find(f => f.id === style.font) || FONTS[0]).css;
  const accent = template === 'classic' ? INK : style.accent;
  return { template, base, density, font, accent, gap: density.gap };
}

function Heading({ t, children }) {
  const common = { margin: `${8 * t.gap}px 0 ${4 * t.gap}px`, fontWeight: 700, breakAfter: 'avoid' };
  if (t.template === 'modern') {
    return <h2 style={{ ...common, fontSize: t.base + 1.5, color: t.accent, textTransform: 'uppercase', letterSpacing: 1.2, borderBottom: `1.5px solid ${t.accent}`, paddingBottom: 2 }}>{children}</h2>;
  }
  if (t.template === 'elegant') {
    const rule = <span style={{ flex: 1, height: 1, background: '#c9c9c9' }} />;
    return (
      <h2 style={{ ...common, fontSize: t.base + 0.5, color: t.accent, textTransform: 'uppercase', letterSpacing: 3, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 10 }}>
        {rule}<span>{children}</span>{rule}
      </h2>
    );
  }
  if (t.template === 'sidebar') {
    return <h2 style={{ ...common, fontSize: t.base + 1, color: t.accent, textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 700 }}>{children}</h2>;
  }
  if (t.template === 'minimal') {
    return <h2 style={{ ...common, fontSize: t.base + 0.5, color: t.accent, textTransform: 'uppercase', letterSpacing: 2.5, textAlign: 'center', fontWeight: 600 }}>{children}</h2>;
  }
  return <h2 style={{ ...common, fontSize: t.base + 2.5, color: INK, textTransform: 'uppercase', borderBottom: `1px solid ${INK}`, paddingBottom: 1 }}>{children}</h2>;
}

function Row({ left, right, t, italic }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'baseline', fontStyle: italic ? 'italic' : 'normal', fontSize: italic ? t.base - 0.5 : t.base + 0.5 }}>
      <div style={{ minWidth: 0 }}>{left}</div>
      {right && <div style={{ whiteSpace: 'nowrap', fontSize: t.base - 0.5, }}>{right}</div>}
    </div>
  );
}

function Bullets({ text, t }) {
  const items = splitLines(text);
  if (!items.length) return null;
  return (
    <ul style={{ margin: `${2 * t.gap}px 0 0`, paddingLeft: 18, listStyle: 'disc' }}>
      {items.map((b, i) => <li key={i} style={{ fontSize: t.base, lineHeight: 1.32, marginBottom: 1 * t.gap }}><Rich text={b} /></li>)}
    </ul>
  );
}

const dates = (s, e) => [s, e].filter(Boolean).join(' - ');
const entryGap = t => ({ marginBottom: 6 * t.gap, breakInside: 'avoid' });

function LinkLabel({ url, t }) {
  if (!url) return null;
  const github = /github\.com/i.test(url);
  return (
    <a href={href(url)} style={{ color: 'inherit', textDecoration: 'none', fontWeight: 400, fontSize: t.base }}>
      <Icon name={github ? 'github' : 'globe'} size={t.base} />{github ? 'Github' : 'Live'}
    </a>
  );
}

function SectionBody({ resume, id, t }) {
  if (id === 'summary') {
    return resume.summary ? <p style={{ margin: 0, fontSize: t.base, lineHeight: 1.35, textAlign: 'justify' }}><Rich text={resume.summary} /></p> : null;
  }
  if (id === 'education') {
    return resume.education.filter(hasContent).map((e, i) => (
      <div key={i} style={entryGap(t)}>
        <Row t={t} left={<><strong>{e.school}</strong>{e.location && <span>{'  |  '}{e.location}</span>}</>} right={dates(e.start, e.end)} />
        <Row t={t} italic left={e.degree} right={e.score} />
        <Bullets text={e.details} t={t} />
      </div>
    ));
  }
  if (id === 'experience') {
    return resume.experience.filter(hasContent).map((e, i) => (
      <div key={i} style={entryGap(t)}>
        <Row t={t} left={<><strong>{e.company}</strong>{e.location && <span>{'  |  '}{e.location}</span>}</>} right={dates(e.start, e.end)} />
        <Row t={t} italic left={e.role} />
        <Bullets text={e.bullets} t={t} />
      </div>
    ));
  }
  if (id === 'projects') {
    return resume.projects.filter(hasContent).map((p, i) => (
      <div key={i} style={entryGap(t)}>
        <Row t={t} left={<><strong>{p.name}</strong>{p.link && <>{'  |  '}<LinkLabel url={p.link} t={t} /></>}</>} right={dates(p.start, p.end)} />
        {p.role && <Row t={t} italic left={p.role} />}
        <Bullets text={p.bullets} t={t} />
        {p.tech && (
          <div style={{ fontSize: t.base - 0.5, fontStyle: 'italic', marginTop: 1 }}>
            <strong>Technologies / Tools Used :</strong> {p.tech}
          </div>
        )}
      </div>
    ));
  }
  if (id === 'skills') {
    const rows = resume.skills.filter(s => s.items.trim());
    return (
      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: t.base }}>
        <tbody>
          {rows.map((s, i) => (
            <tr key={i}>
              {s.label && <td style={{ fontWeight: 700, verticalAlign: 'top', padding: `${0.5 * t.gap}px 12px ${0.5 * t.gap}px 0`, whiteSpace: 'nowrap', width: '1%' }}>{s.label} :</td>}
              <td colSpan={s.label ? 1 : 2} style={{ padding: `${0.5 * t.gap}px 0` }}>{splitList(s.items).join(', ')}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }
  if (id === 'certifications' || id === 'achievements') return <Bullets text={resume[id]} t={t} />;
  if (id.startsWith('custom:')) {
    const c = resume.custom.find(x => `custom:${x.id}` === id);
    return c ? <Bullets text={c.content} t={t} /> : null;
  }
  return null;
}

function sectionIsEmpty(resume, id) {
  if (id === 'summary') return !resume.summary.trim();
  if (['education', 'experience', 'projects'].includes(id)) return !resume[id].some(hasContent);
  if (id === 'skills') return !resume.skills.some(s => s.items.trim());
  if (id === 'certifications' || id === 'achievements') return !resume[id].trim();
  if (id.startsWith('custom:')) return !resume.custom.find(x => `custom:${x.id}` === id)?.content.trim();
  return true;
}

function contactItems(p) {
  return [
    p.phone && { icon: 'phone', text: p.phone },
    p.email && { icon: 'mail', text: p.email, url: `mailto:${p.email}` },
    p.github && { icon: 'github', text: 'GitHub', url: href(p.github) },
    p.linkedin && { icon: 'linkedin', text: 'LinkedIn', url: href(p.linkedin) },
    p.website && { icon: 'globe', text: 'Portfolio', url: href(p.website) },
    p.location && { icon: 'pin', text: p.location },
  ].filter(Boolean);
}

function Contact({ item, t }) {
  const content = <><Icon name={item.icon} size={t.base - 1} />{item.text}</>;
  return item.url
    ? <a href={item.url} style={{ color: 'inherit', textDecoration: 'none' }}>{content}</a>
    : <span>{content}</span>;
}

function Header({ resume, t, contacts = true }) {
  const p = resume.personal;
  const items = contacts ? contactItems(p) : [];
  const left = t.template === 'modern' || t.template === 'sidebar';
  const elegant = t.template === 'elegant';

  return (
    <header style={{ textAlign: left ? 'left' : 'center', marginBottom: 6 * t.gap }}>
      <h1 style={{
        margin: 0, lineHeight: 1.1, color: t.template === 'classic' || elegant ? INK : t.accent,
        fontSize: t.base * (t.template === 'classic' ? 2.6 : 2.3),
        fontWeight: t.template === 'classic' || elegant ? 400 : 700,
        fontVariant: t.template === 'classic' ? 'small-caps' : 'normal',
        letterSpacing: t.template === 'minimal' || elegant ? 4 : 0.5,
        textTransform: t.template === 'minimal' || elegant ? 'uppercase' : 'none',
      }}>
        {p.name || 'Your Name'}
      </h1>
      {p.title && <div style={{ fontStyle: t.template === 'classic' ? 'italic' : 'normal', fontSize: t.base, color: MUTED, marginTop: 2 }}>{p.title}</div>}
      <div style={{ marginTop: 3, fontSize: t.base - 0.5, display: 'flex', flexWrap: 'wrap', gap: '2px 12px', justifyContent: left ? 'flex-start' : 'center' }}>
        {items.map(item => <Contact key={item.icon} item={item} t={t} />)}
      </div>
      {elegant && <div style={{ marginTop: 8, borderTop: `2px solid ${t.accent}`, borderBottom: `1px solid ${t.accent}`, height: 3 }} />}
    </header>
  );
}

const SIDE_SECTIONS = ['skills', 'certifications', 'achievements'];

function SidebarBody({ resume, t }) {
  const visible = resume.order.filter(id => !sectionIsEmpty(resume, id));
  const side = visible.filter(id => SIDE_SECTIONS.includes(id));
  const main = visible.filter(id => !SIDE_SECTIONS.includes(id));
  const skills = resume.skills.filter(s => s.items.trim());
  return (
    <div style={{ display: 'flex', gap: 22 }}>
      <aside style={{ width: '31%', flexShrink: 0, borderRight: `2px solid ${t.accent}22`, paddingRight: 16 }}>
        <Heading t={t}>Contact</Heading>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: t.base - 0.5, wordBreak: 'break-word' }}>
          {contactItems(resume.personal).map(item => <Contact key={item.icon} item={item} t={t} />)}
        </div>
        {side.map(id => (
          <section key={id}>
            <Heading t={t}>{sectionTitle(resume, id)}</Heading>
            {id === 'skills'
              ? skills.map((s, i) => (
                <div key={i} style={{ marginBottom: 5 * t.gap, fontSize: t.base - 0.5 }}>
                  {s.label && <div style={{ fontWeight: 700 }}>{s.label}</div>}
                  <div>{splitList(s.items).join(' · ')}</div>
                </div>
              ))
              : <SectionBody resume={resume} id={id} t={t} />}
          </section>
        ))}
      </aside>
      <div style={{ flex: 1, minWidth: 0 }}>
        {main.map(id => (
          <section key={id}>
            <Heading t={t}>{sectionTitle(resume, id)}</Heading>
            <SectionBody resume={resume} id={id} t={t} />
          </section>
        ))}
      </div>
    </div>
  );
}

// forPrint: vertical page margins come from @page so they repeat on every printed page
export default function ResumeDocument({ resume, forPrint = false }) {
  const t = theme(resume);
  if (t.template === 'sidebar') {
    return (
      <div style={{
        background: '#ffffff', color: INK, fontFamily: t.font, fontSize: t.base,
        width: forPrint ? '100%' : PAGE_WIDTH, boxSizing: 'border-box',
        padding: forPrint ? `0 ${t.density.padX}px` : `${t.density.padY}px ${t.density.padX}px`, lineHeight: 1.3,
      }}>
        <Header resume={resume} t={t} contacts={false} />
        <div style={{ height: 3, background: t.accent, margin: `0 0 ${8 * t.gap}px` }} />
        <SidebarBody resume={resume} t={t} />
      </div>
    );
  }
  return (
    <div style={{
      background: '#ffffff', color: INK, fontFamily: t.font, fontSize: t.base,
      width: forPrint ? '100%' : PAGE_WIDTH, boxSizing: 'border-box',
      padding: forPrint ? `0 ${t.density.padX}px` : `${t.density.padY}px ${t.density.padX}px`,
      lineHeight: 1.3,
    }}>
      <Header resume={resume} t={t} />
      {resume.order.filter(id => !sectionIsEmpty(resume, id)).map(id => (
        <section key={id}>
          <Heading t={t}>{sectionTitle(resume, id)}</Heading>
          <SectionBody resume={resume} id={id} t={t} />
        </section>
      ))}
    </div>
  );
}

// Opens the resume alone in a new window and triggers Save as PDF / Print
export function printResume(resume) {
  const t = theme(resume);
  const html = renderToStaticMarkup(<ResumeDocument resume={resume} forPrint />);
  const win = window.open('', '_blank');
  if (!win) return false;
  const title = (resume.personal.name || resume.title || 'Resume').replace(/[<>&"]/g, '').replace(/\s+/g, '_');
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
    <style>
      @page { size: A4; margin: ${t.density.padY}px 0; }
      * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      html, body { margin: 0; background: #fff; }
      h1, h2 { font-family: inherit; }
      li, tr { break-inside: avoid; }
    </style></head><body>${html}</body></html>`);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 350);
  return true;
}
