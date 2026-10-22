'use client';
import { useState, useEffect } from 'react';
import ResumeList from './ResumeList';
import ResumeEditor from './ResumeEditor';
import { normalizeResume } from './resumeData';

const ACTIVE_KEY = 'activeResumeId';

function readActive() {
  try { return localStorage.getItem(ACTIVE_KEY); } catch { return null; }
}

// Switches between the resume dashboard and the full-screen editor
export default function ResumeBuilder({ sessionId, onUseResume, onImmersive }) {
  const [editing, setEditing] = useState(null); // { id, resume }
  const [activeId, setActiveId] = useState(null);

  useEffect(() => { setActiveId(readActive()); }, []);
  useEffect(() => { onImmersive?.(Boolean(editing)); }, [editing, onImmersive]);

  function open(id, resume) {
    try { localStorage.setItem(ACTIVE_KEY, id); } catch {}
    setActiveId(id);
    setEditing({ id, resume: normalizeResume(resume) });
  }

  if (editing) {
    return (
      <ResumeEditor key={editing.id} id={editing.id} initialResume={editing.resume} sessionId={sessionId}
        onUseResume={onUseResume} onOpenResume={open} onBack={() => setEditing(null)} />
    );
  }
  return <ResumeList activeId={activeId} onOpen={open} />;
}
