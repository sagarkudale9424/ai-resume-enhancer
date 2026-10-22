'use client';
import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { MessageSquare, Bot, Zap, Target, LogOut, User, ChevronRight, Shield, Sparkles, Brain, PenLine, History, Menu, X, FileEdit, UserCircle, KanbanSquare } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import AuthModal from '../components/auth/AuthModal';
import ATSAnalyzer from '../components/ats/ATSAnalyzer';
import EnhanceTab from '../components/resume/EnhanceTab';
import InterviewTab from '../components/interview/InterviewTab';
import ChatTab from '../components/chat/ChatTab';
import CoverLetterTab from '../components/coverLetter/CoverLetterTab';
import HistoryDashboard from '../components/history/HistoryDashboard';
import ResumeBuilder from '../components/builder/ResumeBuilder';
import ProfileTab from '../components/profile/ProfileTab';
import ErrorBoundary from '../components/ErrorBoundary';
import JobsTab from '../components/jobs/JobsTab';

const TABS = [
  { id: 'builder', label: 'Resumes', fullLabel: 'Resume Builder', icon: FileEdit },
  { id: 'ats', label: 'ATS', fullLabel: 'ATS Analyzer', icon: Target },
  { id: 'enhance', label: 'Enhance', fullLabel: 'Enhance Resume', icon: Zap },
  { id: 'cover', label: 'Cover Letter', fullLabel: 'Cover Letter', icon: PenLine },
  { id: 'interview', label: 'Interview', fullLabel: 'Interview Prep', icon: MessageSquare },
  { id: 'chat', label: 'AI Coach', fullLabel: 'AI Coach', icon: Bot },
  { id: 'jobs', label: 'Jobs', fullLabel: 'Job Tracker', icon: KanbanSquare },
  { id: 'history', label: 'History', fullLabel: 'History', icon: History },
  { id: 'profile', label: 'Profile', fullLabel: 'My Profile', icon: UserCircle },
];

const FEATURES = [
  { icon: FileEdit, title: 'Resume Builder', desc: 'ATS-friendly templates, AI writing, PDF import, readiness score and one-click PDF export' },
  { icon: Target, title: 'ATS Score Checker', desc: 'Instant ATS compatibility score with detailed breakdown' },
  { icon: Zap, title: 'AI Resume Enhancer', desc: 'Rewrite bullets with strong action verbs and keyword alignment' },
  { icon: PenLine, title: 'Cover Letter Generator', desc: 'Personalized cover letters tailored to any job in seconds' },
  { icon: MessageSquare, title: 'Interview Prep', desc: 'Personalized Q&A with sample answers for any role' },
  { icon: Brain, title: 'AI Career Coach', desc: 'Chat with AI that knows your resume and gives tailored advice' },
  { icon: KanbanSquare, title: 'Job Application Tracker', desc: 'Track every application on a board with stages, notes and follow-up reminders' },
  { icon: History, title: 'Score History', desc: 'Track your ATS score improvements over time with trend graphs' },
  { icon: UserCircle, title: 'Career Profile', desc: 'Save your details once and reuse them across every resume' },
];

