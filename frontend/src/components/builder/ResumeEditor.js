'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft, PenSquare, Palette, Gauge, BriefcaseBusiness, Plus, ChevronDown, GripVertical, Trash2, Pencil, Eye,
  Undo2, Redo2, Minimize2, AlertTriangle, ArrowRight, User, FileText, GraduationCap, Briefcase, FolderGit2,
  Wrench, Award, Trophy, ListPlus, PanelLeftClose, PanelLeftOpen, Check, Loader, CloudOff, Send,
} from 'lucide-react';
import PagedPreview from './PagedPreview';
import { CustomizePanel, AtsPanel, OptimizePanel, RatingBadge } from './Panels';
import { ShareDialog, ExportMenu, ShareButton } from './ShareExport';
import {
  PersonalEditor, SummaryEditor, ExperienceEditor, EducationEditor, ProjectsEditor, SkillsEditor, ListEditor, Field,
} from './SectionEditors';
import { SECTION_TYPES, DEFAULT_ORDER, FIT_STEPS, sectionTitle, resumeToText, mergeTailored } from './resumeData';
import { readiness } from './readiness';
import { resumesAPI, ragAPI } from '../../lib/api';

const PANELS = [
  { id: 'content', label: 'Edit Content', icon: PenSquare },
  { id: 'customize', label: 'Customize Template', icon: Palette },
  { id: 'ats', label: 'ATS Score', icon: Gauge },
  { id: 'optimize', label: 'Optimize for Job', icon: BriefcaseBusiness },
];

const SECTION_ICONS = {
  summary: FileText, education: GraduationCap, experience: Briefcase, projects: FolderGit2,
  skills: Wrench, certifications: Award, achievements: Trophy,
};

// Undo/redo history; edits within 800 ms of each other count as one step
function useHistory(initial) {
  const [state, setState] = useState({ past: [], present: initial, future: [] });
  const lastEdit = useRef(0);
  const update = useCallback(fn => {
    const now = Date.now();
    const coalesce = now - lastEdit.current < 800;
    lastEdit.current = now;
    setState(s => {
      const next = fn(s.present);
      if (next === s.present) return s;
      return { past: coalesce ? s.past : [...s.past.slice(-60), s.present], present: next, future: [] };
    });
  }, []);
  const undo = () => setState(s => (s.past.length
    ? { past: s.past.slice(0, -1), present: s.past[s.past.length - 1], future: [s.present, ...s.future] } : s));
  const redo = () => setState(s => (s.future.length
    ? { past: [...s.past, s.present], present: s.future[0], future: s.future.slice(1) } : s));
  return { resume: state.present, update, undo, redo, canUndo: state.past.length > 0, canRedo: state.future.length > 0 };
}

function SaveStatus({ status, onRetry }) {
  return <span className="whitespace-nowrap"><SaveStatusInner status={status} onRetry={onRetry} /></span>;
}

function SaveStatusInner({ status, onRetry }) {
  if (status === 'saving') return <span className="flex items-center gap-1.5 text-xs text-white/40"><Loader className="w-3.5 h-3.5 animate-spin" />Saving…</span>;
  if (status === 'error') {
    return (
      <button onClick={onRetry} className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300" title="Click to retry">
        <CloudOff className="w-3.5 h-3.5" />Not saved · Retry
      </button>
    );
  }
  if (status === 'saved') return <span className="flex items-center gap-1.5 text-xs text-green-400/80"><Check className="w-3.5 h-3.5" />Saved</span>;
  return null;
}

