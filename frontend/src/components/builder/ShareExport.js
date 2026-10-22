'use client';
import { useState, useRef, useEffect } from 'react';
import { Share2, Link2, Copy, CheckCircle, Loader, X, Download, FileText, ChevronDown, ClipboardCopy, AlertCircle } from 'lucide-react';
import { printResume } from './ResumeDocument';
import { resumeToText } from './resumeData';
import { resumesAPI } from '../../lib/api';

const shareUrl = shareId => `${window.location.origin}/r/${shareId}`;

export function ShareDialog({ id, shareId, onChange, onClose }) {
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  async function toggle(enabled) {
    setBusy(true);
    setError('');
    try {
      const res = await resumesAPI.share(id, enabled);
      onChange(res.data.shareId);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(shareUrl(shareId));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setError('Could not copy — select the link and copy it manually.');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="relative w-full max-w-md card p-6 space-y-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2"><Share2 className="w-5 h-5 text-purple-300" />Share resume</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <p className="text-sm text-white/55">Anyone with the link can view and download this resume. Your edits show up there automatically. Turn it off any time.</p>
        <label className="flex items-center justify-between rounded-xl border border-white/10 p-3 cursor-pointer">
          <span className="text-sm text-white">Public link</span>
          <button type="button" disabled={busy} onClick={() => toggle(!shareId)}
            className={`w-11 h-6 rounded-full relative transition-colors ${shareId ? 'bg-purple-600' : 'bg-[rgba(255,255,255,0.15)]'}`} aria-label="Toggle public link">
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-[#fff] transition-transform ${shareId ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
        </label>
        {busy && <p className="text-xs text-white/40 flex items-center gap-2"><Loader className="w-3.5 h-3.5 animate-spin" />Updating…</p>}
        {shareId && (
          <div className="flex gap-2">
            <input readOnly className="input py-2 text-xs" value={shareUrl(shareId)} onFocus={e => e.target.select()} />
            <button onClick={copy} className="btn-primary py-2 px-3 shrink-0">
              {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}{copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        )}
        {error && <p className="text-sm text-red-400 flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</p>}
      </div>
    </div>
  );
}

export function downloadText(resume) {
  const blob = new Blob([resumeToText(resume)], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(resume.personal.name || resume.title || 'resume').replace(/[^\w-]+/g, '_')}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

export function ExportMenu({ resume, onError, onDone, compact = false }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const close = e => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const actions = [
    { label: 'PDF (Save as PDF)', icon: Download, run: () => { if (!printResume(resume)) onError('Please allow pop-ups for this site to export the PDF.'); } },
    { label: 'Plain text (.txt)', icon: FileText, run: () => downloadText(resume) },
    {
      label: 'Copy as text', icon: ClipboardCopy,
      run: async () => {
        try {
          await navigator.clipboard.writeText(resumeToText(resume));
          onDone('Resume copied as plain text — paste it into job portals.');
        } catch {
          onError('Could not copy to the clipboard.');
        }
      },
    },
  ];

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(o => !o)} className={`btn-primary whitespace-nowrap ${compact ? 'py-1.5 px-3 text-xs' : 'py-2'}`}>
        <Download className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} /> Export <ChevronDown className="w-3.5 h-3.5" />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-52 rounded-xl border border-white/10 shadow-2xl z-40 py-1" style={{ background: '#15151f' }}>
          {actions.map(({ label, icon: Icon, run }) => (
            <button key={label} onClick={() => { setOpen(false); run(); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-white/80 hover:bg-purple-500/10">
              <Icon className="w-4 h-4 text-purple-300" />{label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ShareButton({ onClick, shared, compact = false }) {
  return (
    <button onClick={onClick} className={`btn-outline whitespace-nowrap ${compact ? 'py-1.5 px-2.5 text-xs' : 'py-2 px-3 text-xs'}`} title="Share a public link" aria-label="Share">
      {shared ? <Link2 className="w-4 h-4 text-green-400" /> : <Share2 className="w-4 h-4" />}{!compact && (shared ? 'Shared' : 'Share')}
    </button>
  );
}
