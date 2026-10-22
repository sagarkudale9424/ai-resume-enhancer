'use client';
import { useState, useEffect } from 'react';
import { User, Mail, Phone, MapPin, Linkedin, Github, Globe, Briefcase, Save, Loader, CheckCircle, AlertCircle, X, Target, FileText, Award, Calendar, Sparkles, Copy } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { profileAPI, historyAPI, resumesAPI, toolsAPI } from '../../lib/api';

const EMPTY_PROFILE = {
  name: '', headline: '', phone: '', location: '', linkedin: '', github: '', website: '', targetRole: '', bio: '', skills: [],
};

const COMPLETION_FIELDS = ['name', 'headline', 'phone', 'location', 'linkedin', 'targetRole', 'bio', 'skills'];

function initials(name) {
  return (name || '?').split(' ').filter(Boolean).slice(0, 2).map(w => w[0].toUpperCase()).join('');
}

function Field({ icon: Icon, label, ...props }) {
  return (
    <div className="space-y-1.5">
      <label className="label">{label}</label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
        <input className="input pl-10" {...props} />
      </div>
    </div>
  );
}

function LinkedInOptimizer({ profile, resumeContext }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');

  const source = [
    profile.name, profile.headline, profile.targetRole && `Target role: ${profile.targetRole}`, profile.bio,
    profile.skills.length && `Skills: ${profile.skills.join(', ')}`, resumeContext,
  ].filter(Boolean).join('\n');

  async function generate() {
    setLoading(true);
    setError('');
    try {
      const res = await toolsAPI.linkedin(source, profile.targetRole);
      setResult(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function copy(text, key) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(''), 1500);
    } catch {
      setError('Could not copy — select the text and copy it manually.');
    }
  }

  return (
    <div className="card p-5 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-[#0a66c2] flex items-center justify-center"><Linkedin className="w-5 h-5 text-white" /></span>
          <div>
            <h3 className="text-base font-semibold text-white">LinkedIn Optimizer</h3>
            <p className="text-xs text-white/45">AI writes a recruiter-friendly headline and About section from your profile{resumeContext ? ' and resume' : ''}.</p>
          </div>
        </div>
        <button className="btn-primary py-2 justify-center" onClick={generate} disabled={loading || source.length < 50}>
          {loading ? <Loader className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} {result ? 'Regenerate' : 'Generate'}
        </button>
      </div>
      {source.length < 50 && <p className="text-xs text-white/35">Fill in your headline, about and skills above (or load your resume) to enable this.</p>}
      {error && <p className="text-sm text-red-400 flex items-center gap-2"><AlertCircle className="w-4 h-4" />{error}</p>}
      {result && (
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="label">Headline options</p>
            {result.headlines.map((h, i) => (
              <div key={i} className="flex items-start justify-between gap-3 rounded-xl border border-white/10 p-3">
                <p className="text-sm text-white/85">{h}</p>
                <button onClick={() => copy(h, `h${i}`)} className="text-white/40 hover:text-white shrink-0" aria-label="Copy headline">
                  {copied === `h${i}` ? <CheckCircle className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            ))}
          </div>
          {result.about && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="label">About section</p>
                <button onClick={() => copy(result.about, 'about')} className="text-xs text-white/50 hover:text-white flex items-center gap-1">
                  {copied === 'about' ? <CheckCircle className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />} Copy
                </button>
              </div>
              <p className="text-sm text-white/75 leading-relaxed whitespace-pre-wrap rounded-xl border border-white/10 p-3">{result.about}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ProfileTab({ onOpenTab, resumeContext = '' }) {
  const { user, updateUser } = useAuth();
  const [profile, setProfile] = useState(EMPTY_PROFILE);
  const [email, setEmail] = useState('');
  const [memberSince, setMemberSince] = useState(null);
  const [stats, setStats] = useState({ scans: 0, bestScore: 0, resumes: 0 });
  const [skillInput, setSkillInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user?.id) return;
    loadProfile();
  }, [user?.id]);

  async function loadProfile() {
    setLoading(true);
    setError('');
    try {
      const res = await profileAPI.get();
      const p = res.user || {};
      setProfile({ ...EMPTY_PROFILE, ...Object.fromEntries(Object.keys(EMPTY_PROFILE).map(k => [k, p[k] ?? EMPTY_PROFILE[k]])) });
      setEmail(p.email || user.email);
      setMemberSince(p.createdAt);
    } catch (err) {
      setError(`Could not load profile: ${err.message}. Try signing out and back in.`);
    } finally {
      setLoading(false);
    }

    const [history, resumes] = await Promise.all([
      historyAPI.list().catch(() => ({ data: [] })),
      resumesAPI.list().catch(() => ({ data: [] })),
    ]);
    const scores = (history.data || []).map(h => h.atsScore);
    setStats({
      scans: scores.length,
      bestScore: scores.length ? Math.max(...scores) : 0,
      resumes: (resumes.data || []).length,
    });
  }

  function set(field, value) {
    setProfile(prev => ({ ...prev, [field]: value }));
    setSaved(false);
  }

  function addSkill(e) {
    e.preventDefault();
    const newSkills = skillInput.split(',').map(s => s.trim()).filter(s => s && !profile.skills.includes(s));
    if (newSkills.length) set('skills', [...profile.skills, ...newSkills]);
    setSkillInput('');
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    try {
      const res = await profileAPI.update(profile);
      updateUser(res.user, res.token);
      setSaved(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const filled = COMPLETION_FIELDS.filter(f => (Array.isArray(profile[f]) ? profile[f].length : String(profile[f] || '').trim())).length;
  const completion = Math.round((filled / COMPLETION_FIELDS.length) * 100);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-white/40 gap-2">
        <Loader className="w-5 h-5 animate-spin" /> Loading profile...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10">
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/30 via-fuchsia-600/20 to-pink-600/20" />
        <div className="relative p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-2xl font-bold text-white shadow-lg shadow-purple-900/40 shrink-0">
            {initials(profile.name)}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl sm:text-2xl font-bold text-white truncate">{profile.name || 'Your Name'}</h2>
            <p className="text-white/60 text-sm">{profile.headline || 'Add a headline, e.g. "Full-Stack Developer | React & Node.js"'}</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-white/40">
              <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" />{email}</span>
              {profile.location && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{profile.location}</span>}
              {memberSince && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />Member since {new Date(memberSince).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                </span>
              )}
            </div>
          </div>
          <div className="sm:w-48">
            <div className="flex justify-between text-xs mb-1.5">
              <span className="text-white/50">Profile strength</span>
              <span className="font-bold text-purple-300">{completion}%</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.1)' }}>
              <div className="h-full rounded-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-700" style={{ width: `${completion}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'ATS Scans', value: stats.scans, icon: Target, tab: 'history' },
          { label: 'Best ATS Score', value: stats.bestScore ? `${stats.bestScore}%` : '—', icon: Award, tab: 'history' },
          { label: 'Saved Resumes', value: stats.resumes, icon: FileText, tab: 'builder' },
        ].map(({ label, value, icon: Icon, tab }) => (
          <button key={label} onClick={() => onOpenTab?.(tab)} className="card p-4 text-left hover:border-purple-500/40 transition-all">
            <Icon className="w-4 h-4 text-purple-400 mb-2" />
            <p className="text-xl sm:text-2xl font-bold text-white">{value}</p>
            <p className="text-xs text-white/40">{label}</p>
          </button>
        ))}
      </div>

      {/* Form */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field icon={User} label="Full Name" value={profile.name} onChange={e => set('name', e.target.value)} placeholder="Sahil Shaikh" />
        <Field icon={Briefcase} label="Headline" value={profile.headline} onChange={e => set('headline', e.target.value)} placeholder="Full-Stack Developer | React & Node.js" />
        <Field icon={Target} label="Target Role" value={profile.targetRole} onChange={e => set('targetRole', e.target.value)} placeholder="Software Engineer" />
        <Field icon={Phone} label="Phone" value={profile.phone} onChange={e => set('phone', e.target.value)} placeholder="+91 98765 43210" />
        <Field icon={MapPin} label="Location" value={profile.location} onChange={e => set('location', e.target.value)} placeholder="Mumbai, India" />
        <Field icon={Linkedin} label="LinkedIn" value={profile.linkedin} onChange={e => set('linkedin', e.target.value)} placeholder="linkedin.com/in/username" />
        <Field icon={Github} label="GitHub" value={profile.github} onChange={e => set('github', e.target.value)} placeholder="github.com/username" />
        <Field icon={Globe} label="Portfolio / Website" value={profile.website} onChange={e => set('website', e.target.value)} placeholder="yourname.dev" />
      </div>

      <div className="space-y-1.5">
        <label className="label">About You</label>
        <textarea
          className="textarea h-28"
          value={profile.bio}
          onChange={e => set('bio', e.target.value)}
          placeholder="A short professional summary. The Resume Builder can use this as your summary."
        />
      </div>

      <div className="space-y-2">
        <label className="label">Skills</label>
        <form onSubmit={addSkill} className="flex gap-2">
          <input className="input" value={skillInput} onChange={e => setSkillInput(e.target.value)} placeholder="Type a skill and press Enter (comma-separate for many)" />
          <button type="submit" className="btn-secondary shrink-0">Add</button>
        </form>
        {profile.skills.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {profile.skills.map(skill => (
              <span key={skill} className="badge bg-purple-500/15 text-purple-300 border border-purple-500/30 flex items-center gap-1.5">
                {skill}
                <button onClick={() => set('skills', profile.skills.filter(s => s !== skill))} className="hover:text-white" aria-label={`Remove ${skill}`}>
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-xl p-3">
          <AlertCircle className="w-4 h-4 shrink-0" /> {error}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button className="btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? <Loader className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? 'Saving...' : 'Save Profile'}
        </button>
        {saved && <span className="flex items-center gap-1.5 text-green-400 text-sm"><CheckCircle className="w-4 h-4" /> Saved</span>}
      </div>

      <LinkedInOptimizer profile={profile} resumeContext={resumeContext} />
    </div>
  );
}