function SectionCard({ id, title, icon: Icon, open, onToggle, onDelete, drag, children }) {
  return (
    <div
      draggable={Boolean(drag)}
      onDragStart={drag?.onDragStart}
      onDragOver={drag?.onDragOver}
      onDrop={drag?.onDrop}
      onDragEnd={drag?.onDragEnd}
      className={`rounded-2xl border transition-all overflow-hidden ${drag?.over ? 'border-purple-400' : 'border-white/10'} ${drag?.dragging ? 'opacity-40' : ''}`}
      style={{ background: 'linear-gradient(90deg, rgba(124,58,237,0.10), rgba(255,255,255,0.015) 60%)' }}
    >
      <div className="flex items-stretch">
        {drag && (
          <div className="flex items-center px-2 border-r border-white/10 cursor-grab active:cursor-grabbing text-white/30 hover:text-white/60" title="Drag to reorder">
            <GripVertical className="w-4 h-4" />
          </div>
        )}
        <button type="button" onClick={() => onToggle(id)} className="flex-1 flex items-center gap-3 px-4 py-4 text-left min-w-0">
          <Icon className="w-5 h-5 text-purple-300 shrink-0" />
          <span className="text-[15px] font-medium text-white truncate">{title}</span>
        </button>
        {onDelete && (
          <button type="button" onClick={onDelete} className="px-3 text-red-400/70 hover:text-red-400 border-r border-white/10" aria-label={`Delete ${title}`}>
            <Trash2 className="w-4 h-4" />
          </button>
        )}
        <button type="button" onClick={() => onToggle(id)} className="px-4 text-white/50 hover:text-white" aria-label="Toggle section">
          <ChevronDown className={`w-5 h-5 transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>
      {open && <div className="px-4 pb-4 pt-1 border-t border-white/5">{children}</div>}
    </div>
  );
}

export default function ResumeEditor({ id, initialResume, onBack, onUseResume, onOpenResume, sessionId }) {
  const { resume, update, undo, redo, canUndo, canRedo } = useHistory(initialResume);
  const [panel, setPanel] = useState('content');
  const [mode, setMode] = useState('editor');        // editor | preview
  const [mobileView, setMobileView] = useState('edit');
  const [collapsed, setCollapsed] = useState(false);
  const [openCards, setOpenCards] = useState(['personal']);
  const [pages, setPages] = useState(1);
  const [fitting, setFitting] = useState(false);
  const [saveStatus, setSaveStatus] = useState('saved');
  const [aiLoading, setAiLoading] = useState('');
  const [notice, setNotice] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [shareId, setShareId] = useState(initialResume.shareId || null);
  const [showShare, setShowShare] = useState(false);
  const [jobDescription, setJobDescription] = useState('');
  const [dragId, setDragId] = useState(null);
  const [overId, setOverId] = useState(null);
  const pagesRef = useRef(1);
  const firstRender = useRef(true);
  const latest = useRef(resume);
  const dirty = useRef(false);
  latest.current = resume;

  const score = readiness(resume, pages).score;

  function flash(type, text) {
    setNotice({ type, text });
    setTimeout(() => setNotice(null), 3500);
  }

  // --- autosave ---
  const saveNow = useCallback(async () => {
    const snapshot = latest.current;
    setSaveStatus('saving');
    try {
      await resumesAPI.update(id, { ...snapshot, readiness: readiness(snapshot, pagesRef.current).score });
      if (latest.current === snapshot) dirty.current = false;
      setSaveStatus('saved');
      return true;
    } catch (err) {
      setSaveStatus('error');
      if (err.status === 404) flash('error', 'This resume no longer exists on the server. Go back and create a new one.');
      return false;
    }
  }, [id]);

  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    dirty.current = true;
    setSaveStatus('saving');
    const timer = setTimeout(saveNow, 1200);
    return () => clearTimeout(timer);
  }, [resume, saveNow]);

  // Warn before closing the tab with changes that have not reached the server
  useEffect(() => {
    const onBeforeUnload = e => {
      if (!dirty.current) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  async function handleBack() {
    if (dirty.current && !(await saveNow()) && !confirm('Your latest changes could not be saved. Leave anyway?')) return;
    onBack();
  }

  // --- keyboard shortcuts ---
  useEffect(() => {
    function onKey(e) {
      if (!(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'z') return;
      e.preventDefault();
      if (e.shiftKey) redo(); else undo();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  // --- fit to single page: step through tighter spacing / text sizes ---
  const handlePages = useCallback(n => { pagesRef.current = n; setPages(n); }, []);
  useEffect(() => {
    if (!fitting) return;
    const timer = setTimeout(() => {
      if (pagesRef.current <= 1) {
        setFitting(false);
        flash('success', 'Your resume now fits on one page');
        return;
      }
      const idx = FIT_STEPS.findIndex(s => s.density === resume.style.density && s.fontSize === resume.style.fontSize);
      const next = FIT_STEPS[idx < 0 ? 2 : idx + 1];
      if (!next) {
        setFitting(false);
        flash('error', 'Still more than one page at the tightest layout — shorten a few bullets or remove a section.');
        return;
      }
      update(r => ({ ...r, style: { ...r.style, ...next } }));
    }, 80);
    return () => clearTimeout(timer);
  }, [fitting, resume.style.density, resume.style.fontSize, pages, update]);

  // --- AI ---
  const ai = {
    loading: aiLoading,
    async run(key, action, content, apply, extra = {}) {
      setAiLoading(key);
      try {
        const res = await resumesAPI.ai(action, content, {
          title: resume.personal.title,
          skills: resume.skills.map(s => s.items).join(', '),
          experience: resumeToText(resume).slice(0, 1500),
          ...extra,
        });
        apply(res.data.text);
      } catch (err) {
        flash('error', err.message);
      } finally {
        setAiLoading('');
      }
    },
  };

  // --- sections ---
  const toggleCard = cardId => setOpenCards(open => (open.includes(cardId) ? open.filter(x => x !== cardId) : [...open, cardId]));
  const hiddenSections = DEFAULT_ORDER.filter(s => !resume.order.includes(s));

  function addSection(type) {
    setAddOpen(false);
    if (type === 'custom') {
      const cid = Date.now().toString(36);
      update(r => ({ ...r, custom: [...r.custom, { id: cid, title: 'Custom Section', content: '' }], order: [...r.order, `custom:${cid}`] }));
      setOpenCards(o => [...o, `custom:${cid}`]);
    } else {
      update(r => ({ ...r, order: [...r.order, type] }));
      setOpenCards(o => [...o, type]);
    }
    setPanel('content');
  }

  function deleteSection(sectionId) {
    if (!confirm(`Remove "${sectionTitle(resume, sectionId)}" from your resume?`)) return;
    update(r => ({
      ...r,
      order: r.order.filter(x => x !== sectionId),
      custom: sectionId.startsWith('custom:') ? r.custom.filter(c => `custom:${c.id}` !== sectionId) : r.custom,
    }));
  }

  function dragProps(sectionId) {
    return {
      dragging: dragId === sectionId,
      over: overId === sectionId && dragId !== sectionId,
      onDragStart: e => { setDragId(sectionId); e.dataTransfer.effectAllowed = 'move'; },
      onDragOver: e => { e.preventDefault(); setOverId(sectionId); },
      onDrop: e => {
        e.preventDefault();
        if (dragId && dragId !== sectionId) {
          update(r => {
            const order = r.order.filter(x => x !== dragId);
            order.splice(order.indexOf(sectionId), 0, dragId);
            return { ...r, order };
          });
        }
        setDragId(null);
        setOverId(null);
      },
      onDragEnd: () => { setDragId(null); setOverId(null); },
    };
  }

  function renderSection(sectionId) {
    const props = { resume, update, ai };
    if (sectionId === 'summary') return <SummaryEditor {...props} />;
    if (sectionId === 'experience') return <ExperienceEditor {...props} />;
    if (sectionId === 'education') return <EducationEditor {...props} />;
    if (sectionId === 'projects') return <ProjectsEditor {...props} />;
    if (sectionId === 'skills') return <SkillsEditor {...props} />;
    if (sectionId === 'certifications' || sectionId === 'achievements') {
      return <ListEditor value={resume[sectionId]} onChange={v => update(r => ({ ...r, [sectionId]: v }))} placeholder="One per line" />;
    }
    const custom = resume.custom.find(c => `custom:${c.id}` === sectionId);
    const setCustom = (field, value) => update(r => ({ ...r, custom: r.custom.map(c => (c.id === custom.id ? { ...c, [field]: value } : c)) }));
    return (
      <div className="space-y-3">
        <Field label="Section heading" value={custom.title} onChange={e => setCustom('title', e.target.value)} />
        <ListEditor value={custom.content} onChange={v => setCustom('content', v)} placeholder="One point per line" />
      </div>
    );
  }

  // --- recommendations ---
  const failing = readiness(resume, pages).checks.filter(c => !c.ok && c.label !== 'One page');
  const recommendations = [
    pages > 1 && { title: 'Resume Length Optimization', text: `Your resume runs to ${pages} pages. Fit it within 1 page (shorten content or let us tighten the layout).`, action: 'Fit to single page', onClick: () => setFitting(true) },
    failing[0] && { title: failing[0].label, text: failing[0].tip, action: 'View ATS score', onClick: () => setPanel('ats') },
  ].filter(Boolean);

  async function handleTailorCopy(jobDescription, company) {
    if (dirty.current) await saveNow();
    const res = await resumesAPI.tailor(resume, jobDescription);
    const { shareId: _ignored, ...base } = resume;
    const copy = mergeTailored(base, res.data, company ? `${resume.title} – ${company}` : undefined);
    const created = await resumesAPI.create({ ...copy, readiness: readiness(copy, 1).score });
    onOpenResume?.(created.data._id, copy);
  }

  function handleUse() {
    const text = resumeToText(resume);
    onUseResume?.(text);
    if (sessionId) ragAPI.index(text, sessionId).catch(() => {});
    flash('success', 'Resume sent to Cover Letter, Interview Prep and AI Coach');
  }

  const panelTitle = PANELS.find(p => p.id === panel).label;
  const showLeft = mode === 'editor' && !collapsed;

  const leftPanel = (
    <div className="h-full flex flex-col min-h-0">
      <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-4">
        <h1 className="text-xl sm:text-2xl font-semibold text-white">{panel === 'content' ? 'Edit Content' : panelTitle}</h1>
        <div className="flex items-center gap-2">
          {panel === 'content' && (
            <div className="relative">
              <button className="btn-outline py-2 px-3 text-xs" onClick={() => setAddOpen(o => !o)}><Plus className="w-4 h-4" /> Add Section</button>
              {addOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl border border-white/10 shadow-2xl z-30 py-1" style={{ background: '#15151f' }}>
                  {hiddenSections.map(s => {
                    const Icon = SECTION_ICONS[s];
                    return (
                      <button key={s} onClick={() => addSection(s)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/80 hover:bg-purple-500/10">
                        <Icon className="w-4 h-4 text-purple-300" />{SECTION_TYPES[s]}
                      </button>
                    );
                  })}
                  <button onClick={() => addSection('custom')} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/80 hover:bg-purple-500/10">
                    <ListPlus className="w-4 h-4 text-purple-300" />Custom section
                  </button>
                </div>
              )}
            </div>
          )}
          <button onClick={() => setCollapsed(true)} className="hidden lg:flex w-9 h-9 items-center justify-center rounded-full border border-white/10 text-white/50 hover:text-white" aria-label="Collapse panel">
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-24 lg:pb-8 space-y-3 min-h-0">
        {panel === 'content' && (
          <>
            {recommendations.length > 0 && (
              <div className="rounded-2xl border border-amber-500/40 p-4 space-y-3" style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.10), rgba(245,158,11,0.03))' }}>
                <p className="flex items-center gap-2 text-sm font-medium text-amber-400">
                  <AlertTriangle className="w-4 h-4" /> Resume improvement recommendation ({recommendations.length})
                </p>
                {recommendations.map(rec => (
                  <div key={rec.title} className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between rounded-xl p-3" style={{ background: 'rgba(0,0,0,0.25)' }}>
                    <div>
                      <p className="text-sm font-semibold text-white">{rec.title}</p>
                      <p className="text-xs text-white/60">{rec.text}</p>
                    </div>
                    <button onClick={rec.onClick} disabled={fitting} className="btn-primary py-2 px-3 text-xs shrink-0 justify-center">
                      {fitting && rec.action.startsWith('Fit') ? <Loader className="w-3.5 h-3.5 animate-spin" /> : null}
                      {rec.action} <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <SectionCard id="personal" title="Personal Information" icon={User} open={openCards.includes('personal')} onToggle={toggleCard}>
              <PersonalEditor resume={resume} update={update} />
            </SectionCard>

            {resume.order.map(sectionId => (
              <SectionCard key={sectionId} id={sectionId} title={sectionTitle(resume, sectionId)}
                icon={SECTION_ICONS[sectionId] || ListPlus} open={openCards.includes(sectionId)} onToggle={toggleCard}
                onDelete={() => deleteSection(sectionId)} drag={dragProps(sectionId)}>
                {renderSection(sectionId)}
              </SectionCard>
            ))}
            <p className="text-center text-[11px] text-white/30 pt-2">Drag sections by the ⋮⋮ handle to reorder them on your resume</p>
          </>
        )}
        {panel === 'customize' && <CustomizePanel resume={resume} update={update} />}
        {panel === 'ats' && <AtsPanel resume={resume} pages={pages} onFit={() => setFitting(true)} />}
        {panel === 'optimize' && (
          <OptimizePanel resume={resume} update={update} ai={ai} jobDescription={jobDescription} setJobDescription={setJobDescription} onTailorCopy={handleTailorCopy} />
        )}
      </div>
    </div>
  );

  return (
    <div className="h-[100dvh] flex flex-col lg:flex-row bg-[#0a0a0f] overflow-hidden">
      {/* Rail (desktop) */}
      <nav className="hidden lg:flex w-[92px] shrink-0 flex-col items-center border-r border-white/10 py-4 gap-1" style={{ background: '#0c0c13' }}>
        <button onClick={handleBack} className="w-full flex flex-col items-center gap-1 px-2 py-3 text-white/60 hover:text-white text-[11px] text-center leading-tight">
          <ArrowLeft className="w-5 h-5" /> Back to All Resumes
        </button>
        <div className="w-12 h-px bg-[rgba(255,255,255,0.1)] my-2" />
        {PANELS.map(({ id: pid, label, icon: Icon }) => (
          <button key={pid} onClick={() => { setPanel(pid); setMode('editor'); setCollapsed(false); }}
            className={`w-full flex flex-col items-center gap-1.5 px-2 py-3 text-[11px] text-center leading-tight transition-colors ${panel === pid ? 'text-white' : 'text-white/50 hover:text-white'}`}>
            <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${panel === pid ? 'bg-purple-600 shadow-lg shadow-purple-900/50' : ''}`}>
              <Icon className="w-5 h-5" />
            </span>
            {label}
          </button>
        ))}
        <div className="mt-auto flex flex-col items-center gap-1 text-[10px] text-white/40">
          <RatingBadge score={score} />
          <span>Readiness</span>
        </div>
      </nav>

      {/* Mobile top bar */}
      <div className="lg:hidden border-b border-white/10 shrink-0">
        <div className="flex items-center justify-between px-3 h-12">
          <button onClick={handleBack} className="flex items-center gap-1.5 text-sm text-white/70"><ArrowLeft className="w-4 h-4" /> Resumes</button>
          <div className="flex items-center gap-2">
            <SaveStatus status={saveStatus} onRetry={saveNow} />
            <ShareButton compact shared={Boolean(shareId)} onClick={() => setShowShare(true)} />
            <ExportMenu compact resume={resume} onError={msg => flash('error', msg)} onDone={msg => flash('success', msg)} />
          </div>
        </div>
        <div className="flex gap-1 px-2 pb-2 overflow-x-auto scrollbar-none">
          {PANELS.map(({ id: pid, label, icon: Icon }) => (
            <button key={pid} onClick={() => { setPanel(pid); setMobileView('edit'); }}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs ${panel === pid && mobileView === 'edit' ? 'bg-purple-600 text-white' : 'text-white/50 border border-white/10'}`}>
              <Icon className="w-3.5 h-3.5" />{label}
            </button>
          ))}
          <button onClick={() => setMobileView('preview')}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs ${mobileView === 'preview' ? 'bg-purple-600 text-white' : 'text-white/50 border border-white/10'}`}>
            <Eye className="w-3.5 h-3.5" />Preview
          </button>
        </div>
      </div>

      {/* Left panel */}
      <div className={`${showLeft ? 'lg:flex' : 'lg:hidden'} ${mobileView === 'edit' ? 'flex' : 'hidden'} flex-col lg:w-[46%] lg:max-w-[680px] lg:border-r border-white/10 min-h-0 flex-1 lg:flex-none`}>
        {leftPanel}
      </div>

      {/* Preview side */}
      <div className={`${mobileView === 'preview' ? 'flex' : 'hidden'} lg:flex flex-1 flex-col min-w-0 min-h-0`}>
        <div className="hidden lg:flex items-center justify-between gap-3 px-5 py-3">
          <div className="flex items-center gap-2">
            {collapsed && mode === 'editor' && (
              <button onClick={() => setCollapsed(false)} className="w-9 h-9 flex items-center justify-center rounded-full border border-white/10 text-white/50 hover:text-white" aria-label="Show panel">
                <PanelLeftOpen className="w-4 h-4" />
              </button>
            )}
            <div className="flex rounded-xl p-1" style={{ background: 'rgba(255,255,255,0.06)' }}>
              {[{ id: 'editor', label: 'Editor Mode', icon: Pencil }, { id: 'preview', label: 'Preview Mode', icon: Eye }].map(({ id: m, label, icon: Icon }) => (
                <button key={m} onClick={() => setMode(m)}
                  title={label}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-all ${mode === m ? 'bg-[#f5f3ff] text-purple-700 font-medium' : 'text-white/50 hover:text-white'}`}>
                  <Icon className="w-4 h-4" /><span className="hidden xl:inline">{label}</span><span className="xl:hidden">{label.split(' ')[0]}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SaveStatus status={saveStatus} onRetry={saveNow} />
            <button onClick={undo} disabled={!canUndo} className="w-9 h-9 flex items-center justify-center rounded-lg border border-white/10 text-white/60 hover:text-white disabled:opacity-30" title="Undo (Ctrl+Z)"><Undo2 className="w-4 h-4" /></button>
            <button onClick={redo} disabled={!canRedo} className="w-9 h-9 flex items-center justify-center rounded-lg border border-white/10 text-white/60 hover:text-white disabled:opacity-30" title="Redo (Ctrl+Shift+Z)"><Redo2 className="w-4 h-4" /></button>
            <button onClick={handleUse} className="btn-outline py-2 px-3 text-xs whitespace-nowrap" title="Use this resume in Cover Letter, Interview and AI Coach" aria-label="Use in AI tools"><Send className="w-4 h-4" /><span className="hidden 2xl:inline">Use in AI tools</span></button>
            <ShareButton shared={Boolean(shareId)} onClick={() => setShowShare(true)} />
            <ExportMenu resume={resume} onError={msg => flash('error', msg)} onDone={msg => flash('success', msg)} />
          </div>
        </div>

        {notice && (
          <div className={`mx-3 lg:mx-5 mb-2 text-sm rounded-xl px-3 py-2 border ${notice.type === 'error' ? 'text-red-300 bg-red-500/10 border-red-500/30' : 'text-green-300 bg-green-500/10 border-green-500/30'}`}>
            {notice.text}
          </div>
        )}

        <div className="flex-1 min-h-0 mx-2 lg:mx-5 mb-2 lg:mb-5 rounded-2xl border border-white/10 flex flex-col overflow-hidden" style={{ background: '#16161f' }}>
          <div className="flex items-center justify-between gap-3 px-3 sm:px-4 py-2.5 border-b border-white/10">
            {editingTitle ? (
              <input autoFocus className="input py-1.5 max-w-xs" value={resume.title}
                onChange={e => update(r => ({ ...r, title: e.target.value }))}
                onBlur={() => setEditingTitle(false)} onKeyDown={e => e.key === 'Enter' && setEditingTitle(false)} />
            ) : (
              <button onClick={() => setEditingTitle(true)} className="flex items-center gap-2 text-sm sm:text-base text-white/80 hover:text-white min-w-0">
                <span className="truncate border-b border-dashed border-white/30">{resume.title || 'Untitled Resume'}</span>
                <Pencil className="w-3.5 h-3.5 shrink-0" />
              </button>
            )}
            <div className="flex items-center gap-2 shrink-0">
              <span className={`text-xs px-2 py-1 rounded-md border ${pages > 1 ? 'text-amber-300 border-amber-500/40' : 'text-white/70 border-white/15'}`}>
                {pages} {pages === 1 ? 'page' : 'pages'}
              </span>
              <button onClick={() => setFitting(true)} disabled={fitting || pages <= 1}
                className="flex items-center gap-1.5 text-xs font-medium text-white border border-white/15 rounded-lg px-2.5 py-1.5 hover:border-purple-400 disabled:opacity-40">
                {fitting ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Minimize2 className="w-3.5 h-3.5" />}
                <span className="hidden sm:inline">Fit to Single Page</span>
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-auto p-3 sm:p-6 pb-24 lg:pb-6">
            <PagedPreview resume={resume} onPages={handlePages} maxScale={mode === 'preview' || collapsed ? 1.2 : 1} />
          </div>
        </div>
      </div>
      {showShare && <ShareDialog id={id} shareId={shareId} onChange={setShareId} onClose={() => setShowShare(false)} />}
    </div>
  );
}
