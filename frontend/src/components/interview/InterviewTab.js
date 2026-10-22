'use client';
import { useState, useEffect } from 'react';
import { MessageSquare, ChevronDown, ChevronUp, AlertCircle, Cpu, Heart, Lightbulb, PenLine, Loader, Sparkles, FileText } from 'lucide-react';
import { interviewAPI } from '../../lib/api';

const DIFFICULTY_COLORS = {
  easy: 'bg-green-500/10 text-green-400 border border-green-500/20',
  medium: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  hard: 'bg-red-500/10 text-red-400 border border-red-500/20',
};

const CATEGORY_ICONS = { technical: Cpu, behavioral: Heart, situational: Lightbulb };

function Practice({ question, jobRole }) {
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [error, setError] = useState('');

  async function evaluate() {
    setLoading(true);
    setError('');
    try {
      const res = await interviewAPI.evaluate(question, answer, jobRole);
      setFeedback(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const color = feedback ? (feedback.score >= 8 ? 'text-green-400' : feedback.score >= 5 ? 'text-amber-400' : 'text-red-400') : '';

  return (
    <div className="space-y-3">
      <textarea className="textarea" rows={5} value={answer} onChange={e => setAnswer(e.target.value)}
        placeholder="Type your answer as you would say it in the interview. Tip: use the STAR method (Situation, Task, Action, Result)." />
      <div className="flex items-center gap-3">
        <button className="btn-primary py-2" onClick={evaluate} disabled={loading || answer.trim().length < 15}>
          {loading ? <Loader className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Get AI feedback
        </button>
        <span className="text-xs text-white/35">{answer.trim().split(/\s+/).filter(Boolean).length} words</span>
      </div>
      {error && <p className="text-sm text-red-400 flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</p>}
      {feedback && (
        <div className="rounded-xl border border-white/10 p-4 space-y-3" style={{ background: 'rgba(124,58,237,0.06)' }}>
          <div className="flex items-center gap-3">
            <span className={`text-3xl font-bold ${color}`}>{feedback.score}<span className="text-base text-white/40">/10</span></span>
            <p className="text-sm text-white/80">{feedback.verdict}</p>
          </div>
          {feedback.strengths.length > 0 && (
            <div>
              <p className="label mb-1">What worked</p>
              <ul className="space-y-1">{feedback.strengths.map((s, i) => <li key={i} className="text-sm text-green-300/90">✓ {s}</li>)}</ul>
            </div>
          )}
          {feedback.improvements.length > 0 && (
            <div>
              <p className="label mb-1">Improve</p>
              <ul className="space-y-1">{feedback.improvements.map((s, i) => <li key={i} className="text-sm text-amber-300/90">→ {s}</li>)}</ul>
            </div>
          )}
          {feedback.improved_answer && (
            <div>
              <p className="label mb-1">Stronger answer</p>
              <p className="text-sm text-white/75 leading-relaxed whitespace-pre-wrap">{feedback.improved_answer}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function QuestionCard({ q, index, jobRole }) {
  const [open, setOpen] = useState(null); // null | 'answer' | 'practice'
  const toggle = mode => setOpen(o => (o === mode ? null : mode));
  return (
    <div className="border border-white/10 rounded-xl overflow-hidden">
      <div className="flex items-start justify-between gap-3 p-4">
        <div className="flex items-start gap-3 min-w-0">
          <span className="text-purple-400 font-bold text-sm shrink-0 mt-0.5">Q{index + 1}</span>
          <p className="text-sm font-medium text-white/90">{q.question}</p>
        </div>
        {q.difficulty && <span className={`badge text-xs shrink-0 ${DIFFICULTY_COLORS[q.difficulty] || ''}`}>{q.difficulty}</span>}
      </div>
      <div className="flex gap-2 px-4 pb-3">
        <button onClick={() => toggle('practice')} className={`text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${open === 'practice' ? 'border-purple-500 text-purple-300' : 'border-white/10 text-white/60 hover:text-white'}`}>
          <PenLine className="w-3.5 h-3.5" /> Practice
        </button>
        <button onClick={() => toggle('answer')} className={`text-xs flex items-center gap-1.5 px-3 py-1.5 rounded-lg border ${open === 'answer' ? 'border-purple-500 text-purple-300' : 'border-white/10 text-white/60 hover:text-white'}`}>
          {open === 'answer' ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />} Sample answer
        </button>
      </div>
      {open === 'answer' && (
        <div className="border-t border-white/10 p-4 space-y-3">
          <p className="text-sm text-white/75 leading-relaxed">{q.sample_answer}</p>
          {q.key_points?.length > 0 && (
            <div>
              <p className="label mb-2">Key points to cover</p>
              <ul className="space-y-1">
                {q.key_points.map((pt, i) => <li key={i} className="text-sm text-white/60 flex items-start gap-2"><span className="text-purple-400 shrink-0">✓</span>{pt}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
      {open === 'practice' && <div className="border-t border-white/10 p-4"><Practice question={q.question} jobRole={jobRole} /></div>}
    </div>
  );
}

export default function InterviewTab({ resumeContext }) {
  const [profile, setProfile] = useState('');
  const [jobRole, setJobRole] = useState('Software Engineer');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  // Pre-fill from the resume loaded in another tool, unless the user already typed something
  useEffect(() => {
    if (resumeContext && !profile.trim()) setProfile(resumeContext.slice(0, 4000));
  }, [resumeContext]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleGenerate() {
    if (!profile.trim()) return setError('Describe your experience and skills, or load your resume first.');
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const response = await interviewAPI.generate(profile, jobRole);
      setResult(response.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const categories = result ? Object.entries(result).filter(([, qs]) => Array.isArray(qs) && qs.length) : [];
  const totalQ = categories.reduce((n, [, qs]) => n + qs.length, 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-2">
          <div className="flex items-center justify-between">
            <label className="label">Your profile & skills</label>
            {resumeContext && profile !== resumeContext.slice(0, 4000) && (
              <button onClick={() => setProfile(resumeContext.slice(0, 4000))} className="text-xs text-purple-300 hover:text-purple-200 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5" /> Use my resume
              </button>
            )}
          </div>
          <textarea className="textarea h-36" value={profile} onChange={e => setProfile(e.target.value)}
            placeholder="Paste your resume or describe your skills, experience and projects…" />
          {!resumeContext && <p className="text-xs text-white/35">Tip: check your resume in the ATS Analyzer or press "Use in AI tools" in the Resume Builder to fill this automatically.</p>}
        </div>
        <div className="space-y-2">
          <label className="label">Target job role</label>
          <input className="input" value={jobRole} onChange={e => setJobRole(e.target.value)} placeholder="e.g. Backend Developer" />
        </div>
      </div>

      <button className="btn-primary" onClick={handleGenerate} disabled={loading}>
        {loading ? <><Loader className="w-4 h-4 animate-spin" /> Generating questions…</> : <><MessageSquare className="w-4 h-4" /> Generate interview questions</>}
      </button>

      {error && (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-red-500/30" style={{ background: 'rgba(239,68,68,0.08)' }}>
          <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {result && (
        <div className="space-y-6">
          <p className="text-sm text-white/50">{totalQ} questions across {categories.length} categories — open <strong className="text-white/80">Practice</strong> to answer and get scored.</p>
          {categories.map(([category, questions]) => {
            const Icon = CATEGORY_ICONS[category] || MessageSquare;
            return (
              <div key={category}>
                <div className="flex items-center gap-2 mb-3">
                  <Icon className="w-4 h-4 text-purple-400" />
                  <h3 className="text-sm font-semibold text-white capitalize">{category} questions</h3>
                  <span className="badge bg-purple-500/15 text-purple-300">{questions.length}</span>
                </div>
                <div className="space-y-2">
                  {questions.map((q, i) => <QuestionCard key={`${category}-${i}`} q={q} index={i} jobRole={jobRole} />)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
