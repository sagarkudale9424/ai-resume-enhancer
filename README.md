# AI Resume Enhancer & Interview Preparation

Full-stack AI app built with Next.js, Express.js, MongoDB and Groq.

## Tech Stack

**Frontend:** Next.js 14, React 18, Tailwind CSS, Lucide Icons
**Backend:** Node.js, Express.js, MongoDB
**AI:** Groq (`openai/gpt-oss-20b` by default), lightweight in-memory RAG

## Features

- **Resume Builder** — Dashboard of saved resumes with readiness ratings, plus a full-screen editor: drag-and-drop sections, Classic/Modern/Minimal templates, spacing/font controls, AI writing for every section, PDF import, live ATS readiness score, job-description matching, undo/redo, autosave, "Fit to single page" and PDF export
- **AI resume generator** — Answer four questions and get a complete first draft; or upload your old PDF and every section is filled in for you
- **One-click tailoring** — Paste a job description and get a new copy of your resume rewritten for that job (summary, bullets, skill order)
- **Share link** — Public read-only link (`/r/<id>`) you can turn on and off; export as PDF, plain text or copy as text
- **Weak-phrase checker** — Flags "responsible for", "worked on" and similar phrases with stronger alternatives
- **Job Application Tracker** — Kanban board (Wishlist → Applied → Interview → Offer / Rejected) with notes, links, the resume you used and follow-up reminders
- **Interview practice** — Answer generated questions and get an AI score out of 10, feedback and a stronger sample answer
- **LinkedIn Optimizer** — Headline options and an About section written from your profile and resume
- **Profile** — Career profile (headline, links, skills, bio) with profile strength and stats; one click fills the Resume Builder
- **ATS Analyzer** — Upload a PDF resume and get an ATS score with a section-by-section breakdown
- **Resume Enhancement** — AI rewrites your bullets with ATS optimization and keyword alignment
- **Cover Letter Generator** — Tailored cover letters in several tones
- **Interview Q&A Generator** — Technical, behavioral and situational questions with sample answers
- **AI Career Coach Chat** — Conversational assistant with memory and optional RAG mode
- **Score History** — ATS scans are saved per user so you can track progress over time
- **Accounts** — Email/password sign-up with JWT auth

---

## Setup

### 1. Prerequisites

- A Groq API key from https://console.groq.com
- A MongoDB connection string (local or Atlas)

### 2. Install and configure

```bash
npm run install:all
npm run setup          # copies the .env example files
# then edit backend/.env with your GROQ_API_KEY, MONGODB_URI and JWT_SECRET
```

### 3. (Optional) Continue with Google

1. Open [Google Cloud Console → APIs & Services → Credentials](https://console.cloud.google.com/apis/credentials).
2. **Create credentials → OAuth client ID → Web application** (set up the OAuth consent screen first if asked).
3. Under **Authorized JavaScript origins** add every URL the frontend runs on, e.g. `http://localhost:3000` and your Vercel URL.
4. Copy the client ID into `GOOGLE_CLIENT_ID` in `backend/.env` (and in your backend host's environment). The frontend fetches it from the backend automatically.

### 4. Run

```bash
npm run dev:backend    # http://localhost:5000
npm run dev:frontend   # http://localhost:3000
```

---

## Tests

```bash
cd backend && npm test    # API security/validation tests (no database or AI key needed)
cd frontend && npm test   # resume builder logic and template rendering
```

GitHub Actions runs both test suites and the frontend build on every push and pull request.

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Create an account |
| POST | /api/auth/login | Log in |
| POST | /api/auth/google | Log in with a Google ID token (verified server-side) |
| GET | /api/auth/google/config | Google client ID for the sign-in button |
| GET | /api/auth/me | Current user (requires token) |
| PUT | /api/auth/profile | Update profile (requires token) |
| GET | /api/resumes | List saved resumes (requires token) |
| GET / PUT / DELETE | /api/resumes/:id | Get, update or delete a saved resume (requires token) |
| POST | /api/resumes | Save a new resume (requires token) |
| POST | /api/resumes/ai | AI writes a summary, bullets or skills |
| POST | /api/resumes/import | Upload a PDF and get Resume Builder data |
| POST | /api/resumes/generate | AI-written first draft from a short questionnaire |
| POST | /api/resumes/tailor | Rewrite a resume's summary, bullets and skills for a job description |
| PUT | /api/resumes/:id/share | Turn the public share link on or off (requires token) |
| GET | /api/public/resumes/:shareId | Read-only shared resume |
| GET / POST | /api/jobs | List / add job applications (requires token) |
| PUT / DELETE | /api/jobs/:id | Update / delete a job application (requires token) |
| POST | /api/interview/evaluate | Score a practice interview answer |
| POST | /api/tools/linkedin | LinkedIn headline + About section |
| POST | /api/resume/ats-text | ATS report for resume text (optionally against a job description) |
| POST | /api/resume/ats-check | Upload PDF and get ATS report |
| POST | /api/resume/enhance | Enhance resume with job description |
| POST | /api/resume/analyze | Analyze and index resume text for RAG |
| POST | /api/resume/upload | Upload PDF resume and index for RAG |
| POST | /api/cover-letter/generate | Generate a cover letter |
| POST | /api/interview/generate | Generate interview Q&A |
| POST | /api/chat/message | Send chat message |
| DELETE | /api/chat/session/:id | Clear chat session |
| POST | /api/rag/index | Index resume text for RAG |
| POST | /api/rag/query | Query resume via RAG |
| DELETE | /api/rag/session/:id | Clear RAG session |
| POST | /api/history/save | Save an ATS scan (requires token) |
| GET | /api/history | List your scans (requires token) |
| DELETE | /api/history/:id | Delete one of your scans (requires token) |
| GET | /api/health | Health check |

---

## Project Structure

```
resume-enhancer/
├── backend/
│   └── src/
│       ├── index.js              # Express server
│       ├── lib/
│       │   ├── db.js             # Shared MongoDB connection
│       │   └── groq.js           # Shared Groq client + completion helper
│       ├── routes/               # auth, resume, resumes, jobs, public, tools, coverLetter, interview, chat, rag, history
│       └── services/
│           ├── groqService.js    # All LLM prompts
│           └── ragService.js     # In-memory chunking + retrieval
│
└── frontend/
    └── src/
        ├── app/                  # layout, page (landing + dashboard), globals.css
        ├── components/           # ats, auth, builder, chat, coverLetter, history, interview, jobs, profile, resume
        ├── context/AuthContext.js
        └── lib/api.js            # Axios API client
```

---

## Environment Variables

### Backend (`backend/.env`)
```
GROQ_API_KEY=...                 # required
MONGODB_URI=mongodb://...        # required
JWT_SECRET=long-random-string    # required when NODE_ENV=production; changing it signs everyone out
GROQ_MODEL=openai/gpt-oss-20b
GOOGLE_CLIENT_ID=...apps.googleusercontent.com   # enables "Continue with Google"
CLIENT_URL=https://your-app.vercel.app           # allowed frontend origins, comma-separated (empty = any)
PORT=5000
NODE_ENV=development
```

The server refuses to start if a required variable is missing, and `GET /api/health` reports whether MongoDB is reachable.

### Frontend (`frontend/.env.local`)
```
NEXT_PUBLIC_API_URL=http://localhost:5000
```
