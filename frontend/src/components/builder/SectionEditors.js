'use client';
import { Plus, Trash2, Sparkles, Loader, ArrowUp, ArrowDown } from 'lucide-react';
import { emptyExperience, emptyEducation, emptyProject, emptySkill } from './resumeData';

export function Field({ label, hint, className = '', ...props }) {
  return (
    <div className={`space-y-1 ${className}`}>
      {label && <label className="text-[11px] font-medium text-white/45">{label}</label>}
      <input className="input py-2" {...props} />
      {hint && <p className="text-[10px] text-white/30">{hint}</p>}
    </div>
  );
}

export function Area({ label, hint, rows = 4, ...props }) {
  return (
    <div className="space-y-1">
      {label && <label className="text-[11px] font-medium text-white/45">{label}</label>}
      <textarea className="textarea py-2 leading-relaxed" rows={rows} {...props} />
      {hint && <p className="text-[10px] text-white/30">{hint}</p>}
    </div>
  );
}

export function AIButton({ loading, onClick, children }) {
  return (
    <button onClick={onClick} disabled={loading} type="button"
      className="inline-flex items-center gap-1.5 text-xs font-medium text-purple-200 bg-gradient-to-r from-purple-600/30 to-fuchsia-600/30 border border-purple-500/40 rounded-lg px-3 py-1.5 hover:from-purple-600/50 hover:to-fuchsia-600/50 disabled:opacity-50 transition-all">
      {loading ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
      {children}
    </button>
  );
}

const BULLET_HINT = 'One point per line. Wrap words in **double stars** to make them bold.';

// Generic list editor: one bordered card per entry with move/remove controls
function ItemList({ items, onChange, factory, addLabel, renderItem }) {
  const set = (i, field, value) => onChange(items.map((it, j) => (j === i ? { ...it, [field]: value } : it)));
  const move = (i, dir) => {
    const next = [...items];
    [next[i], next[i + dir]] = [next[i + dir], next[i]];
    onChange(next);
  };
  return (
    <div className="space-y-3">
      {items.map((item, i) => (
        <div key={i} className="rounded-xl border border-white/10 p-3 space-y-3" style={{ background: 'rgba(255,255,255,0.02)' }}>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-purple-300/80">#{i + 1}</span>
            <div className="flex items-center gap-1 text-white/35">
              <button type="button" disabled={i === 0} onClick={() => move(i, -1)} className="p-1 hover:text-white disabled:opacity-30" aria-label="Move up"><ArrowUp className="w-3.5 h-3.5" /></button>
              <button type="button" disabled={i === items.length - 1} onClick={() => move(i, 1)} className="p-1 hover:text-white disabled:opacity-30" aria-label="Move down"><ArrowDown className="w-3.5 h-3.5" /></button>
              <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))} className="p-1 hover:text-red-400" aria-label="Remove"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          </div>
          {renderItem(item, (field, value) => set(i, field, value), i)}
        </div>
      ))}
      <button type="button" className="btn-outline py-2 w-full justify-center text-xs" onClick={() => onChange([...items, factory()])}>
        <Plus className="w-4 h-4" /> {addLabel}
      </button>
    </div>
  );
}

export function PersonalEditor({ resume, update }) {
  const p = resume.personal;
  const set = (field, value) => update(r => ({ ...r, personal: { ...r.personal, [field]: value } }));
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <Field label="Full name" value={p.name} onChange={e => set('name', e.target.value)} placeholder="Sahil Shaikh" />
      <Field label="Headline" value={p.title} onChange={e => set('title', e.target.value)} placeholder="MCA Student | Software Engineer" />
      <Field label="Email" value={p.email} onChange={e => set('email', e.target.value)} placeholder="you@email.com" />
      <Field label="Phone" value={p.phone} onChange={e => set('phone', e.target.value)} placeholder="+91 98765 43210" />
      <Field label="Location" value={p.location} onChange={e => set('location', e.target.value)} placeholder="Pune, India" />
      <Field label="LinkedIn" value={p.linkedin} onChange={e => set('linkedin', e.target.value)} placeholder="linkedin.com/in/username" />
      <Field label="GitHub" value={p.github} onChange={e => set('github', e.target.value)} placeholder="github.com/username" />
      <Field label="Portfolio" value={p.website} onChange={e => set('website', e.target.value)} placeholder="yourname.dev" />
    </div>
  );
}

export function SummaryEditor({ resume, update, ai }) {
  return (
    <div className="space-y-3">
      <Area rows={5} value={resume.summary} hint={BULLET_HINT.split('. ')[1]}
        onChange={e => update(r => ({ ...r, summary: e.target.value }))}
        placeholder="2-3 lines on who you are, your strongest skills and what role you want" />
      <AIButton loading={ai.loading === 'summary'} onClick={() => ai.run('summary', 'summary', resume.summary, text => update(r => ({ ...r, summary: text })))}>
        {resume.summary ? 'Improve with AI' : 'Write with AI'}
      </AIButton>
    </div>
  );
}