export default function HomePage() {
  const [activeTab, setActiveTab] = useState('builder');
  const [sessionId, setSessionId] = useState('');
  const [resumeContext, setResumeContext] = useState('');
  const [showAuth, setShowAuth] = useState(false);
  const [showApp, setShowApp] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [immersive, setImmersive] = useState(false);
  const { user, logout, isLoggedIn } = useAuth();

  useEffect(() => { setSessionId(uuidv4()); }, []);

  // Signed out (or the saved login was rejected): forget everything from that
  // account so the next person on this browser starts clean
  useEffect(() => {
    if (isLoggedIn) return;
    setActiveTab('builder');
    setResumeContext('');
    setSessionId(uuidv4());
    setImmersive(false);
    if (showApp) {
      setShowApp(false);
      setShowAuth(true);
    }
  }, [isLoggedIn]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSignOut() {
    setShowApp(false);
    logout();
  }

  function handleGetStarted() {
    if (isLoggedIn) setShowApp(true);
    else setShowAuth(true);
  }

  if (showApp) {
    const current = TABS.find(t => t.id === activeTab);
    const firstName = user?.name?.split(' ')[0];
    const panelStyle = id => ({ display: activeTab === id ? 'block' : 'none' });

    return (
      <div className="h-[100dvh] flex bg-[#0a0a0f] overflow-hidden">
        {/* Sidebar */}
        {!immersive && (
          <aside className="hidden md:flex flex-col shrink-0 w-[88px] xl:w-60 border-r border-white/10 py-4" style={{ background: '#0c0c13' }}>
            <div className="flex items-center gap-2.5 px-4 xl:px-5 mb-6 justify-center xl:justify-start">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-fuchsia-600 flex items-center justify-center font-bold text-sm text-white shadow-lg shadow-purple-900/50">R</div>
              <span className="hidden xl:block font-semibold text-white text-sm leading-tight">AI Resume<br />Enhancer</span>
            </div>
            <nav className="flex-1 overflow-y-auto scrollbar-none px-2 xl:px-3 space-y-1">
              {TABS.map(({ id, label, fullLabel, icon: Icon }) => {
                const active = activeTab === id;
                return (
                  <button key={id} onClick={() => setActiveTab(id)} title={fullLabel}
                    className={`w-full flex flex-col xl:flex-row items-center gap-1 xl:gap-3 px-2 xl:px-3 py-2.5 rounded-xl text-[11px] xl:text-sm transition-all ${active ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/40' : 'text-white/55 hover:text-white hover:bg-purple-500/10'}`}>
                    <Icon className="w-5 h-5 shrink-0" />
                    <span className="xl:hidden leading-tight text-center">{label}</span>
                    <span className="hidden xl:inline font-medium">{fullLabel}</span>
                  </button>
                );
              })}
            </nav>
            <div className="px-2 xl:px-3 pt-3 border-t border-white/10 space-y-1">
              <button onClick={() => setActiveTab('profile')} className="w-full flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-purple-500/10 justify-center xl:justify-start">
                <span className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-sm font-bold text-white shrink-0">
                  {user?.name?.[0]?.toUpperCase() || <User className="w-4 h-4" />}
                </span>
                <span className="hidden xl:block min-w-0 text-left">
                  <span className="block text-sm text-white truncate">{user?.name}</span>
                  <span className="block text-[11px] text-white/40 truncate">{user?.email}</span>
                </span>
              </button>
              <button onClick={handleSignOut} className="w-full flex flex-col xl:flex-row items-center gap-1 xl:gap-3 px-2 xl:px-3 py-2 rounded-xl text-[11px] xl:text-sm text-white/45 hover:text-red-400 hover:bg-red-500/10">
                <LogOut className="w-4 h-4" /> Sign Out
              </button>
            </div>
          </aside>
        )}

        <div className="flex-1 flex flex-col min-w-0">
          {/* Mobile header */}
          {!immersive && (
            <header className="md:hidden flex items-center justify-between h-14 px-4 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-fuchsia-600 flex items-center justify-center font-bold text-xs text-white">R</div>
                <span className="font-semibold text-white text-sm">{current.fullLabel}</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setActiveTab('profile')} className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-xs font-bold text-white" aria-label="Profile">
                  {firstName?.[0]?.toUpperCase() || <User className="w-3.5 h-3.5" />}
                </button>
                <button onClick={handleSignOut} className="w-8 h-8 flex items-center justify-center rounded-lg border border-white/15 text-white/60" aria-label="Sign out">
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </header>
          )}

          <main className={`flex-1 min-h-0 ${immersive ? 'overflow-hidden' : 'overflow-y-auto'}`}>
            <div style={panelStyle('builder')} className={immersive ? 'h-full' : 'max-w-7xl mx-auto px-4 sm:px-8 py-6 sm:py-10 pb-24 md:pb-10'}>
              <ErrorBoundary name="Resume Builder"><ResumeBuilder sessionId={sessionId} onUseResume={setResumeContext} onImmersive={setImmersive} /></ErrorBoundary>
            </div>
            {!immersive && (
              <div className="max-w-6xl mx-auto px-4 sm:px-8 py-6 sm:py-10 pb-24 md:pb-10">
                {activeTab !== 'builder' && (
                  <div className="hidden md:flex items-center gap-3 mb-6">
                    <span className="w-10 h-10 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center">
                      <current.icon className="w-5 h-5 text-purple-300" />
                    </span>
                    <h1 className="text-2xl font-semibold text-white">{current.fullLabel}</h1>
                  </div>
                )}
                <div style={panelStyle('ats')} className="card p-4 sm:p-6">
                  <ErrorBoundary name="ATS Analyzer"><ATSAnalyzer sessionId={sessionId} onResumeAnalyzed={setResumeContext} userId={user?.id} /></ErrorBoundary>
                </div>
                <div style={panelStyle('enhance')} className="card p-4 sm:p-6">
                  <ErrorBoundary name="Enhance Resume"><EnhanceTab sessionId={sessionId} onResumeIndexed={setResumeContext} /></ErrorBoundary>
                </div>
                <div style={panelStyle('cover')} className="card p-4 sm:p-6">
                  <ErrorBoundary name="Cover Letter"><CoverLetterTab resumeContext={resumeContext} /></ErrorBoundary>
                </div>
                <div style={panelStyle('interview')} className="card p-4 sm:p-6">
                  <ErrorBoundary name="Interview Prep"><InterviewTab resumeContext={resumeContext} /></ErrorBoundary>
                </div>
                <div style={panelStyle('chat')} className="card p-4 sm:p-6">
                  <ErrorBoundary name="AI Coach"><ChatTab sessionId={sessionId} resumeContext={resumeContext} /></ErrorBoundary>
                </div>
                <div style={panelStyle('jobs')}>
                  <ErrorBoundary name="Job Tracker"><JobsTab active={activeTab === 'jobs'} /></ErrorBoundary>
                </div>
                <div style={panelStyle('history')} className="card p-4 sm:p-6">
                  <ErrorBoundary name="History"><HistoryDashboard active={activeTab === 'history'} /></ErrorBoundary>
                </div>
                <div style={panelStyle('profile')}>
                  <ErrorBoundary name="Profile">{activeTab === 'profile' && <ProfileTab onOpenTab={setActiveTab} resumeContext={resumeContext} />}</ErrorBoundary>
                </div>
              </div>
            )}
          </main>
        </div>

        {/* Mobile bottom nav */}
        {!immersive && (
          <nav className="fixed bottom-0 left-0 right-0 md:hidden z-20 border-t border-white/10 backdrop-blur-sm" style={{ background: 'rgba(10,10,15,0.95)' }}>
            <div className="flex overflow-x-auto scrollbar-none">
              {TABS.map(({ id, label, icon: Icon }) => (
                <button key={id} onClick={() => setActiveTab(id)}
                  className={`flex-1 min-w-[60px] flex flex-col items-center gap-0.5 py-2 transition-all ${activeTab === id ? 'text-purple-400' : 'text-white/35'}`}>
                  <Icon className="w-5 h-5" />
                  <span className="text-[9px]">{label}</span>
                </button>
              ))}
            </div>
          </nav>
        )}
      </div>
    );
  }

  // Landing page
  return (
    <div className="min-h-screen bg-[#0a0a0f] overflow-x-hidden">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-purple-600/15 blur-[100px] pointer-events-none" />

      {/* Navbar */}
      <nav className="border-b border-white/10 relative z-10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-purple-600 rounded-lg flex items-center justify-center font-bold text-xs">R</div>
              <span className="font-semibold text-white text-sm">AI Resume Enhancer</span>
            </div>

            {/* Desktop nav */}
            <div className="hidden sm:flex items-center gap-3">
              {isLoggedIn ? (
                <>
                  <span className="text-white/50 text-sm">Hi, {user?.name?.split(' ')[0]}!</span>
                  <button onClick={() => setShowApp(true)} className="btn-primary text-sm py-2">
                    Dashboard <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => setShowAuth(true)} className="text-white/60 hover:text-white text-sm transition-colors">Sign In</button>
                  <button onClick={() => setShowAuth(true)} className="btn-primary text-sm py-2">Get Started →</button>
                </>
              )}
            </div>

            {/* Mobile menu button */}
            <button className="sm:hidden text-white/60 p-1" onClick={() => setMenuOpen(!menuOpen)}>
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

          {/* Mobile menu dropdown */}
          {menuOpen && (
            <div className="sm:hidden border-t border-white/10 py-4 space-y-3">
              {isLoggedIn ? (
                <>
                  <p className="text-white/50 text-sm px-1">Hi, {user?.name?.split(' ')[0]}!</p>
                  <button onClick={() => { setShowApp(true); setMenuOpen(false); }} className="btn-primary w-full justify-center">
                    Go to Dashboard <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => { setShowAuth(true); setMenuOpen(false); }} className="w-full text-left text-white/60 text-sm py-2">Sign In</button>
                  <button onClick={() => { setShowAuth(true); setMenuOpen(false); }} className="btn-primary w-full justify-center">Get Started →</button>
                </>
              )}
            </div>
          )}
        </div>
      </nav>

      {/* Hero */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 pt-16 sm:pt-24 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/30 rounded-full px-3 py-1.5 text-xs sm:text-sm text-purple-300 mb-6 sm:mb-8">
          <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          AI-Powered Career Platform — 100% Free
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4 sm:mb-6 leading-tight">
          Land Your Dream Job<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-400">with AI</span>
        </h1>
        <p className="text-base sm:text-xl text-white/50 max-w-xl mx-auto mb-8 sm:mb-10 leading-relaxed px-4">
          Build your resume, check your ATS score, write cover letters and prep for interviews — all free.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
          <button onClick={handleGetStarted} className="btn-primary text-sm sm:text-base px-6 sm:px-8 py-3 sm:py-4 rounded-2xl w-full sm:w-auto justify-center">
            Get Started Free →
          </button>
          <div className="flex items-center gap-2 text-white/40 text-xs sm:text-sm">
            <Shield className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> No credit card required
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="relative z-10 max-w-7xl mx-auto px-4 pb-20">
        <h2 className="text-2xl sm:text-3xl font-bold text-center text-white mb-8 sm:mb-12">Everything you need to get hired</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="card p-5 hover:border-purple-500/40 transition-all duration-300 group">
              <div className="w-9 h-9 bg-purple-500/20 rounded-xl flex items-center justify-center mb-3 group-hover:bg-purple-500/30 transition-colors">
                <Icon className="w-4 h-4 text-purple-400" />
              </div>
              <h3 className="font-semibold text-white text-sm mb-1.5">{title}</h3>
              <p className="text-white/40 text-xs leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-12 sm:mt-16 text-center card p-8 sm:p-12 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-pink-600/20" />
          <div className="relative">
            <h2 className="text-2xl sm:text-3xl font-bold text-white mb-3 sm:mb-4">Ready to get shortlisted?</h2>
            <p className="text-white/50 mb-6 sm:mb-8 text-sm sm:text-base">Join thousands of job seekers using AI to land their dream job.</p>
            <button onClick={handleGetStarted} className="btn-primary text-sm sm:text-base px-6 sm:px-8 py-3 sm:py-4 rounded-2xl mx-auto w-full sm:w-auto justify-center">
              Start for Free →
            </button>
          </div>
        </div>
      </div>

      {showAuth && (
        <AuthModal onClose={(goToDashboard) => { setShowAuth(false); if (goToDashboard || isLoggedIn) setShowApp(true); }} />
      )}
    </div>
  );
}