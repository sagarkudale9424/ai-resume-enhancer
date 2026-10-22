'use client';
import { useRef, useState, useLayoutEffect } from 'react';
import ResumeDocument from './ResumeDocument';
import { PAGE_WIDTH, PAGE_HEIGHT, sampleResume, resumeToText } from './resumeData';

// Scales the A4 document to the available width, marks page breaks and
// reports how many pages the content needs.
export default function PagedPreview({ resume, onPages, maxScale = 1.25 }) {
  const outerRef = useRef(null);
  const docRef = useRef(null);
  const [scale, setScale] = useState(1);
  const [height, setHeight] = useState(PAGE_HEIGHT);

  useLayoutEffect(() => {
    const outer = outerRef.current;
    const observer = new ResizeObserver(() => {
      setScale(Math.min(maxScale, outer.clientWidth / PAGE_WIDTH));
    });
    observer.observe(outer);
    return () => observer.disconnect();
  }, [maxScale]);

  useLayoutEffect(() => {
    const h = docRef.current?.offsetHeight || PAGE_HEIGHT;
    const pages = Math.max(1, Math.ceil((h - 2) / PAGE_HEIGHT));
    setHeight(pages * PAGE_HEIGHT);
    onPages?.(pages);
  });

  const pages = Math.round(height / PAGE_HEIGHT);
  // Nothing filled in yet: show a faded example in the chosen template instead of a blank page
  const blank = resumeToText(resume).replace(/\s/g, '').length < 15;
  const shown = blank ? { ...sampleResume(), template: resume.template, style: resume.style, titles: resume.titles } : resume;

  return (
    <div ref={outerRef} className="w-full">
      <div style={{ width: PAGE_WIDTH * scale, height: height * scale, margin: '0 auto', position: 'relative' }}>
        <div style={{
          width: PAGE_WIDTH, height, transform: `scale(${scale})`, transformOrigin: 'top left',
          background: '#ffffff', boxShadow: '0 8px 30px rgba(0,0,0,0.45)', position: 'relative',
        }}>
          <div ref={docRef} style={blank ? { opacity: 0.35 } : undefined}><ResumeDocument resume={shown} /></div>
          {blank && (
            <div style={{ position: 'absolute', top: 260, left: 0, right: 0, textAlign: 'center', pointerEvents: 'none' }}>
              <span style={{ display: 'inline-block', background: '#6d28d9', color: '#fff', fontFamily: 'Arial', fontSize: 18, padding: '10px 20px', borderRadius: 12, boxShadow: '0 8px 24px rgba(109,40,217,0.4)' }}>
                Example preview — start filling the form and your details appear here
              </span>
            </div>
          )}
          {Array.from({ length: pages - 1 }, (_, i) => (
            <div key={i} style={{ position: 'absolute', left: 0, right: 0, top: (i + 1) * PAGE_HEIGHT, borderTop: '2px dashed #a78bfa', pointerEvents: 'none' }}>
              <span style={{ position: 'absolute', right: 8, top: -20, fontSize: 11, color: '#7c3aed', background: '#ede9fe', padding: '1px 6px', borderRadius: 4, fontFamily: 'Arial' }}>
                Page {i + 2}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
