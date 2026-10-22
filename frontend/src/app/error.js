'use client';

// Last-resort error screen for anything the per-section boundaries miss
export default function Error({ error, reset }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#0a0a0f]">
      <div className="card p-8 max-w-md text-center space-y-4">
        <h1 className="text-xl font-semibold text-white">Something went wrong</h1>
        <p className="text-sm text-white/50">{error?.message || 'An unexpected error occurred.'}</p>
        <div className="flex justify-center gap-2">
          <button className="btn-primary" onClick={reset}>Try again</button>
          <button className="btn-outline" onClick={() => window.location.reload()}>Reload</button>
        </div>
      </div>
    </div>
  );
}
