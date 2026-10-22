'use client';
import { Component } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

// Keeps a crash in one part of the app from blanking the whole page
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error(`${this.props.name || 'Component'} crashed:`, error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="rounded-2xl border border-red-500/30 p-6 text-center space-y-3" style={{ background: 'rgba(239,68,68,0.06)' }}>
        <AlertTriangle className="w-8 h-8 text-red-400 mx-auto" />
        <p className="text-white font-medium">Something went wrong in {this.props.name || 'this section'}.</p>
        <p className="text-sm text-white/50">Your saved work is safe. Try again, or reload the page if it keeps happening.</p>
        <div className="flex justify-center gap-2">
          <button className="btn-secondary" onClick={() => this.setState({ error: null })}><RotateCcw className="w-4 h-4" /> Try again</button>
          <button className="btn-outline" onClick={() => window.location.reload()}>Reload page</button>
        </div>
      </div>
    );
  }
}
