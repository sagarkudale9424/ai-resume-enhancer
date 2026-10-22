'use client';
import { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search, FileText, Pencil, Download, MoreVertical, Copy, Trash2, ChevronsUpDown, Upload, FilePlus2, UserCheck,
  Wand2, Loader, X, AlertCircle, Sparkles, ArrowLeft,
} from 'lucide-react';
import ResumeDocument, { printResume } from './ResumeDocument';
import { RatingBadge } from './Panels';
import { readiness } from './readiness';
import { emptyResume, sampleResume, fromProfile, fromImported, normalizeResume, PAGE_WIDTH } from './resumeData';
import { resumesAPI, profileAPI } from '../../lib/api';

const SORTS = {
  title: (a, b) => (a.title || '').localeCompare(b.title || ''),
  readiness: (a, b) => (a.readiness ?? -1) - (b.readiness ?? -1),
  updatedAt: (a, b) => new Date(a.updatedAt) - new Date(b.updatedAt),
};

function SortHeader({ label, field, sort, setSort, className = '' }) {
  return (
    <button onClick={() => setSort(s => ({ field, dir: s.field === field && s.dir === 'desc' ? 'asc' : 'desc' }))}
      className={`flex items-center gap-1 text-sm font-medium ${sort.field === field ? 'text-white' : 'text-white/60'} hover:text-white ${className}`}>
      {label} <ChevronsUpDown className="w-3.5 h-3.5" />
    </button>
  );
}

const MENU_WIDTH = 160;
const MENU_HEIGHT = 88;

