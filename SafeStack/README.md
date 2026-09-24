# SafeStack — AI-Powered Software Supply-Chain Security Platform

SafeStack is an AI-powered software supply-chain security platform that detects vulnerable open-source dependencies in Node.js applications and helps developers safely fix them without directly modifying their `main`, `master`, or `production` branch.

---

## 🔒 Critical Safety Rule

> [!IMPORTANT]
> **SafeStack MUST NEVER directly modify:**
> - `main`
> - `master`
> - `production`
> - User's original repository files
> 
> All automated fixes occur inside an isolated sandbox working copy on a dedicated SafeStack branch (`safestack/security-fix-<package>-<timestamp>`).
> **SafeStack NEVER automatically merges Pull Requests.** The final merge decision always belongs to the user.

```
Original Repository / Uploaded ZIP
               ↓
SafeStack creates isolated working copy
               ↓
SafeStack creates fix branch (safestack/security-fix-...)
               ↓
Controlled package.json update (smallest safe semver)
               ↓
Controlled package-lock.json update (no audit fix --force)
               ↓
Compatibility tests in Docker (or controlled fallback)
               ↓
Security re-scan & Before vs After comparison
               ↓
Git commit & push to fix branch
               ↓
Create Pull Request with security context & GitHub PR link
               ↓
USER REVIEWS & DECIDES WHETHER TO MERGE ON GITHUB
```

---

## 📌 Problem Statement

Modern web applications rely heavily on third-party npm dependencies. When security vulnerabilities (CVEs/GHSAs) are announced, developers face two major obstacles:
1. **Cryptic scanner alerts:** Tools like `npm audit` flag dozens of vulnerabilities without plain-English explanations or actionable context.
2. **Fear of breaking production:** Automated tools (or dangerous commands like `npm audit fix --force`) often introduce breaking API changes that break builds and production environments.

SafeStack solves this by pairing transparent AI-assisted vulnerability explanations with an isolated, test-verified automated fix pipeline that guarantees zero risk to the developer's main branch.

---

## ✨ Features

- **Project Input Options:**
  - **Large ZIP Uploads:** Drag-and-drop or select project ZIP archives with Zip-Slip path traversal protection, package.json validation, and streaming disk-based upload handling supporting large archives (configurable via `MAX_UPLOAD_SIZE_MB=1024`).
  - **GitHub Import & Association:** Clone public or authenticated repositories (`owner/repo` or full URL) into isolated workspace sandboxes using your configured `GITHUB_TOKEN`. Connect ZIP projects to their GitHub repo at any time.
- **Supply-Chain Dashboard:**
  - Full vulnerability metrics: Total, Critical, High, Medium, Low, Fixable, and Unfixable.
  - Integration Status Bar: Real-time GitHub authentication (`@username`) and Gemini AI readiness badge.
  - Direct quick actions: `Scan Project`, `View Vulnerabilities`, `AI Explain`, `Apply Safe Fix`, `Re-scan`, and `Create Pull Request`.
- **Dependency Detection:**
  - Normalized inventory of direct production, development, and transitive dependencies.
  - Supports modern npm lockfiles (`package-lock.json` v2/v3 `packages` map) and legacy lockfiles (v1).
- **Vulnerability Scanning:**
  - Dual scanner engine integrating `npm audit --json` and Google's `OSV API`.
  - Precise recommendation of fixed versions, CVSS scores, CVE/GHSA identifiers, and CWE tags.
  - Automated deduplication across scanners.
- **AI-Powered Explanations:**
  - Integrated Gemini AI delivering plain-English, student-friendly 7-section structured explanations (What happened, Why it matters, Affected package, Recommended version, SafeStack recommendation, What SafeStack will test, Safety guarantee).
  - **Deterministic Verified Fallback:** Works seamlessly even without an API key or when offline.
- **Safe Fix Engine:**
  - Creates sandbox copy in `storage/working/fix-<uuid>`.
  - Creates dedicated branch `safestack/security-fix-<pkg>-<timestamp>`.
  - Controlled lockfile regeneration (strictly avoids `npm audit fix --force`).
- **Isolated Compatibility Testing:**
  - Docker container execution using `node:18-alpine` with CPU, memory, and timeout limits.
  - Controlled fallback to restricted host execution when Docker Desktop is inactive.
- **Failed Fix Resolution:**
  - If tests fail, SafeStack flags `compatibility_issue` and provides user options:
    - `[Try Recommended Compatible Version]` (semver minor/patch fallback)
    - `[Revert Fix]` (clean restore to original dependencies)
    - `[Review Manually]` (live terminal logs inspection)
