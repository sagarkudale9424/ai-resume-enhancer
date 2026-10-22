'use client';
import { useState } from 'react';
import { CheckCircle2, XCircle, Loader, Sparkles, Plus, Minimize2, Target, AlertCircle, Wand2 } from 'lucide-react';
import ResumeDocument from './ResumeDocument';
import { TEMPLATES, TEMPLATE_FONTS, ACCENTS, FONTS, FONT_SIZES, DENSITIES, PAGE_WIDTH, sectionTitle, resumeToText } from './resumeData';
import { readiness, ratingFor, TONE_CLASSES, findWeakPhrases } from './readiness';
import { AIButton } from './SectionEditors';
import { resumeAPI } from '../../lib/api';

function Group({ title, children }) {
  return (
    <div className="rounded-2xl border border-white/10 p-4 space-y-3" style={{ background: 'rgba(255,255,255,0.02)' }}>
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      {children}
    </div>
  );
}

function Segmented({ options, value, onChange }) {
  return (
    <div className="flex rounded-xl border border-white/10 p-1 gap-1">
      {options.map(o => (
        <button key={o.id} type="button" onClick={() => onChange(o.id)}
          className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${value === o.id ? 'bg-purple-600 text-white' : 'text-white/50 hover:text-white'}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function ScoreRing({ score, size = 96 }) {
  const r = size / 2 - 8;
  const c = 2 * Math.PI * r;
  const color = score >= 85 ? '#4ade80' : score >= 70 ? '#fbbf24' : score >= 50 ? '#fb923c' : '#f87171';
  return (
    <svg width={size} height={size} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="8" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c - (score / 100) * c} transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fill={color} fontSize={size / 4.2} fontWeight="700">{score}</text>
    </svg>
  );
}

export function RatingBadge({ score }) {
  const { label, tone } = ratingFor(score);
  return <span className={`inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-full border ${TONE_CLASSES[tone]}`}>{label}</span>;
}

export function CustomizePanel({ resume, update }) {
  const setStyle = (field, value) => update(r => ({ ...r, style: { ...r.style, [field]: value } }));
  const thumbScale = 150 / PAGE_WIDTH;

  return (
    <div className="space-y-4">
      <Group title="Choose a template">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {TEMPLATES.map(t => (
            <button key={t.id} type="button" aria-label={`${t.label} template`} aria-pressed={resume.template === t.id}
              onClick={() => update(r => ({ ...r, template: t.id, style: { ...r.style, font: TEMPLATE_FONTS[t.id] } }))}
              className={`rounded-xl overflow-hidden border-2 transition-all text-left ${resume.template === t.id ? 'border-purple-500 shadow-lg shadow-purple-900/40' : 'border-transparent hover:border-white/20'}`}>
              <div className="overflow-hidden pointer-events-none" aria-hidden="true" style={{ height: 190, background: '#fff' }}>
                <div style={{ transform: `scale(${thumbScale})`, transformOrigin: 'top left', width: PAGE_WIDTH }}>
                  <ResumeDocument resume={{ ...resume, template: t.id, style: { ...resume.style, font: TEMPLATE_FONTS[t.id] } }} />
                </div>
              </div>
              <div className="px-2 py-2" style={{ background: '#0d0d14' }}>
                <p className="text-xs font-semibold text-white">{t.label}</p>
                <p className="text-[10px] text-white/40 leading-tight">{t.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </Group>

      <Group title="Padding & Spacing">
        <Segmented options={DENSITIES} value={resume.style.density} onChange={v => setStyle('density', v)} />
      </Group>

      <Group title="Text Size & Font">
        <Segmented options={FONT_SIZES} value={resume.style.fontSize} onChange={v => setStyle('fontSize', v)} />
        <Segmented options={FONTS} value={resume.style.font} onChange={v => setStyle('font', v)} />
      </Group>

      <Group title="Accent colour">
        {resume.template === 'classic' && <p className="text-xs text-white/40">The Classic template is always black & white (best for ATS). Pick another template to use colour.</p>}
        <div className="flex gap-2">
          {ACCENTS.map(c => (
            <button key={c} type="button" onClick={() => setStyle('accent', c)} aria-label={`Accent ${c}`}
              className={`w-8 h-8 rounded-full border border-white/20 transition-transform ${resume.style.accent === c ? 'ring-2 ring-purple-400 ring-offset-2 ring-offset-[#0d0d14] scale-110' : ''}`}
              style={{ background: c }} />
          ))}
        </div>
      </Group>

      <Group title="Section headings">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {resume.order.filter(id => !id.startsWith('custom:')).map(id => (
            <input key={id} className="input py-2" value={sectionTitle(resume, id)}
              onChange={e => update(r => ({ ...r, titles: { ...r.titles, [id]: e.target.value } }))} />
          ))}
        </div>
      </Group>
    </div>
  );
}

function AIReport({ report }) {
  return (
    <div className="space-y-4">
      {report.matched_keywords?.length > 0 && (
        <div>
          <p className="label mb-2">Matched keywords</p>
          <div className="flex flex-wrap gap-1.5">
            {report.matched_keywords.map(k => <span key={k} className="badge bg-green-500/10 text-green-400 border border-green-500/20">{k}</span>)}
          </div>
        </div>
      )}
      {['strengths', 'weaknesses', 'critical_fixes', 'suggestions'].map(key => report[key]?.length > 0 && (
        <div key={key}>
          <p className="label mb-2">{key.replace('_', ' ')}</p>
          <ul className="space-y-1.5">
            {report[key].map((s, i) => (
              <li key={i} className="text-sm text-white/75 flex gap-2"><span className="text-purple-400">→</span>{s}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function WeakPhrases({ resume }) {
  const found = findWeakPhrases(resume);
  if (!found.length) return null;
  return (
    <Group title={`Weak phrases (${found.length})`}>
      <p className="text-xs text-white/50">These read as passive or vague to recruiters. Rewrite them, or use "Improve bullets" in Edit Content.</p>
      <ul className="space-y-2">
        {found.slice(0, 12).map((w, i) => (
          <li key={i} className="rounded-xl border border-amber-500/20 p-3" style={{ background: 'rgba(245,158,11,0.05)' }}>
            <p className="text-[11px] text-white/40">{w.where} · <span className="text-amber-300">“{w.phrase}”</span></p>
            <p className="text-sm text-white/80 line-clamp-2">{w.text}</p>
            <p className="text-xs text-white/50 mt-1">→ {w.tip}</p>
          </li>
        ))}
      </ul>
    </Group>
  );
}

export function AtsPanel({ resume, pages, onFit }) {
  const local = readiness(resume, pages);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');

  async function runAI() {
    setLoading(true);
    setError('');
    try {
      const res = await resumeAPI.atsText(resumeToText(resume), '');
      setReport(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <Group title="Resume readiness">
        <div className="flex items-center gap-4">
          <ScoreRing score={local.score} />
          <div className="space-y-1.5">
            <RatingBadge score={local.score} />
            <p className="text-xs text-white/50">Instant check of the things recruiters and ATS software look for. Updates as you type.</p>
          </div>
        </div>
        <ul className="space-y-2 pt-1">
          {local.checks.map(c => (
            <li key={c.label} className="flex items-start gap-2.5">
              {c.ok ? <CheckCircle2 className="w-4 h-4 text-green-400 mt-0.5 shrink-0" /> : <XCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />}
              <div>
                <p className="text-sm text-white/85">{c.label}</p>
                {!c.ok && <p className="text-xs text-white/45">{c.tip}</p>}
              </div>
              {!c.ok && c.label === 'One page' && (
                <button onClick={onFit} className="ml-auto text-xs text-purple-300 hover:text-purple-200 flex items-center gap-1 shrink-0"><Minimize2 className="w-3.5 h-3.5" /> Fit</button>
              )}
            </li>
          ))}
        </ul>
      </Group>

      <WeakPhrases resume={resume} />

      <Group title="Deep AI ATS analysis">
        <p className="text-xs text-white/50">AI reads your resume like an ATS and lists strengths, weaknesses and fixes.</p>
        <AIButton loading={loading} onClick={runAI}>{report ? 'Run again' : 'Run AI analysis'}</AIButton>
        {error && <p className="text-sm text-red-400 flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</p>}
        {report && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-3">
              <ScoreRing score={report.overall_ats_score || 0} size={72} />
              <p className="text-sm text-white/70">AI ATS score</p>
            </div>
            <AIReport report={report} />
          </div>
        )}
      </Group>
    </div>
  );
}

export function OptimizePanel({ resume, update, ai, jobDescription, setJobDescription, onTailorCopy }) {
  const [loading, setLoading] = useState(false);
  const [tailoring, setTailoring] = useState(false);
  const [company, setCompany] = useState('');
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');

  async function analyze() {
    if (!jobDescription.trim()) return setError('Paste a job description first');
    setLoading(true);
    setError('');
    try {
      const res = await resumeAPI.atsText(resumeToText(resume), jobDescription);
      setReport(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function tailorCopy() {
    if (jobDescription.trim().length < 30) return setError('Paste the full job description first');
    setTailoring(true);
    setError('');
    try {
      await onTailorCopy(jobDescription, company.trim());
    } catch (err) {
      setError(err.message);
      setTailoring(false);
    }
  }

  function addSkill(keyword) {
    update(r => {
      const skills = [...r.skills];
      const i = skills.findIndex(s => s.label === 'Additional');
      if (i >= 0) skills[i] = { ...skills[i], items: [skills[i].items, keyword].filter(Boolean).join(', ') };
      else skills.push({ label: 'Additional', items: keyword });
      return { ...r, skills };
    });
    setReport(rep => ({ ...rep, missing_keywords: rep.missing_keywords.filter(k => k !== keyword), matched_keywords: [...(rep.matched_keywords || []), keyword] }));
  }

  return (
    <div className="space-y-4">
      <Group title="Target job">
        <input className="input py-2" value={company} onChange={e => setCompany(e.target.value)} placeholder="Company name (optional)" />
        <textarea className="textarea" rows={7} value={jobDescription} onChange={e => setJobDescription(e.target.value)}
          placeholder="Paste the job description you are applying for…" />
        <div className="flex flex-wrap gap-2">
          <button className="btn-primary py-2" onClick={analyze} disabled={loading}>
            {loading ? <Loader className="w-4 h-4 animate-spin" /> : <Target className="w-4 h-4" />} Check match
          </button>
          <AIButton loading={ai.loading === 'tailor'}
            onClick={() => jobDescription.trim()
              ? ai.run('tailor', 'summary', resume.summary, text => update(r => ({ ...r, summary: text })), { jobDescription })
              : setError('Paste a job description first')}>
            Tailor summary to this job
          </AIButton>
        </div>
        {error && <p className="text-sm text-red-400 flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</p>}
      </Group>

      <Group title="One-click tailored resume">
        <p className="text-xs text-white/50">
          AI rewrites your summary and every bullet for this job and reorders your skills — saved as a <strong className="text-white/80">new copy</strong>, so this resume stays as it is.
          It never invents employers or numbers; review the copy before sending.
        </p>
        <button className="btn-primary py-2" onClick={tailorCopy} disabled={tailoring}>
          {tailoring ? <Loader className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
          {tailoring ? 'Tailoring your resume…' : 'Create tailored copy'}
        </button>
      </Group>

      {report && (
        <Group title="Job match">
          <div className="flex items-center gap-4">
            <ScoreRing score={report.overall_ats_score || 0} />
            <div className="space-y-1.5">
              <RatingBadge score={report.overall_ats_score || 0} />
              <p className="text-xs text-white/50">How well your resume matches this job description.</p>
            </div>
          </div>
          {report.missing_keywords?.length > 0 && (
            <div>
              <p className="label mb-2">Missing keywords — click to add to skills</p>
              <div className="flex flex-wrap gap-1.5">
                {report.missing_keywords.map(k => (
                  <button key={k} onClick={() => addSkill(k)}
                    className="badge bg-amber-500/10 text-amber-300 border border-amber-500/30 hover:bg-amber-500/20 inline-flex items-center gap-1">
                    <Plus className="w-3 h-3" />{k}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-white/35 mt-2">Only add skills you actually have — also mention them in your bullets.</p>
            </div>
          )}
          <AIReport report={{ ...report, strengths: [], weaknesses: [] }} />
        </Group>
      )}

      {!report && (
        <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center">
          <Sparkles className="w-6 h-6 text-purple-400 mx-auto mb-2" />
          <p className="text-sm text-white/60">Paste a job description to see your match score, missing keywords and tailored suggestions.</p>
        </div>
      )}
    </div>
  );
}
