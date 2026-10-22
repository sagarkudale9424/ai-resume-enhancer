'use client';
import { useEffect, useState } from 'react';
import { Download, Loader, AlertCircle, FileText } from 'lucide-react';
import PagedPreview from '../../../components/builder/PagedPreview';
import { printResume } from '../../../components/builder/ResumeDocument';
import { normalizeResume } from '../../../components/builder/resumeData';
import { publicAPI } from '../../../lib/api';

// Public, read-only view of a shared resume
export default function SharedResumePage({ params }) {
  const [resume, setResume] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    publicAPI.resume(params.id)
      .then(res => {
        const data = normalizeResume(res.data);
        setResume(data);
        document.title = `${data.personal.name || data.title} — Resume`;
      })
      .catch(err => setError(err.message));
  }, [params.id]);

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      <header className="flex items-center justify-between gap-3 px-4 sm:px-8 h-16 border-b border-white/10">
        <a href="/" className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-fuchsia-600 flex items-center justify-center font-bold text-xs text-white">R</span>
          <span className="hidden sm:inline font-semibold text-white text-sm">AI Resume Enhancer</span>
        </a>
        {resume && (
          <button className="btn-primary py-2" onClick={() => printResume(resume)}>
            <Download className="w-4 h-4" /> Download PDF
          </button>
        )}
      </header>

      <main className="max-w-4xl mx-auto px-3 sm:px-6 py-6 sm:py-10">
        {!resume && !error && (
          <div className="flex items-center justify-center gap-2 py-24 text-white/40"><Loader className="w-5 h-5 animate-spin" />Loading resume…</div>
        )}
        {error && (
          <div className="card p-10 text-center space-y-3 max-w-md mx-auto">
            <AlertCircle className="w-10 h-10 text-white/30 mx-auto" />
            <p className="text-white font-medium">Resume not available</p>
            <p className="text-sm text-white/50">{error}</p>
            <a href="/" className="btn-primary inline-flex mx-auto">Build your own resume</a>
          </div>
        )}
        {resume && (
          <>
            <PagedPreview resume={resume} maxScale={1.1} />
            <div className="text-center mt-8 space-y-2">
              <p className="text-sm text-white/40 flex items-center justify-center gap-2"><FileText className="w-4 h-4" />Made with AI Resume Enhancer</p>
              <a href="/" className="text-sm text-purple-300 hover:text-purple-200">Create your own ATS-friendly resume for free →</a>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