// Rendered with position: fixed so the table's rounded, overflow-hidden
// container can't clip it; opens upwards when there is no room below.
function RowMenu({ onDuplicate, onDelete }) {
  const [pos, setPos] = useState(null);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);

  function toggle() {
    if (pos) return setPos(null);
    const rect = buttonRef.current.getBoundingClientRect();
    const below = window.innerHeight - rect.bottom >= MENU_HEIGHT + 12;
    setPos({
      top: below ? rect.bottom + 6 : rect.top - MENU_HEIGHT - 6,
      left: Math.max(8, rect.right - MENU_WIDTH),
    });
  }

  useEffect(() => {
    if (!pos) return;
    const close = e => {
      if (!menuRef.current?.contains(e.target) && !buttonRef.current?.contains(e.target)) setPos(null);
    };
    const closeNow = () => setPos(null);
    const onKey = e => { if (e.key === 'Escape') setPos(null); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', closeNow);
    window.addEventListener('scroll', closeNow, true);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', closeNow);
      window.removeEventListener('scroll', closeNow, true);
    };
  }, [pos]);

  return (
    <>
      <button ref={buttonRef} onClick={toggle} aria-haspopup="menu" aria-expanded={Boolean(pos)}
        className="w-9 h-9 flex items-center justify-center rounded-lg border border-white/10 text-white/60 hover:text-white hover:border-white/30" aria-label="More actions">
        <MoreVertical className="w-4 h-4" />
      </button>
      {pos && (
        <div ref={menuRef} role="menu" className="fixed rounded-xl border border-white/10 shadow-2xl z-50 py-1"
          style={{ top: pos.top, left: pos.left, width: MENU_WIDTH, background: '#15151f' }}>
          <button role="menuitem" onClick={() => { setPos(null); onDuplicate(); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/80 hover:bg-purple-500/10"><Copy className="w-4 h-4" />Duplicate</button>
          <button role="menuitem" onClick={() => { setPos(null); onDelete(); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10"><Trash2 className="w-4 h-4" />Delete</button>
        </div>
      )}
    </>
  );
}

const LEVELS = ['Student / Fresher', '1-3 years', '3-5 years', '5+ years'];

function GenerateForm({ onBack, onGenerated }) {
  const [form, setForm] = useState({ targetRole: '', level: LEVELS[0], skills: '', education: '', background: '' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  async function submit(e) {
    e.preventDefault();
    if (!form.targetRole.trim()) return setError('Which role are you applying for?');
    if (form.background.trim().length < 20) return setError('Write a few lines about your experience or projects.');
    setBusy(true);
    setError('');
    try {
      const [generated, profile] = await Promise.all([
        resumesAPI.generate(form),
        profileAPI.get().catch(() => ({ user: {} })),
      ]);
      const draft = fromProfile(normalizeResume({ ...generated.data, title: `${form.targetRole} Resume` }), profile.user || {});
      // Keep the AI-tailored headline rather than the profile's generic one
      draft.personal.title = generated.data.personal?.title || draft.personal.title;
      await onGenerated(draft);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <button type="button" onClick={onBack} className="text-xs text-white/50 hover:text-white flex items-center gap-1"><ArrowLeft className="w-3.5 h-3.5" />Back</button>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-white/45">Target role *</label>
          <input className="input py-2" value={form.targetRole} onChange={e => set('targetRole', e.target.value)} placeholder="Java Backend Developer" />
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-white/45">Experience</label>
          <select className="input py-2" value={form.level} onChange={e => set('level', e.target.value)}>
            {LEVELS.map(l => <option key={l}>{l}</option>)}
          </select>
        </div>
      </div>
      <div className="space-y-1">
        <label className="text-[11px] font-medium text-white/45">Skills</label>
        <input className="input py-2" value={form.skills} onChange={e => set('skills', e.target.value)} placeholder="Java, Spring Boot, React, MySQL, Docker" />
      </div>
      <div className="space-y-1">
        <label className="text-[11px] font-medium text-white/45">Education</label>
        <input className="input py-2" value={form.education} onChange={e => set('education', e.target.value)} placeholder="MCA, MIT WPU Pune, 2025-2027, CGPA 7.0" />
      </div>
      <div className="space-y-1">
        <label className="text-[11px] font-medium text-white/45">About you — experience, projects, achievements *</label>
        <textarea className="textarea" rows={5} value={form.background} onChange={e => set('background', e.target.value)}
          placeholder="e.g. Built AVIRO, a ride-sharing app for students with Spring Boot and React (OTP login, live GPS, UPI payments). 6-month internship at Acme building REST APIs. Won a college hackathon." />
      </div>
      {error && <p className="text-sm text-red-400 flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</p>}
      <button type="submit" className="btn-primary w-full justify-center py-3" disabled={busy}>
        {busy ? <><Loader className="w-4 h-4 animate-spin" />Writing your resume… (~15 seconds)</> : <><Sparkles className="w-4 h-4" />Generate my resume</>}
      </button>
      <p className="text-[11px] text-white/35 text-center">AI uses only what you write. Placeholders in [brackets] are for you to fill in.</p>
    </form>
  );
}

function CreateModal({ onClose, onCreate }) {
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState('choose');
  const fileRef = useRef(null);

  async function run(kind, fn) {
    setBusy(kind);
    setError('');
    try {
      await onCreate(await fn());
    } catch (err) {
      setError(err.message);
      setBusy('');
    }
  }

  const options = [
    { id: 'ai', icon: Sparkles, title: 'Generate with AI', desc: 'Answer 4 quick questions — AI writes a complete first draft', onClick: () => setStep('ai') },
    { id: 'upload', icon: Upload, title: 'Upload existing resume', desc: 'AI reads your PDF and fills every section for you', onClick: () => fileRef.current?.click() },
    { id: 'profile', icon: UserCheck, title: 'Start from my profile', desc: 'Prefill contact details, summary and skills', onClick: () => run('profile', async () => fromProfile(emptyResume(), (await profileAPI.get()).user || {})) },
    { id: 'blank', icon: FilePlus2, title: 'Blank resume', desc: 'Start from scratch with the Classic template', onClick: () => run('blank', async () => emptyResume()) },
    { id: 'sample', icon: Wand2, title: 'See a sample', desc: 'A filled example you can edit', onClick: () => run('sample', async () => sampleResume()) },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative w-full max-w-lg card p-6 space-y-4 max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">{step === 'ai' ? 'Generate with AI' : 'Create a resume'}</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        {step === 'ai' && <GenerateForm onBack={() => setStep('choose')} onGenerated={onCreate} />}
        <input ref={fileRef} type="file" accept="application/pdf" className="hidden"
          onChange={e => {
            const file = e.target.files?.[0];
            if (file) run('upload', async () => fromImported((await resumesAPI.importPdf(file)).data, file.name));
          }} />
        <div className={`space-y-2 ${step === 'choose' ? '' : 'hidden'}`}>
          {options.map(({ id, icon: Icon, title, desc, onClick }) => (
            <button key={id} onClick={onClick} disabled={Boolean(busy)}
              className="w-full flex items-center gap-4 p-4 rounded-xl border border-white/10 hover:border-purple-500/60 hover:bg-purple-500/5 text-left transition-all disabled:opacity-60">
              <span className="w-10 h-10 rounded-xl bg-purple-500/15 flex items-center justify-center shrink-0">
                {busy === id ? <Loader className="w-5 h-5 text-purple-300 animate-spin" /> : <Icon className="w-5 h-5 text-purple-300" />}
              </span>
              <span>
                <span className="block text-sm font-semibold text-white">{title}</span>
                <span className="block text-xs text-white/50">{busy === 'upload' && id === 'upload' ? 'Reading your resume with AI… this takes ~10 seconds' : desc}</span>
              </span>
            </button>
          ))}
        </div>
        {error && <p className="text-sm text-red-400 flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</p>}
      </div>
    </div>
  );
}

export default function ResumeList({ activeId, onOpen }) {
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState({ field: 'updatedAt', dir: 'desc' });
  const [showCreate, setShowCreate] = useState(false);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await resumesAPI.list();
      setResumes(res.data || []);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = resumes.filter(r => (r.title || '').toLowerCase().includes(q));
    list.sort(SORTS[sort.field]);
    return sort.dir === 'desc' ? list.reverse() : list;
  }, [resumes, query, sort]);

  async function create(resume) {
    const res = await resumesAPI.create({ ...resume, readiness: readiness(resume, 1).score });
    onOpen(res.data._id, resume);
  }

  async function withResume(id, fn) {
    setBusyId(id);
    try {
      const { _id, userId, createdAt, updatedAt, ...data } = (await resumesAPI.get(id)).data;
      await fn(normalizeResume(data));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  const download = id => withResume(id, async r => { if (!printResume(r)) setError('Please allow pop-ups for this site to export the PDF.'); });
  const duplicate = id => withResume(id, async r => {
    const { shareId, ...copy } = r;
    await resumesAPI.create({ ...copy, title: `${r.title} (copy)`, readiness: readiness(copy, 1).score });
    await load();
  });
  const open = id => withResume(id, async r => onOpen(id, r));
  async function remove(id, title) {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return;
    await resumesAPI.remove(id).catch(err => setError(err.message));
    load();
  }

  const thumbScale = 0.2;
  const sample = useMemo(() => sampleResume(), []);

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 p-6 sm:p-8 flex flex-col md:flex-row md:items-center gap-6"
        style={{ background: 'radial-gradient(ellipse at 30% 0%, rgba(124,58,237,0.35), transparent 60%), linear-gradient(135deg, #14141f, #0e0e16)' }}>
        <div className="hidden sm:block relative shrink-0" style={{ width: 200, height: 150 }}>
          {[{ r: -6, x: 0 }, { r: 4, x: 50 }].map((pos, i) => (
            <div key={i} className="absolute top-0 overflow-hidden rounded-md shadow-2xl" style={{ left: pos.x, width: PAGE_WIDTH * thumbScale * 0.95, height: 160, transform: `rotate(${pos.r}deg)`, background: '#fff' }}>
              <div style={{ transform: `scale(${thumbScale * 0.95})`, transformOrigin: 'top left', width: PAGE_WIDTH }}>
                <ResumeDocument resume={i ? sample : { ...sample, template: 'modern', style: { ...sample.style, font: 'sans', accent: '#6d28d9' } }} />
              </div>
            </div>
          ))}
        </div>
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-semibold text-white leading-snug">Build a resume that actually gets shortlisted</h1>
          <p className="text-white/55 mt-2 text-sm sm:text-base max-w-xl">ATS-friendly templates, AI writing for every section, live readiness score and one-click PDF export.</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary px-6 py-3 text-sm justify-center shadow-lg shadow-purple-900/40">
          <FilePlus2 className="w-4 h-4" /> Upload or Create Resume
        </button>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-semibold text-white">Continue where you left off</h2>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input className="input pl-11 py-3" placeholder="Search" value={query} onChange={e => setQuery(e.target.value)} />
        </div>

        {error && <p className="text-sm text-red-400 flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</p>}

        <div className="rounded-2xl border border-white/10 overflow-hidden" style={{ background: '#101018' }}>
          <div className="hidden md:grid grid-cols-[minmax(0,5fr)_2fr_2fr_2fr] gap-4 px-6 py-4 border-b border-white/10">
            <SortHeader label="Name" field="title" sort={sort} setSort={setSort} />
            <SortHeader label="Readiness Rating" field="readiness" sort={sort} setSort={setSort} />
            <span className="text-sm font-medium text-white/60">Actions</span>
            <SortHeader label="Updated At" field="updatedAt" sort={sort} setSort={setSort} />
          </div>

          {loading && <div className="flex items-center justify-center gap-2 py-16 text-white/40"><Loader className="w-5 h-5 animate-spin" />Loading resumes…</div>}

          {!loading && rows.length === 0 && (
            <div className="py-16 text-center space-y-3">
              <FileText className="w-10 h-10 text-white/20 mx-auto" />
              <p className="text-white/50 text-sm">{query ? 'No resumes match your search.' : 'No resumes yet — create your first one.'}</p>
              {!query && <button onClick={() => setShowCreate(true)} className="btn-primary mx-auto">Create resume</button>}
            </div>
          )}

          {rows.map(r => {
            const active = r._id === activeId;
            return (
              <div key={r._id}
                className={`grid grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[minmax(0,5fr)_2fr_2fr_2fr] gap-3 md:gap-4 items-center px-4 md:px-6 py-4 border-b border-white/5 last:border-0 transition-colors ${active ? 'border-l-2 border-l-purple-500' : 'hover:bg-purple-500/5'}`}
                style={active ? { background: 'linear-gradient(90deg, rgba(124,58,237,0.18), transparent)' } : undefined}>
                <button onClick={() => open(r._id)} className="flex items-center gap-3 min-w-0 text-left">
                  <span className="w-10 h-10 rounded-xl border border-purple-500/30 bg-purple-500/10 flex items-center justify-center shrink-0">
                    {busyId === r._id ? <Loader className="w-4 h-4 text-purple-300 animate-spin" /> : <FileText className="w-4 h-4 text-purple-300" />}
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white truncate">{r.title || 'Untitled Resume'}</span>
                      {active && <span className="text-[10px] px-2 py-0.5 rounded-full border border-purple-500/40 text-purple-300 shrink-0">● Active</span>}
                    </span>
                    <span className="md:hidden text-xs text-white/40">{new Date(r.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  </span>
                </button>
                <div className="hidden md:block">{r.readiness != null ? <RatingBadge score={r.readiness} /> : <span className="text-xs text-white/30">—</span>}</div>
                <div className="flex items-center gap-2 justify-end md:justify-start">
                  <button onClick={() => open(r._id)} className="w-9 h-9 flex items-center justify-center rounded-lg border border-white/10 text-white/60 hover:text-white hover:border-white/30" aria-label="Edit"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => download(r._id)} className="w-9 h-9 flex items-center justify-center rounded-lg border border-white/10 text-white/60 hover:text-white hover:border-white/30" aria-label="Download PDF"><Download className="w-4 h-4" /></button>
                  <RowMenu onDuplicate={() => duplicate(r._id)} onDelete={() => remove(r._id, r.title)} />
                </div>
                <span className="hidden md:block text-sm text-white/70">{new Date(r.updatedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
              </div>
            );
          })}
        </div>
      </div>

      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onCreate={async resume => { await create(resume); setShowCreate(false); }} />}
    </div>
  );
}