export function ExperienceEditor({ resume, update, ai }) {
  return (
    <ItemList items={resume.experience} factory={emptyExperience} addLabel="Add experience"
      onChange={items => update(r => ({ ...r, experience: items }))}
      renderItem={(e, set, i) => (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Company" value={e.company} onChange={ev => set('company', ev.target.value)} />
            <Field label="Role" value={e.role} onChange={ev => set('role', ev.target.value)} />
            <Field label="Start" placeholder="Jan 2024" value={e.start} onChange={ev => set('start', ev.target.value)} />
            <Field label="End" placeholder="Present" value={e.end} onChange={ev => set('end', ev.target.value)} />
          </div>
          <Field label="Location" value={e.location} onChange={ev => set('location', ev.target.value)} />
          <Area label="What you did" hint={BULLET_HINT} rows={5} value={e.bullets} onChange={ev => set('bullets', ev.target.value)} />
          <AIButton loading={ai.loading === `exp-${i}`}
            onClick={() => ai.run(`exp-${i}`, 'bullets', e.bullets, text => set('bullets', text), { role: e.role, company: e.company })}>
            {e.bullets ? 'Improve bullets' : 'Write bullets'}
          </AIButton>
        </>
      )} />
  );
}

export function EducationEditor({ resume, update }) {
  return (
    <ItemList items={resume.education} factory={emptyEducation} addLabel="Add education"
      onChange={items => update(r => ({ ...r, education: items }))}
      renderItem={(e, set) => (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="College / School" value={e.school} onChange={ev => set('school', ev.target.value)} />
            <Field label="Location" value={e.location} onChange={ev => set('location', ev.target.value)} />
            <Field label="Degree" value={e.degree} onChange={ev => set('degree', ev.target.value)} placeholder="MCA / B.Tech / HSC" />
            <Field label="CGPA / Percentage" value={e.score} onChange={ev => set('score', ev.target.value)} placeholder="CGPA: 8.6" />
            <Field label="Start" value={e.start} onChange={ev => set('start', ev.target.value)} placeholder="Jul 2022" />
            <Field label="End" value={e.end} onChange={ev => set('end', ev.target.value)} placeholder="Jun 2025" />
          </div>
          <Area label="Details (optional)" hint="Coursework, achievements, HSC/SSC marks — one per line" rows={2} value={e.details} onChange={ev => set('details', ev.target.value)} />
        </>
      )} />
  );
}

export function ProjectsEditor({ resume, update, ai }) {
  return (
    <ItemList items={resume.projects} factory={emptyProject} addLabel="Add project"
      onChange={items => update(r => ({ ...r, projects: items }))}
      renderItem={(p, set, i) => (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Project name" value={p.name} onChange={ev => set('name', ev.target.value)} />
            <Field label="Type / Role" value={p.role} onChange={ev => set('role', ev.target.value)} placeholder="Individual Project" />
            <Field label="Start" value={p.start} onChange={ev => set('start', ev.target.value)} placeholder="Jan 2026" />
            <Field label="End" value={p.end} onChange={ev => set('end', ev.target.value)} placeholder="Present" />
          </div>
          <Field label="GitHub / Live link" value={p.link} onChange={ev => set('link', ev.target.value)} />
          <Area label="What you built" hint={BULLET_HINT} rows={5} value={p.bullets} onChange={ev => set('bullets', ev.target.value)} />
          <Field label="Technologies / Tools used" value={p.tech} onChange={ev => set('tech', ev.target.value)} placeholder="React, Node.js, MongoDB" />
          <AIButton loading={ai.loading === `proj-${i}`}
            onClick={() => ai.run(`proj-${i}`, 'bullets', p.bullets, text => set('bullets', text), { role: `${p.role || 'Project'}: ${p.name}`, company: p.tech })}>
            {p.bullets ? 'Improve bullets' : 'Write bullets'}
          </AIButton>
        </>
      )} />
  );
}

export function SkillsEditor({ resume, update, ai }) {
  return (
    <div className="space-y-3">
      <ItemList items={resume.skills} factory={emptySkill} addLabel="Add skill group"
        onChange={items => update(r => ({ ...r, skills: items }))}
        renderItem={(s, set) => (
          <div className="grid grid-cols-1 sm:grid-cols-[2fr_3fr] gap-3">
            <Field label="Group" value={s.label} onChange={ev => set('label', ev.target.value)} placeholder="Programming Languages" />
            <Field label="Skills (comma-separated)" value={s.items} onChange={ev => set('items', ev.target.value)} placeholder="Java, Python, JavaScript" />
          </div>
        )} />
      <AIButton loading={ai.loading === 'skills'}
        onClick={() => ai.run('skills', 'skills', resume.skills.map(s => s.items).join(', '),
          text => update(r => ({ ...r, skills: [...r.skills.filter(s => s.items.trim() || s.label.trim()), { label: 'Suggested', items: text }] })))}>
        Suggest skills with AI
      </AIButton>
    </div>
  );
}

export function ListEditor({ value, onChange, placeholder }) {
  return <Area rows={4} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} hint={BULLET_HINT} />;
}
