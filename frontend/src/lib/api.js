import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
});

function savedToken() {
  try {
    return typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  } catch {
    return null;
  }
}

api.interceptors.request.use(config => {
  const token = savedToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

function friendlyMessage(err) {
  if (err.code === 'ECONNABORTED') return 'The server took too long to respond. Please try again.';
  if (!err.response) {
    return "Can't reach the server. Check your internet connection — if the server was asleep it may take up to a minute to wake up, so try again shortly.";
  }
  const data = err.response.data;
  if (err.response.status === 429) return data?.error || 'Too many requests. Please wait a moment and try again.';
  return data?.error || data?.message || err.message || 'Something went wrong';
}

api.interceptors.response.use(
  res => res.data,
  async err => {
    // Free hosting puts the server to sleep; retry a read once while it wakes up
    const cfg = err.config;
    if (!err.response && cfg && cfg.method === 'get' && !cfg._retried) {
      cfg._retried = true;
      await wait(3000);
      return api(cfg);
    }
    // A rejected token (expired, or JWT_SECRET changed) means the saved login is
    // no longer valid: tell AuthContext to sign out instead of failing silently.
    if (err.response?.status === 401 && err.config?.headers?.Authorization && typeof window !== 'undefined') {
      window.dispatchEvent(new Event('auth:expired'));
    }
    const error = new Error(friendlyMessage(err));
    error.status = err.response?.status;
    throw error;
  }
);

export const resumeAPI = {
  enhance: (resumeContent, jobDescription, sessionId) =>
    api.post('/resume/enhance', { resumeContent, jobDescription, sessionId }),
  analyze: (resumeText, sessionId) =>
    api.post('/resume/analyze', { resumeText, sessionId }),
  atsCheck: (file, jobDescription, sessionId) => {
    const form = new FormData();
    form.append('resume', file);
    form.append('jobDescription', jobDescription || '');
    form.append('sessionId', sessionId || 'default');
    return api.post('/resume/ats-check', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 90000,
    });
  },
  atsText: (resumeText, jobDescription) =>
    api.post('/resume/ats-text', { resumeText, jobDescription }, { timeout: 90000 }),
};

export const interviewAPI = {
  generate: (profile, jobRole) =>
    api.post('/interview/generate', { profile, jobRole }),
  evaluate: (question, answer, jobRole) =>
    api.post('/interview/evaluate', { question, answer, jobRole }),
};

export const chatAPI = {
  send: (message, sessionId, resumeContext) =>
    api.post('/chat/message', { message, sessionId, resumeContext }),
  clearSession: (sessionId) =>
    api.delete(`/chat/session/${sessionId}`),
};

export const ragAPI = {
  index: (resumeText, sessionId) =>
    api.post('/rag/index', { resumeText, sessionId }),
  query: (query, sessionId) =>
    api.post('/rag/query', { query, sessionId }),
};

export const authAPI = {
  login: (email, password) =>
    api.post('/auth/login', { email, password }),
  register: (name, email, password) =>
    api.post('/auth/register', { name, email, password }),
  google: (credential) =>
    api.post('/auth/google', { credential }),
  googleConfig: () =>
    api.get('/auth/google/config'),
};

export const profileAPI = {
  get: () =>
    api.get('/auth/me'),
  update: (profile) =>
    api.put('/auth/profile', profile),
};

export const resumesAPI = {
  list: () =>
    api.get('/resumes'),
  get: (id) =>
    api.get(`/resumes/${id}`),
  create: (resume) =>
    api.post('/resumes', resume),
  update: (id, resume) =>
    api.put(`/resumes/${id}`, resume),
  remove: (id) =>
    api.delete(`/resumes/${id}`),
  ai: (action, content, context) =>
    api.post('/resumes/ai', { action, content, context }),
  generate: (answers) =>
    api.post('/resumes/generate', answers, { timeout: 90000 }),
  tailor: (resume, jobDescription) =>
    api.post('/resumes/tailor', { resume, jobDescription }, { timeout: 90000 }),
  share: (id, enabled) =>
    api.put(`/resumes/${id}/share`, { enabled }),
  importPdf: (file) => {
    const form = new FormData();
    form.append('resume', file);
    return api.post('/resumes/import', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 90000,
    });
  },
};

export const publicAPI = {
  resume: (shareId) =>
    api.get(`/public/resumes/${encodeURIComponent(shareId)}`),
};

export const jobsAPI = {
  list: () =>
    api.get('/jobs'),
  create: (job) =>
    api.post('/jobs', job),
  update: (id, job) =>
    api.put(`/jobs/${id}`, job),
  remove: (id) =>
    api.delete(`/jobs/${id}`),
};

export const toolsAPI = {
  linkedin: (resumeText, targetRole) =>
    api.post('/tools/linkedin', { resumeText, targetRole }),
};

export const coverLetterAPI = {
  generate: (form) =>
    api.post('/cover-letter/generate', form),
};

export const historyAPI = {
  save: (entry) =>
    api.post('/history/save', entry),
  list: () =>
    api.get('/history'),
  remove: (id) =>
    api.delete(`/history/${id}`),
};

export default api;
