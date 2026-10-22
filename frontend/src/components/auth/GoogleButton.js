'use client';
import { useEffect, useRef, useState } from 'react';
import { Loader } from 'lucide-react';
import { authAPI } from '../../lib/api';

const SCRIPT_SRC = 'https://accounts.google.com/gsi/client';
let scriptPromise;

function loadGoogleScript() {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = SCRIPT_SRC;
      script.async = true;
      script.onload = resolve;
      script.onerror = () => { scriptPromise = null; reject(new Error('Could not load Google sign-in')); };
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
}

// The client ID can come from the frontend env or, so it only has to be set
// once, from the backend's GOOGLE_CLIENT_ID.
async function getClientId() {
  if (process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID) return process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const res = await authAPI.googleConfig();
  return res.clientId || '';
}

// Renders Google's official "Continue with Google" button and hands the
// signed ID token (credential) to onCredential.
export default function GoogleButton({ onCredential }) {
  const containerRef = useRef(null);
  const callbackRef = useRef(onCredential);
  const [status, setStatus] = useState('loading'); // loading | ready | unavailable | error
  callbackRef.current = onCredential;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const clientId = await getClientId();
        if (!clientId) { if (!cancelled) setStatus('unavailable'); return; }
        await loadGoogleScript();
        if (cancelled || !containerRef.current) return;
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: response => callbackRef.current(response.credential),
          ux_mode: 'popup',
          cancel_on_tap_outside: true,
        });
        window.google.accounts.id.renderButton(containerRef.current, {
          theme: 'filled_black', size: 'large', shape: 'pill', text: 'continue_with', logo_alignment: 'center',
          width: Math.min(400, containerRef.current.offsetWidth || 320),
        });
        setStatus('ready');
      } catch {
        if (!cancelled) setStatus('error');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-[44px] flex flex-col items-center justify-center">
      <div ref={containerRef} className={`w-full flex justify-center ${status === 'ready' ? '' : 'hidden'}`} />
      {status === 'loading' && (
        <div className="w-full h-11 rounded-full border border-white/10 flex items-center justify-center gap-2 text-white/40 text-sm">
          <Loader className="w-4 h-4 animate-spin" /> Loading Google sign-in…
        </div>
      )}
      {status === 'unavailable' && <p className="text-xs text-white/35 text-center">Google sign-in is not set up yet — use email below.</p>}
      {status === 'error' && <p className="text-xs text-amber-400/80 text-center">Google sign-in couldn&apos;t load (blocked or offline). Use email below.</p>}
    </div>
  );
}