- **Security Re-Scan & Delta:**
  - Verifies vulnerability elimination on the updated workspace.
  - Computes Before vs After severity comparison table (e.g. Total: 10 → 0).
- **Pull Request Creation:**
  - Pushes fix branch to remote repository via GitHub API (`@octokit/rest`).
  - Generates real GitHub Pull Request targeting base branch.
  - Renders **OPEN Pull Request on GitHub** button with actual PR URL (`https://github.com/owner/repo/pull/123`).
  - Never auto-merges.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | React 18, Vite, TypeScript, Tailwind CSS, React Router v6, Lucide Icons, React Hot Toast |
| **Backend** | Node.js 18+, Express, TypeScript, Mongoose, MongoDB |
| **Security & Scanning** | `npm audit --json`, OSV REST API, Helmet.js, Express Rate Limit |
| **Git & GitHub** | `simple-git`, `@octokit/rest` |
| **AI / ML** | Google Gemini API (`@google/generative-ai`) with deterministic fallback |
| **Testing & Isolation** | Docker container runner (`node:18-alpine`), `dockerode`, ts-node test suite |

---

## 🚀 Installation & Setup

### 1. Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **MongoDB**: v6.0 or higher (running locally on port 27017 or remote URI)
- **Docker Desktop** *(Optional)*: If running, SafeStack executes tests in isolated containers; otherwise, it uses host fallback.

### 2. Clone and Install Dependencies

```bash
cd CybersecurityProject/SafeStack

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 3. Configure Environment Variables

**Backend (`backend/.env`):**
```env
NODE_ENV=development
PORT=3000

# MongoDB Connection
MONGODB_URI=mongodb://localhost:27017/safestack

# JWT Security
JWT_SECRET=safestack-secret-key-intermediate-prototype-2026
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=safestack-refresh-secret-intermediate-prototype-2026
JWT_REFRESH_EXPIRES_IN=30d

# Gemini AI (Optional - leave empty for deterministic fallback)
GEMINI_API_KEY=your_gemini_api_key

# GitHub Token (For authenticated repo clone, branch push & real PR creation)
GITHUB_TOKEN=github_pat_11BMWN6XQ...

# Frontend URL
FRONTEND_URL=http://localhost:5173

# Large Upload Storage Configuration
UPLOAD_DIR=../storage/uploads
WORKING_DIR=../storage/working
MAX_UPLOAD_SIZE_MB=1024
```

---

## 🖥️ Running SafeStack

### Start Backend (Terminal 1)
```bash
cd backend
npm run dev
```
Backend runs on: **`http://localhost:3000`**  
Health check: **`http://localhost:3000/api/v1/health`**

### Start Frontend (Terminal 2)
```bash
cd frontend
npm run dev
```
Frontend runs on: **`http://localhost:5173`**

---

## 🧪 Running Automated Tests

Run the full automated test suite covering all 10 security scenarios:

```bash
cd backend
npm test
```

Run end-to-end integration validation:
```bash
cd backend
node ../scripts/verifyE2E.js
```

### Verified Test Scenarios:
1. `Scenario 1:` Project with no vulnerabilities
2. `Scenario 2:` Vulnerability detection & fixed version extraction
3. `Scenario 3:` Direct & transitive dependency inventory parsing
4. `Scenario 4:` OSV severity mapping & fixed version extraction
5. `Scenario 5:` AI explanation with deterministic fallback
6. `Scenario 6:` Critical Safety Rule (original project files untouched)
7. `Scenario 7:` Docker testing runner with graceful fallback
8. `Scenario 8:` Re-scan engine & Before vs After severity delta
9. `Scenario 9:` Zip-slip path traversal protection
10. `Scenario 10:` Pull Request generator enforcing user merge control

---

## 🛡️ Security Architecture & Safety Guarantee

- **Zip-Slip Prevention:** Archive extractions validate file paths against canonical root directories before writing to disk.
- **Path Traversal Protection:** Working directories resolve through strict containment checks preventing `..` escape.
- **Large Upload Disk Streaming:** Uploads stream directly to disk with configurable `MAX_UPLOAD_SIZE_MB=1024` and explicit `FILE_TOO_LARGE` error reporting.
- **Non-destructive Fixes:** `npm audit fix --force` is strictly prohibited. Controlled package version pinning is used instead.
- **Credential Protection:** Tokens, passwords, and GitHub secrets are sanitized from logs and never transmitted to the frontend bundle or responses.
- **Main Branch Protection:** Automated fixes run strictly inside `safestack/security-fix-...` branches. SafeStack never auto-merges code.

---

## 📄 License

MIT License. Developed for SafeStack Software Supply Chain Security Platform.
