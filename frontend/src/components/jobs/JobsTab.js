'use client';
import { useState, useEffect, useMemo } from 'react';
import {
  Plus, Search, Building2, MapPin, ExternalLink, Calendar, Trash2, X, Loader, AlertCircle, BellRing, FileText, Briefcase,
} from 'lucide-react';
import { jobsAPI, resumesAPI } from '../../lib/api';

export const COLUMNS = [
  { id: 'wishlist', label: 'Wishlist', color: '#a78bfa' },
  { id: 'applied', label: 'Applied', color: '#60a5fa' },
  { id: 'interview', label: 'Interview', color: '#fbbf24' },
  { id: 'offer', label: 'Offer', color: '#4ade80' },
  { id: 'rejected', label: 'Rejected', color: '#f87171' },
];

const EMPTY_JOB = { company: '', role: '', location: '', link: '', salary: '', status: 'wishlist', appliedOn: '', followUpOn: '', resumeId: '', notes: '' };
const today = () => new Date().toISOString().slice(0, 10);
const prettyDate = d => (d ? new Date(`${d}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : '');
const safeLink = url => (/^https?:\/\//i.test(url) ? url : `https://${url}`);

function JobModal({ job, resumes, onClose, onSave, onDelete }) {
  const [form, setForm] = useState({ ...EMPTY_JOB, ...job });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  async function submit(e) {
    e.preventDefault();
    if (!form.company.trim() || !form.role.trim()) return setError('Company and role are required');
    setSaving(true);
    setError('');
    try {
      await onSave(form);
      onClose();
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <form onSubmit={submit} onClick={e => e.stopPropagation()} className="relative w-full max-w-xl card p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">{job._id ? 'Edit application' : 'Add application'}</h2>
          <button type="button" onClick={onClose} className="text-white/40 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            ['company', 'Company *', 'Google'], ['role', 'Role *', 'Software Engineer'],
            ['location', 'Location', 'Bengaluru / Remote'], ['salary', 'Salary / CTC', '12 LPA'],
          ].map(([field, label, placeholder]) => (
            <div key={field} className="space-y-1">
              <label className="text-[11px] font-medium text-white/45">{label}</label>
              <input className="input py-2" value={form[field]} placeholder={placeholder} onChange={e => set(field, e.target.value)} />
            </div>
          ))}
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-white/45">Job posting link</label>
          <input className="input py-2" value={form.link} placeholder="https://…" onChange={e => set('link', e.target.value)} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-white/45">Status</label>
            <select className="input py-2" value={form.status} onChange={e => {
              const status = e.target.value;
              setForm(f => ({ ...f, status, appliedOn: status !== 'wishlist' && !f.appliedOn ? today() : f.appliedOn }));
            }}>
              {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-white/45">Applied on</label>
            <input type="date" className="input py-2" value={form.appliedOn} onChange={e => set('appliedOn', e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-white/45">Follow up on</label>
            <input type="date" className="input py-2" value={form.followUpOn} onChange={e => set('followUpOn', e.target.value)} />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-white/45">Resume used</label>
          <select className="input py-2" value={form.resumeId} onChange={e => set('resumeId', e.target.value)}>
            <option value="">—</option>
            {resumes.map(r => <option key={r._id} value={r._id}>{r.title}</option>)}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-white/45">Notes</label>
          <textarea className="textarea" rows={4} value={form.notes} placeholder="Recruiter name, interview rounds, questions asked…" onChange={e => set('notes', e.target.value)} />
        </div>
        {error && <p className="text-sm text-red-400 flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</p>}
        <div className="flex items-center justify-between gap-2">
          {job._id ? (
            <button type="button" onClick={() => onDelete(job)} className="btn-secondary text-red-400"><Trash2 className="w-4 h-4" /> Delete</button>
          ) : <span />}
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving && <Loader className="w-4 h-4 animate-spin" />} {job._id ? 'Save changes' : 'Add application'}
          </button>
        </div>
      </form>
    </div>
  );
}

function JobCard({ job, resumeTitle, onOpen, onDragStart, onMove }) {
  const due = job.followUpOn && job.followUpOn <= today() && ['applied', 'interview'].includes(job.status);
  return (
    <div draggable onDragStart={e => onDragStart(e, job)} onClick={() => onOpen(job)}
      className="rounded-xl border border-white/10 p-3 space-y-2 cursor-pointer hover:border-purple-500/50 transition-all"
      style={{ background: '#15151f' }}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white truncate">{job.role}</p>
          <p className="text-xs text-white/55 flex items-center gap-1 truncate"><Building2 className="w-3 h-3 shrink-0" />{job.company}</p>
        </div>
        {job.link && (
          <a href={safeLink(job.link)} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-white/40 hover:text-purple-300" aria-label="Open job posting">
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-white/40">
        {job.location && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{job.location}</span>}
        {job.appliedOn && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{prettyDate(job.appliedOn)}</span>}
        {resumeTitle && <span className="flex items-center gap-1"><FileText className="w-3 h-3" />{resumeTitle}</span>}
      </div>
      {due && <p className="text-[11px] text-amber-300 flex items-center gap-1"><BellRing className="w-3 h-3" />Follow up due</p>}
      {/* Touch screens can't drag: quick status switch */}
      <select value={job.status} onClick={e => e.stopPropagation()} onChange={e => onMove(job, e.target.value)}
        className="md:hidden w-full text-xs rounded-lg py-1 px-2 border border-white/10" aria-label="Move to">
        {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
      </select>
    </div>
  );
}

export default function JobsTab({ active = true }) {
  const [jobs, setJobs] = useState([]);
  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState(null);
  const [overColumn, setOverColumn] = useState(null);

  useEffect(() => { if (active) load(); }, [active]);

  async function load() {
    setLoading(true);
    try {
      const [jobRes, resumeRes] = await Promise.all([jobsAPI.list(), resumesAPI.list().catch(() => ({ data: [] }))]);
      setJobs(jobRes.data || []);
      setResumes(resumeRes.data || []);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function save(form) {
    const { _id, userId, createdAt, updatedAt, ...job } = form;
    if (_id) {
      const res = await jobsAPI.update(_id, job);
      setJobs(list => list.map(j => (j._id === _id ? res.data : j)));
    } else {
      const res = await jobsAPI.create(job);
      setJobs(list => [res.data, ...list]);
    }
  }

  async function move(job, status) {
    if (job.status === status) return;
    const patch = { status, ...(status !== 'wishlist' && !job.appliedOn ? { appliedOn: today() } : {}) };
    setJobs(list => list.map(j => (j._id === job._id ? { ...j, ...patch } : j)));
    try {
      await jobsAPI.update(job._id, patch);
    } catch (err) {
      setError(err.message);
      setJobs(list => list.map(j => (j._id === job._id ? job : j)));
    }
  }

  async function remove(job) {
    if (!confirm(`Delete ${job.role} at ${job.company}?`)) return;
    try {
      await jobsAPI.remove(job._id);
      setJobs(list => list.filter(j => j._id !== job._id));
      setEditing(null);
    } catch (err) {
      setError(err.message);
    }
  }

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? jobs.filter(j => `${j.company} ${j.role} ${j.location} ${j.notes}`.toLowerCase().includes(q)) : jobs;
  }, [jobs, query]);

  const count = status => jobs.filter(j => j.status === status).length;
  const appliedTotal = jobs.filter(j => j.status !== 'wishlist').length;
  const responses = count('interview') + count('offer');
  const resumeTitles = Object.fromEntries(resumes.map(r => [r._id, r.title]));

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          ['Applications', appliedTotal],
          ['Interviews', count('interview')],
          ['Offers', count('offer')],
          ['Response rate', appliedTotal ? `${Math.round((responses / appliedTotal) * 100)}%` : '—'],
        ].map(([label, value]) => (
          <div key={label} className="card p-4">
            <p className="text-2xl font-bold text-white">{value}</p>
            <p className="text-xs text-white/45">{label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input className="input pl-11" placeholder="Search company, role, notes…" value={query} onChange={e => setQuery(e.target.value)} />
        </div>
        <button className="btn-primary justify-center" onClick={() => setEditing({ ...EMPTY_JOB })}><Plus className="w-4 h-4" /> Add application</button>
      </div>

      {error && <p className="text-sm text-red-400 flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</p>}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-white/40"><Loader className="w-5 h-5 animate-spin" />Loading applications…</div>
      ) : jobs.length === 0 ? (
        <div className="card p-10 text-center space-y-3">
          <Briefcase className="w-10 h-10 text-white/20 mx-auto" />
          <p className="text-white/70 font-medium">Track every job you apply to</p>
          <p className="text-sm text-white/40">Add applications, drag them between stages and get follow-up reminders.</p>
          <button className="btn-primary mx-auto" onClick={() => setEditing({ ...EMPTY_JOB })}><Plus className="w-4 h-4" /> Add your first application</button>
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2 snap-x">
          {COLUMNS.map(col => {
            const items = visible.filter(j => j.status === col.id);
            return (
              <div key={col.id}
                onDragOver={e => { e.preventDefault(); setOverColumn(col.id); }}
                onDragLeave={() => setOverColumn(c => (c === col.id ? null : c))}
                onDrop={e => {
                  e.preventDefault();
                  setOverColumn(null);
                  const job = jobs.find(j => j._id === e.dataTransfer.getData('text/plain'));
                  if (job) move(job, col.id);
                }}
                className={`snap-start shrink-0 w-[260px] lg:w-auto lg:flex-1 rounded-2xl border p-3 space-y-3 transition-colors ${overColumn === col.id ? 'border-purple-400' : 'border-white/10'}`}
                style={{ background: 'rgba(255,255,255,0.02)', minHeight: 320 }}>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm font-semibold text-white">
                    <span className="w-2 h-2 rounded-full" style={{ background: col.color }} />{col.label}
                  </span>
                  <span className="text-xs text-white/40">{items.length}</span>
                </div>
                {items.map(job => (
                  <JobCard key={job._id} job={job} resumeTitle={resumeTitles[job.resumeId]} onOpen={setEditing} onMove={move}
                    onDragStart={(e, j) => { e.dataTransfer.setData('text/plain', j._id); e.dataTransfer.effectAllowed = 'move'; }} />
                ))}
                {items.length === 0 && <p className="text-xs text-white/25 text-center py-6">Drop here</p>}
              </div>
            );
          })}
        </div>
      )}

      {editing && <JobModal job={editing} resumes={resumes} onClose={() => setEditing(null)} onSave={save} onDelete={remove} />}
    </div>
  );
}
