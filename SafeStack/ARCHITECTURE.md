# SafeStack Architecture Document

**Version:** 1.0 (Revised)  
**Date:** September 21, 2026  
**Project Type:** Software Supply Chain Security Platform  
**Complexity:** Intermediate-Level

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Complete Folder Structure](#complete-folder-structure)
3. [Frontend Architecture](#frontend-architecture)
4. [Backend Architecture](#backend-architecture)
5. [Database Models](#database-models)
6. [API Design](#api-design)
7. [Security Architecture](#security-architecture)
8. [Docker Isolation Strategy](#docker-isolation-strategy)
9. [Core Workflow: Scan → Explain → Fix → Test → Re-test → PR](#core-workflow)
10. [Technology Stack & Dependencies](#technology-stack--dependencies)
11. [Development Phases](#development-phases)

---

## Project Overview

SafeStack is a developer-friendly software supply chain security platform that helps find, understand, safely fix, test, and verify vulnerable software dependencies.

### Core Principle
**SafeStack NEVER directly modifies the user's main/production branch automatically.**

All fixes happen in isolated SafeStack-created branches. Users maintain final control over merging changes.

### Version 1 Scope
- **Node.js projects only** (package.json + package-lock.json)
- **GitHub repositories** (via GitHub App) & **ZIP uploads**
- **npm audit** integration
- **OSV (Open Source Vulnerabilities)** database
- **Gemini AI** for explanations
- **Docker-based isolated testing** (untrusted code execution)
- Automated fix branches
- Testing & verification
- GitHub Pull Request creation

### Design Philosophy
- **Intermediate-level complexity** - achievable, maintainable, expandable
- **Security-first** - all untrusted code runs in Docker containers
- **Simple but not simplistic** - clean architecture without over-engineering
- **User control** - SafeStack assists, user decides

---

## Complete Folder Structure

```
SafeStack/
│
├── frontend/                          # React-based web application
│   ├── public/
│   │   ├── index.html
│   │   ├── favicon.ico
│   │   └── assets/
│   │       ├── images/
│   │       └── icons/
│   │
│   ├── src/
│   │   ├── components/                # Reusable UI components
│   │   │   ├── common/                # Shared components
│   │   │   │   ├── Button.jsx
│   │   │   │   ├── Card.jsx
│   │   │   │   ├── LoadingSpinner.jsx
│   │   │   │   ├── Modal.jsx
│   │   │   │   ├── Alert.jsx
│   │   │   │   └── Badge.jsx
│   │   │   │
│   │   │   ├── layout/                # Layout components
│   │   │   │   ├── Header.jsx
│   │   │   │   ├── Sidebar.jsx
│   │   │   │   ├── Footer.jsx
│   │   │   │   └── Layout.jsx
│   │   │   │
│   │   │   ├── auth/                  # Authentication components
│   │   │   │   ├── LoginForm.jsx
│   │   │   │   ├── SignupForm.jsx
│   │   │   │   └── ProtectedRoute.jsx
│   │   │   │
│   │   │   ├── project/               # Project-related components
│   │   │   │   ├── ProjectUpload.jsx       # ZIP upload
│   │   │   │   ├── GitHubConnect.jsx       # GitHub integration
│   │   │   │   ├── ProjectList.jsx
│   │   │   │   └── ProjectCard.jsx
│   │   │   │
│   │   │   ├── scan/                  # Scanning components
│   │   │   │   ├── ScanProgress.jsx
│   │   │   │   ├── ScanResults.jsx
│   │   │   │   ├── VulnerabilityList.jsx
│   │   │   │   └── VulnerabilityCard.jsx
│   │   │   │
│   │   │   ├── vulnerability/         # Vulnerability detail components
│   │   │   │   ├── VulnerabilityDetail.jsx
│   │   │   │   ├── AIExplanation.jsx
│   │   │   │   ├── VersionComparison.jsx
│   │   │   │   ├── FixSuggestion.jsx
│   │   │   │   └── CVEInfo.jsx
│   │   │   │
│   │   │   ├── fix/                   # Fix workflow components
│   │   │   │   ├── FixInitiator.jsx
│   │   │   │   ├── FixProgress.jsx
│   │   │   │   ├── TestResults.jsx
│   │   │   │   ├── CompatibilityIssues.jsx
│   │   │   │   └── PRPreview.jsx
│   │   │   │
│   │   │   └── dashboard/             # Dashboard components
│   │   │       ├── DashboardOverview.jsx
│   │   │       ├── SecurityScore.jsx
│   │   │       ├── VulnerabilityStats.jsx
│   │   │       └── RecentActivity.jsx
│   │   │
│   │   ├── pages/                     # Page-level components
│   │   │   ├── Home.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── ProjectDetail.jsx
│   │   │   ├── ScanDetail.jsx
│   │   │   ├── VulnerabilityDetail.jsx
│   │   │   ├── Settings.jsx
│   │   │   └── NotFound.jsx
│   │   │
│   │   ├── hooks/                     # Custom React hooks
│   │   │   ├── useAuth.js
│   │   │   ├── useProject.js
│   │   │   ├── useScan.js
│   │   │   ├── useWebSocket.js
│   │   │   └── usePolling.js
│   │   │
│   │   ├── context/                   # React Context providers
│   │   │   ├── AuthContext.jsx
│   │   │   ├── ProjectContext.jsx
│   │   │   └── NotificationContext.jsx
│   │   │
│   │   ├── services/                  # API service layer
│   │   │   ├── api.js                 # Axios configuration
│   │   │   ├── authService.js
│   │   │   ├── projectService.js
│   │   │   ├── scanService.js
│   │   │   ├── vulnerabilityService.js
│   │   │   ├── fixService.js
│   │   │   └── githubService.js
│   │   │
│   │   ├── utils/                     # Utility functions
│   │   │   ├── formatters.js          # Date, number formatting
│   │   │   ├── validators.js          # Form validation
│   │   │   ├── severityHelpers.js     # Severity mapping
│   │   │   └── constants.js           # Constants
│   │   │
│   │   ├── styles/                    # Global styles
│   │   │   ├── global.css
│   │   │   ├── variables.css
│   │   │   └── themes.css
│   │   │
│   │   ├── App.jsx                    # Root component
│   │   ├── routes.jsx                 # Route definitions
│   │   └── index.jsx                  # Entry point
│   │
│   ├── package.json
│   ├── package-lock.json
│   ├── vite.config.js                 # Vite configuration
│   ├── .env.example
│   └── .eslintrc.js
│
├── backend/                           # Node.js/Express server
│   ├── src/
│   │   ├── config/                    # Configuration files
│   │   │   ├── database.ts            # MongoDB connection
│   │   │   ├── github.ts              # GitHub App & API config
│   │   │   ├── gemini.ts              # Gemini AI config
│   │   │   ├── docker.ts              # Docker configuration
│   │   │   └── environment.ts         # Environment variables
│   │   │
│   │   ├── models/                    # Mongoose models
│   │   │   ├── User.ts
│   │   │   ├── Project.ts
│   │   │   ├── Scan.ts
│   │   │   ├── Vulnerability.ts
│   │   │   ├── Fix.ts
│   │   │   ├── TestResult.ts
│   │   │   └── PullRequest.ts
│   │   │
│   │   ├── controllers/               # Request handlers
│   │   │   ├── authController.ts
│   │   │   ├── projectController.ts
│   │   │   ├── scanController.ts
│   │   │   ├── vulnerabilityController.ts
│   │   │   ├── fixController.ts
│   │   │   ├── githubController.ts
│   │   │   └── webhookController.ts
│   │   │
│   │   ├── services/                  # Business logic layer
│   │   │   ├── auth/
│   │   │   │   ├── authService.ts
│   │   │   │   └── jwtService.ts
│   │   │   │
│   │   │   ├── project/
│   │   │   │   ├── projectService.ts
│   │   │   │   ├── uploadService.ts
│   │   │   │   └── extractionService.ts
│   │   │   │
│   │   │   ├── scanner/
│   │   │   │   ├── scannerService.ts       # Main scanner orchestrator
│   │   │   │   ├── npmAuditService.ts      # npm audit integration
│   │   │   │   ├── osvService.ts           # OSV database queries
│   │   │   │   ├── dependencyParser.ts     # Parse package.json/lock
│   │   │   │   └── severityCalculator.ts   # Calculate risk scores
│   │   │   │
│   │   │   ├── ai/
│   │   │   │   ├── geminiService.ts        # Gemini AI integration
│   │   │   │   ├── explanationGenerator.ts # Generate explanations
│   │   │   │   └── promptTemplates.ts      # AI prompt templates
│   │   │   │
│   │   │   ├── fix/
│   │   │   │   ├── fixService.ts           # Fix orchestrator
│   │   │   │   ├── branchService.ts        # Git branch management
│   │   │   │   ├── dependencyUpdater.ts    # Update package.json/lock
│   │   │   │   ├── dockerTestRunner.ts     # Run tests in Docker
│   │   │   │   ├── compatibilityChecker.ts # Check for issues
│   │   │   │   └── resolutionService.ts    # Attempt safe fixes
│   │   │   │
│   │   │   ├── docker/
│   │   │   │   ├── dockerService.ts        # Docker container management
│   │   │   │   ├── imageBuilder.ts         # Build test images
│   │   │   │   └── containerRunner.ts      # Execute containers safely
│   │   │   │
│   │   │   ├── github/
│   │   │   │   ├── githubAppService.ts     # GitHub App authentication
│   │   │   │   ├── githubApiService.ts     # GitHub API client (Octokit)
│   │   │   │   ├── repoService.ts          # Repository operations
│   │   │   │   └── prService.ts            # Pull request creation
│   │   │   │
│   │   │   └── notification/
│   │   │       └── notificationService.ts  # In-app notifications
│   │   │
│   │   ├── middleware/                # Express middleware
│   │   │   ├── auth.ts                # JWT verification
│   │   │   ├── errorHandler.ts        # Global error handler
│   │   │   ├── validation.ts          # Request validation
│   │   │   ├── rateLimiter.ts         # Rate limiting
│   │   │   ├── upload.ts              # Multer file upload
│   │   │   └── logging.ts             # Request logging
│   │   │
│   │   ├── routes/                    # API route definitions
│   │   │   ├── index.ts               # Route aggregator
│   │   │   ├── auth.ts                # /api/auth/*
│   │   │   ├── projects.ts            # /api/projects/*
│   │   │   ├── scans.ts               # /api/scans/*
│   │   │   ├── vulnerabilities.ts     # /api/vulnerabilities/*
│   │   │   ├── fixes.ts               # /api/fixes/*
│   │   │   ├── github.ts              # /api/github/*
│   │   │   └── webhooks.ts            # /api/webhooks/*
│   │   │
│   │   ├── utils/                     # Utility functions
│   │   │   ├── logger.ts              # Winston logger
│   │   │   ├── fileSystem.ts          # File operations
│   │   │   ├── gitOperations.ts       # Git commands
│   │   │   ├── validators.ts          # Data validation
│   │   │   ├── crypto.ts              # Encryption utilities
│   │   │   └── constants.ts           # Constants
│   │   │
│   │   ├── validators/                # Request validation schemas (Joi)
│   │   │   ├── authValidator.ts
│   │   │   ├── projectValidator.ts
│   │   │   ├── scanValidator.ts
│   │   │   └── fixValidator.ts
│   │   │
│   │   ├── types/                     # TypeScript type definitions
│   │   │   ├── express.d.ts
│   │   │   ├── scan.types.ts
│   │   │   ├── fix.types.ts
│   │   │   └── github.types.ts
│   │   │
│   │   ├── app.ts                     # Express app setup
│   │   └── server.ts                  # Server entry point
│   │
│   ├── tests/                         # Test files
│   │   ├── unit/
│   │   ├── integration/
│   │   └── fixtures/
│   │
│   ├── package.json
│   ├── package-lock.json
│   ├── tsconfig.json
│   ├── .env.example
│   ├── .eslintrc.js
│   └── nodemon.json
│
├── shared/                            # Shared code between frontend/backend
│   ├── types/                         # TypeScript type definitions
│   │   ├── common.types.ts
│   │   └── api.types.ts
│   ├── constants.ts                   # Shared constants
│   └── utils.ts                       # Shared utilities
│
├── storage/                           # File storage (gitignored)
│   ├── uploads/                       # Uploaded ZIP files
│   ├── extracted/                     # Extracted projects
│   ├── working/                       # Working directories for fixes
│   └── temp/                          # Temporary files
│
├── docs/                              # Documentation
│   ├── API.md                         # API documentation
│   ├── SETUP.md                       # Setup instructions
│   ├── WORKFLOWS.md                   # Workflow documentation
│   └── SECURITY.md                    # Security guidelines
│
├── scripts/                           # Utility scripts
│   ├── setup-db.js                    # Database initialization
│   ├── seed-data.js                   # Seed test data
│   └── cleanup.js                     # Cleanup script
│
├── .github/                           # GitHub configuration
│   └── workflows/
│       ├── ci.yml                     # CI pipeline
│       └── deploy.yml                 # Deployment
│
├── docker/                            # Docker configuration
│   ├── Dockerfile.frontend
│   ├── Dockerfile.backend
│   ├── Dockerfile.test-runner         # Docker image for isolated testing
│   └── docker-compose.yml
│
├── .gitignore
├── .env.example
├── README.md
├── ARCHITECTURE.md                    # This file
├── LICENSE
└── package.json                       # Root package.json (optional monorepo)
```

---

## Frontend Architecture

### Technology Stack
- **Framework:** React 18+ with TypeScript
- **Build Tool:** Vite (fast development, optimized builds)
- **Routing:** React Router v6
- **State Management:** React Context API + hooks (lightweight for V1)
- **HTTP Client:** Axios
- **Progress Updates:** Polling (GET /scans/:id/status, GET /fixes/:id/status)
- **Styling:** TailwindCSS (utility-first)
- **Forms:** React Hook Form + Yup validation
- **Icons:** Lucide React
- **Notifications:** React Hot Toast

### Key Features

1. **Project Management**
   - Upload ZIP files (drag-and-drop)
   - Connect GitHub repositories (GitHub App)
   - View project list with status

2. **Vulnerability Dashboard**
   - Visual severity indicators (Critical, High, Medium, Low)
   - Filter/sort capabilities
   - Security score visualization

3. **AI Explanations**
   - Clear, beginner-friendly vulnerability explanations
   - Technical details in expandable sections
   - Visual impact indicators

4. **Fix Workflow UI**
   - One-click fix initiation
   - Polling-based progress updates
   - Test result visualization
   - PR preview before creation

5. **User Experience Principles**
   - Simple, clean interface
   - Progressive disclosure (simple → detailed)
   - Clear terminology with tooltips
   - Loading states for all async operations
   - Error messages with actionable guidance

### Component Architecture Pattern

```typescript
// Smart Container Component (handles logic)
const VulnerabilityDetailContainer = () => {
  const { id } = useParams();
  const { vulnerability, loading } = useVulnerability(id);
  
  if (loading) return <LoadingSpinner />;
  
  return <VulnerabilityDetailView vulnerability={vulnerability} />;
};

// Presentational Component (pure UI)
const VulnerabilityDetailView = ({ vulnerability }: Props) => {
  return (
    <Card>
      <CVEInfo cve={vulnerability.cve} />
      <AIExplanation explanation={vulnerability.explanation} />
      <FixSuggestion fix={vulnerability.suggestedFix} />
    </Card>
  );
};
```

---

## Backend Architecture

### Technology Stack
- **Runtime:** Node.js 18+ LTS
- **Language:** TypeScript
- **Framework:** Express.js
- **Database:** MongoDB 6+ with Mongoose ODM
- **Authentication:** JWT (JSON Web Tokens)
- **File Upload:** Multer
- **Git Operations:** simple-git library
- **Docker:** For isolated test execution
- **Testing:** Jest + Supertest
- **Logging:** Winston
- **Validation:** Joi

### Architectural Layers

```
┌─────────────────────────────────────────┐
│         Routes (API Endpoints)          │
├─────────────────────────────────────────┤
│         Controllers (HTTP Logic)        │
├─────────────────────────────────────────┤
│         Services (Business Logic)       │
├─────────────────────────────────────────┤
│      Models (Database Abstraction)      │
└─────────────────────────────────────────┘
```

### Service Layer Design

Each major feature has a dedicated service:

1. **Scanner Service** - Orchestrates vulnerability scanning
2. **Fix Service** - Manages the fix workflow
3. **GitHub App Service** - Handles GitHub App authentication and API interactions
4. **Gemini Service** - AI explanation generation
5. **Branch Service** - Git branch operations
6. **Docker Test Runner Service** - Execute tests in isolated containers

### Long-Running Operations

**No background job queue in V1.** Long-running operations (scan, fix, test) update database status fields directly:

```typescript
// Example: Scan operation
async function performScan(scanId: string) {
  await Scan.updateOne({ _id: scanId }, { status: 'running' });
  
  try {
    // Run npm audit
    const npmResults = await runNpmAudit(workdir);
    
    // Query OSV
    const osvResults = await queryOSV(dependencies);
    
    // Store results
    await Scan.updateOne({ _id: scanId }, { 
      status: 'completed',
      npmAuditResults: npmResults,
      osvResults: osvResults,
      completedAt: new Date()
    });
  } catch (error) {
    await Scan.updateOne({ _id: scanId }, { 
      status: 'failed',
      errorMessage: error.message 
    });
  }
}
```

Frontend polls status endpoints (`GET /scans/:id/status`) at regular intervals (every 2-3 seconds) to show progress.

### Security Measures

1. **Authentication:** JWT tokens with refresh mechanism
2. **Authorization:** User-scoped data access
3. **Input Validation:** All inputs validated before processing (Joi schemas)
4. **Rate Limiting:** Prevent abuse (express-rate-limit)
5. **File Upload Security:**
   - File type validation (.zip only)
   - Size limits (50MB max)
   - Isolated extraction directory
6. **Docker Isolation:**
   - All untrusted code execution in Docker containers
   - No host filesystem access
   - Resource limits (CPU, memory, time)
   - Network isolation
7. **Git Operations Security:**
   - Isolated working directories per project
   - No direct main branch access
   - Sandboxed command execution
8. **API Security:**
   - CORS configuration
   - Helmet.js for headers
   - NoSQL injection prevention (Mongoose sanitization)
   - XSS protection
9. **GitHub App Security:**
   - Installation tokens (short-lived, scoped)
   - Webhook signature verification
   - Minimum required permissions

---

## Database Models

### MongoDB with Mongoose

All models use MongoDB ObjectId (`_id`) as the primary key and automatic timestamps (`createdAt`, `updatedAt`).

### User Model

```typescript
interface IUser {
  _id: ObjectId
  email: string                    // unique, required
  password: string                 // hashed with bcrypt, required
  name: string
  githubInstallationId?: number    // GitHub App installation ID
  githubUsername?: string
  role: 'user' | 'admin'           // default: 'user'
  emailVerified: boolean           // default: false
  createdAt: Date
  updatedAt: Date
}

// Indexes
email: unique
githubInstallationId: sparse unique
```

**Note:** No stored GitHub access tokens. We use GitHub App installation tokens (short-lived, scoped).

### Project Model

```typescript
interface IProject {
  _id: ObjectId
  userId: ObjectId                 // Reference to User
  name: string                     // required
  type: 'upload' | 'github'        // required
  
  // For uploads
  uploadPath?: string              // Path to extracted project
  originalFilename?: string
  
  // For GitHub
  githubRepoUrl?: string
  githubOwner?: string
  githubRepo?: string
  githubInstallationId?: number    // GitHub App installation ID
  defaultBranch: string            // default: 'main'
  
  // Metadata
  packageManager: 'npm' | 'yarn' | 'pnpm'  // default: 'npm'
  nodeVersion?: string
  hasPackageJson: boolean
  hasPackageLock: boolean
  
  // Status
  status: 'uploaded' | 'scanning' | 'scanned' | 'fixing' | 'error'
  lastScanAt?: Date
  
  createdAt: Date
  updatedAt: Date
}

// Indexes
userId: 1
status: 1
githubOwner_githubRepo: compound index
```

### Scan Model

```typescript
interface IScan {
  _id: ObjectId
  projectId: ObjectId              // Reference to Project
  
  // Scan details
  status: 'queued' | 'running' | 'completed' | 'failed'
  startedAt?: Date
  completedAt?: Date
  duration?: number                // seconds
  
  // Results
  totalDependencies: number        // default: 0
  vulnerableCount: number          // default: 0
  criticalCount: number            // default: 0
  highCount: number                // default: 0
  mediumCount: number              // default: 0
  lowCount: number                 // default: 0
  
  // Sources (raw results)
  npmAuditResults?: object         // npm audit --json output
  osvResults?: object              // OSV API responses
  
  // Error handling
  errorMessage?: string
  errorStack?: string
  
  createdAt: Date
  updatedAt: Date
}

// Indexes
projectId: 1
status: 1
createdAt: -1 (descending)
```

### Vulnerability Model

```typescript
interface IVulnerability {
  _id: ObjectId
  scanId: ObjectId                 // Reference to Scan
  
  // Package information
  packageName: string              // required
  currentVersion: string           // required
  recommendedVersion?: string
  isDirect: boolean                // direct vs transitive
  
  // Vulnerability details
  cveId?: string                   // e.g., 'CVE-2024-12345'
  osvId?: string                   // e.g., 'GHSA-xxxx-yyyy-zzzz'
  title: string                    // required
  description: string              // required
  severity: 'critical' | 'high' | 'medium' | 'low'
  cvssScore?: number               // 0.0-10.0
  
  // AI Explanation
  aiExplanation?: string           // Gemini-generated
  aiExplanationGenerated: boolean  // default: false
  
  // Fix information
  hasFixAvailable: boolean
  fixType: 'update' | 'patch' | 'replace' | 'none'
  
  // References
  references: string[]             // URLs
  cwe: string[]                    // CWE IDs
  
  // Status
  status: 'open' | 'fixing' | 'fixed' | 'ignored' | 'false_positive'
  resolvedAt?: Date
  
  createdAt: Date
  updatedAt: Date
}

// Indexes
scanId: 1
severity: 1
status: 1
packageName: 1
```

### Fix Model

```typescript
interface IFix {
  _id: ObjectId
  projectId: ObjectId              // Reference to Project
  vulnerabilityId: ObjectId        // Reference to Vulnerability
  
  // Git branch info
  branchName: string               // e.g., 'safestack/fix-lodash-1234'
  baseBranch: string               // e.g., 'main'
  
  // Fix details
  status: 'queued' | 'creating_branch' | 'updating_deps' | 'testing' |
          'compatibility_issue' | 'retrying' | 'completed' | 'failed'
  
  // Changes made
  packagesBefore?: object          // package.json before
  packagesAfter?: object           // package.json after
  updatedPackages: Array<{
    name: string
    fromVersion: string
    toVersion: string
  }>
  
  // Testing
  testsRun: boolean                // default: false
  testsPassed?: boolean
  testOutput?: string
  
  // Compatibility issues
  hasCompatibilityIssue: boolean   // default: false
  compatibilityIssues: string[]
  resolutionAttempted: boolean     // default: false
  resolutionSuccessful?: boolean
  
  // Timestamps
  startedAt?: Date
  completedAt?: Date
  
  // Error handling
  errorMessage?: string
  
  createdAt: Date
  updatedAt: Date
}

// Indexes
projectId: 1
vulnerabilityId: 1
status: 1
createdAt: -1
```

### TestResult Model

```typescript
interface ITestResult {
  _id: ObjectId
  fixId: ObjectId                  // Reference to Fix
  
  // Test execution
  attemptNumber: number            // for retries, default: 1
  command: string                  // e.g., 'npm test'
  exitCode: number
  passed: boolean
  
  // Output
  stdout: string
  stderr: string
  duration: number                 // milliseconds
  
  // Parsed results (if available)
  totalTests?: number
  passedTests?: number
  failedTests?: number
  
  executedAt: Date
  createdAt: Date
  updatedAt: Date
}

// Indexes
fixId: 1
attemptNumber: 1
executedAt: -1
```

### PullRequest Model

```typescript
interface IPullRequest {
  _id: ObjectId
  fixId: ObjectId                  // Reference to Fix
  projectId: ObjectId              // Reference to Project
  
  // GitHub PR info
  githubPrNumber?: number
  githubPrUrl?: string
  
  // PR details
  title: string                    // required
  body: string                     // required (Markdown)
  baseBranch: string               // required
  headBranch: string               // required
  
  // Status
  status: 'draft' | 'open' | 'merged' | 'closed' | 'error'
  
  // GitHub webhook updates
  mergedAt?: Date
  closedAt?: Date
  mergedBy?: string
  
  createdAt: Date
  updatedAt: Date
}

// Indexes
fixId: 1
projectId: 1
githubPrNumber: 1
status: 1
```

---

## API Design

### Base URL
```
http://localhost:3000/api/v1
```

### Authentication Endpoints

```
POST   /auth/register              # Register new user
POST   /auth/login                 # Login (returns JWT)
POST   /auth/refresh               # Refresh token
POST   /auth/logout                # Logout
GET    /auth/me                    # Get current user
```

### Project Endpoints

```
GET    /projects                   # List user's projects
POST   /projects/upload            # Upload ZIP file
POST   /projects/github            # Connect GitHub repo
GET    /projects/:id               # Get project details
PATCH  /projects/:id               # Update project
DELETE /projects/:id               # Delete project
```

### Scan Endpoints

```
POST   /scans                      # Start new scan
       Body: { projectId }
       
GET    /scans/:id                  # Get scan details
GET    /scans/:id/status           # Get scan status (polling)
GET    /projects/:projectId/scans  # List project scans
```

### Vulnerability Endpoints

```
GET    /vulnerabilities/:id                    # Get vulnerability details
POST   /vulnerabilities/:id/explain            # Generate AI explanation
GET    /scans/:scanId/vulnerabilities          # List scan vulnerabilities
PATCH  /vulnerabilities/:id/status             # Update status (ignore, etc.)
```

### Fix Endpoints

```
POST   /fixes                      # Initiate fix
       Body: { vulnerabilityId, projectId }
       
GET    /fixes/:id                  # Get fix details
GET    /fixes/:id/status           # Get fix status (polling)
POST   /fixes/:id/approve          # Approve and merge (future)
POST   /fixes/:id/reject           # Reject fix
GET    /projects/:projectId/fixes  # List project fixes
```

### GitHub Endpoints

```
GET    /github/app/install         # Redirect to GitHub App installation
GET    /github/app/callback        # GitHub App callback
GET    /github/repos               # List user's accessible repos (via GitHub App)
POST   /github/webhooks            # GitHub webhook receiver (PR events)
```

### API Response Format

**Success Response:**
```json
{
  "success": true,
  "data": { ... },
  "message": "Operation successful"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      {
        "field": "email",
        "message": "Must be a valid email"
      }
    ]
  }
}
```

### Error Codes

```
AUTH_REQUIRED           401
INVALID_CREDENTIALS     401
FORBIDDEN               403
NOT_FOUND               404
VALIDATION_ERROR        400
RATE_LIMIT_EXCEEDED     429
SCAN_IN_PROGRESS        409
FIX_IN_PROGRESS         409
GITHUB_API_ERROR        502
INTERNAL_ERROR          500
```

---

## Security Architecture

### Principle: Branch Isolation

**SafeStack NEVER modifies main/master/production branches directly.**

All automated changes happen in isolated branches:

```
Repository Structure:
  main (PROTECTED - never modified by SafeStack)
    ↓
  safestack/fix-{package}-{timestamp} (SafeStack working branch)
    ↓
  Pull Request (user reviews and decides)
    ↓
  main (user merges manually)
```

### Working Directory Isolation

Each project gets an isolated working directory:

```
storage/
  working/
    {userId}/
      {projectId}/
        {timestamp}/        # Isolated workspace
          .git/             # Git repository
          package.json      # Modified files
          package-lock.json
          node_modules/     # Installed deps
```

### Git Operation Safety

1. **Clone/Extract**
   - For GitHub: Clone to isolated directory
   - For uploads: Extract ZIP to isolated directory

2. **Branch Creation**
   ```bash
   git checkout -b safestack/fix-{package}-{timestamp}
   ```

3. **Changes**
   - Modify package.json
   - Run `npm install` to update lock file
   - Commit changes

4. **Testing**
   - Run tests in isolated environment
   - Parse results

5. **Push**
   - Push branch to GitHub (if GitHub project)
   - Create PR pointing to user's base branch

6. **User Decision**
   - User reviews PR
   - User decides to merge or close
   - SafeStack never auto-merges

### Security Checklist

- [ ] No direct main branch modification
- [ ] Isolated working directories per project
- [ ] JWT token authentication
- [ ] GitHub token encryption at rest
- [ ] File upload validation
- [ ] Rate limiting on API endpoints
- [ ] SQL injection prevention (parameterized queries)
- [ ] XSS protection (sanitize outputs)
- [ ] CORS properly configured
- [ ] Environment variables for secrets
- [ ] Git operations sandboxed
- [ ] User can only access their own projects
- [ ] Webhook signature verification (GitHub)

---

## Docker Isolation Strategy

### Why Docker Isolation is Critical

**Uploaded ZIP files and cloned GitHub repositories contain untrusted code.** Running `npm install` and `npm test` directly on the host system is a security risk:

- Malicious packages can access the host filesystem
- Packages can exfiltrate environment variables
- Scripts can spawn processes and network connections
- System compromise is possible

**Solution:** All untrusted code execution happens inside isolated Docker containers.

### Docker-based Test Runner Architecture

```
┌───────────────────────────────────────────────────┐
│              SafeStack Backend (Host)              │
│                                                    │
│  1. Prepare project files                         │
│  2. Create Docker container                       │
│  3. Mount project (read-only)                     │
│  4. Execute: npm install && npm test             │
│  5. Capture output                                │
│  6. Destroy container                             │
└───────────────────────────────────────────────────┘
                         │
                         ▼
┌───────────────────────────────────────────────────┐
│         Docker Container (Isolated)                │
│                                                    │
│  • No network access (optional: restricted)       │
│  • No host filesystem access                      │
│  • CPU/Memory limits enforced                     │
│  • Time limits (kill after N minutes)             │
│  • Ephemeral (destroyed after execution)          │
└───────────────────────────────────────────────────┘
```

### Test Runner Implementation

```typescript
// services/docker/dockerTestRunner.ts

interface TestRunnerConfig {
  projectPath: string;      // Host path to project
  timeout: number;          // Max execution time (ms)
  memoryLimit: string;      // e.g., '512m'
  cpuLimit: string;         // e.g., '1.0'
}

async function runTestsInDocker(config: TestRunnerConfig): Promise<TestResult> {
  const containerId = generateContainerId();
  
  try {
    // 1. Create container
    await docker.createContainer({
      Image: 'safestack-test-runner:latest',  // Pre-built Node.js image
      name: containerId,
      HostConfig: {
        Memory: parseMemoryLimit(config.memoryLimit),
        CpuQuota: parseCpuLimit(config.cpuLimit),
        NetworkMode: 'none',                   // No network access
        ReadonlyRootfs: false,                 // npm needs write access
        Binds: [
          `${config.projectPath}:/workspace:ro` // Read-only mount
        ],
        AutoRemove: true                       // Clean up automatically
      },
      WorkingDir: '/workspace',
      Cmd: ['sh', '-c', 'npm install && npm test']
    });
    
    // 2. Start container
    const container = docker.getContainer(containerId);
    await container.start();
    
    // 3. Wait for completion (with timeout)
    const result = await Promise.race([
      container.wait(),
      timeout(config.timeout)
    ]);
    
    // 4. Get logs
    const logs = await container.logs({
      stdout: true,
      stderr: true
    });
    
    // 5. Parse exit code
    const exitCode = result.StatusCode;
    
    return {
      passed: exitCode === 0,
      exitCode,
      stdout: logs.stdout,
      stderr: logs.stderr,
      duration: result.duration
    };
    
  } catch (error) {
    if (error.name === 'TimeoutError') {
      await docker.getContainer(containerId).kill();
      throw new Error('Test execution timeout');
    }
    throw error;
  } finally {
    // Container auto-removed via AutoRemove: true
  }
}
```

### Dockerfile for Test Runner

```dockerfile
# docker/Dockerfile.test-runner

FROM node:18-alpine

# Install security updates
RUN apk update && apk upgrade

# Create non-root user
RUN addgroup -S safestack && adduser -S safestack -G safestack

# Set working directory
WORKDIR /workspace

# Switch to non-root user
USER safestack

# Default command
CMD ["sh"]
```

### Security Measures

1. **Network Isolation:** `NetworkMode: 'none'` - no internet access
2. **Resource Limits:** CPU and memory caps prevent resource exhaustion
3. **Time Limits:** Kill container after timeout (e.g., 10 minutes)
4. **Read-only Mount:** Project files mounted read-only (except node_modules)
5. **Non-root User:** Container runs as unprivileged user
6. **Ephemeral Containers:** Destroyed immediately after execution
7. **No Host Access:** Cannot access host filesystem or processes

### When to Use Docker Isolation

✅ **ALWAYS use Docker for:**
- Running `npm install` on uploaded projects
- Running `npm test` on uploaded projects
- Running `npm install` on cloned GitHub repos
- Running `npm test` on cloned GitHub repos

❌ **Do NOT use Docker for:**
- npm audit (reads package.json/lock, no code execution)
- OSV API queries (external API calls)
- Git operations (simple-git on host)
- Gemini AI calls (external API)

### Alternative: If Docker is Not Available

If Docker is not available in the deployment environment, implement these fallbacks:

1. **Option A:** Disable automated testing in V1
   - Show warning: "Automated testing unavailable"
   - Allow users to create PR without test verification

2. **Option B:** VM-based isolation (more complex)
   - Use lightweight VMs (Firecracker, gVisor)
   - Similar isolation model

**For SafeStack V1, Docker is REQUIRED for production deployment.**

---

## Core Workflow

### DETECT → EXPLAIN → RECOMMEND → SAFE FIX → TEST → RESOLVE IF NEEDED → RE-TEST → CREATE PR → USER DECIDES

#### Phase 1: DETECT

**Trigger:** User initiates scan

1. User uploads ZIP or connects GitHub repo
2. Backend extracts/clones to isolated directory
3. Parse `package.json` and `package-lock.json`
4. Run **npm audit**
   ```bash
   npm audit --json
   ```
5. Query **OSV database**
   ```
   POST https://api.osv.dev/v1/query
   ```
6. Aggregate results
7. Store vulnerabilities in database
8. Return scan results to frontend

**Output:** List of vulnerabilities with severity, CVE IDs, affected packages

#### Phase 2: EXPLAIN

**Trigger:** User views vulnerability details OR automatic after scan

1. For each vulnerability, prepare prompt for Gemini AI:
   ```
   Explain this security vulnerability in simple terms for a developer:
   
   Package: {packageName}
   Current Version: {currentVersion}
   Vulnerability: {title}
   Description: {description}
   CVE: {cveId}
   Severity: {severity}
   
   Include:
   - What the vulnerability is
   - Why it's dangerous
   - Who is affected
   - Real-world impact
   
   Keep explanation beginner-friendly but technically accurate.
   ```

2. Call Gemini API
3. Store explanation in database
4. Return to frontend

**Output:** Plain-English explanation of the vulnerability

#### Phase 3: RECOMMEND

**Determine fix availability:**

1. Check if newer safe version exists
2. npm audit output includes recommended versions
3. OSV database provides fix information
4. Classify fix type:
   - **Update:** Bump to newer version (e.g., 4.1.0 → 4.2.5)
   - **Patch:** Apply patch version (e.g., 4.1.0 → 4.1.3)
   - **Replace:** Switch to alternative package (manual only)
   - **None:** No automated fix available

5. Display recommendation on frontend:
   ```
   Current: lodash@4.17.20
   Recommended: lodash@4.17.21
   Fix Type: Patch update
   Confidence: High
   ```

**Output:** Recommended target version

#### Phase 4: SAFE FIX

**Trigger:** User clicks "Fix This Vulnerability"

1. Update fix status in database: `status: 'queued'`
2. Execute fix process synchronously:

   ```typescript
   // Pseudocode - runs as Express route handler
   async function fixVulnerability(vulnerabilityId: string) {
     const vuln = await Vulnerability.findById(vulnerabilityId);
     const project = await Project.findById(vuln.projectId);
     
     // Step 1: Setup isolated workspace
     const workdir = await createIsolatedWorkspace(project);
     
     await Fix.updateOne({ _id: fixId }, { status: 'creating_branch' });
     
     // Step 2: Create SafeStack branch
     await git.checkoutNewBranch(
       `safestack/fix-${vuln.packageName}-${Date.now()}`
     );
     
     await Fix.updateOne({ _id: fixId }, { status: 'updating_deps' });
     
     // Step 3: Update dependency
     await updatePackageJson(workdir, {
       package: vuln.packageName,
       version: vuln.recommendedVersion
     });
     
     // Step 4: Install dependencies IN DOCKER
     await dockerTestRunner.runCommand(workdir, 'npm install');
     
     // Step 5: Commit changes
     await git.commit(`fix: update ${vuln.packageName} to ${vuln.recommendedVersion}`);
     
     await Fix.updateOne({ _id: fixId }, { status: 'testing' });
     
     // Step 6: Proceed to TEST phase
     return await testFix(workdir, fixId);
   }
   ```

**Output:** Modified package.json and package-lock.json in isolated branch

#### Phase 5: TEST

**Run project tests IN DOCKER:**

1. Check if test script exists in package.json
2. Run tests in isolated Docker container:
   ```typescript
   const result = await dockerTestRunner.runTestsInDocker({
     projectPath: workdir,
     timeout: 600000,      // 10 minutes
     memoryLimit: '512m',
     cpuLimit: '1.0'
   });
   ```
3. Capture output (stdout, stderr, exit code)
4. Parse results:
   - Exit code 0 = tests passed
   - Exit code non-zero = tests failed
5. Store test results in database

**Outcomes:**
- ✅ **Tests pass** → Proceed to CREATE PR
- ❌ **Tests fail** → Proceed to RESOLVE IF NEEDED
- ⚠️ **No tests** → Warn user, proceed to CREATE PR

**Output:** Test results with pass/fail status

#### Phase 6: RESOLVE IF NEEDED

**If tests fail or compatibility issues detected:**

1. Analyze test output
2. Common issues:
   - Breaking API changes
   - Deprecated methods
   - Type mismatches
   - Missing peer dependencies

3. **SafeStack limitations:**
   - SafeStack cannot fix arbitrary code bugs
   - SafeStack can attempt simple compatibility fixes:
     - Update peer dependencies
     - Install missing dependencies
     - Try alternative version (if multiple safe versions exist)

4. **Resolution strategy:**
   ```javascript
   if (testsFailed) {
     // Check for peer dependency issues
     if (hasPeerDependencyWarnings()) {
       await installPeerDependencies();
       return await reTest();
     }
     
     // Try next available safe version
     if (hasAlternativeVersion()) {
       await updateToAlternativeVersion();
       return await reTest();
     }
     
     // Cannot safely fix
     return {
       status: 'manual_fix_required',
       issues: parseTestFailures(),
       guidance: generateFixGuidance()
     };
   }
   ```

5. If resolution not possible:
   - Store clear error message
   - Provide guided remediation steps
   - Let user know manual intervention needed

**Output:** Either successful resolution or clear explanation of manual steps needed

#### Phase 7: RE-TEST

**After compatibility fix attempt:**

1. Run tests again (same as Phase 5)
2. If tests pass → Proceed to CREATE PR
3. If tests still fail → Mark as manual fix required

**Output:** Updated test results

#### Phase 8: CREATE PR

**If tests pass (or no tests exist):**

1. Push branch to GitHub:
   ```bash
   git push origin safestack/fix-{package}-{timestamp}
   ```

2. Create Pull Request via GitHub API:
   ```javascript
   await octokit.pulls.create({
     owner: project.githubOwner,
     repo: project.githubRepo,
     title: `[SafeStack] Fix ${vuln.packageName} vulnerability (${vuln.severity})`,
     head: `safestack/fix-${vuln.packageName}-${timestamp}`,
     base: project.defaultBranch, // Usually 'main'
     body: generatePRDescription(vuln, testResults)
   });
   ```

3. PR Description includes:
   ```markdown
   ## 🔒 SafeStack Security Fix
   
   **Vulnerability:** {title}
   **Severity:** {severity}
   **CVE:** {cveId}
   
   ### Changes
   - Updated `{packageName}` from `{fromVersion}` to `{toVersion}`
   
   ### Testing
   ✅ All tests passed
   
   ### AI Explanation
   {aiExplanation}
   
   ### References
   - {osvUrl}
   - {cveUrl}
   
   ---
   **⚠️ Important:** Please review these changes before merging.
   ```

4. Store PR details in database
5. Notify user (frontend + optional email)

**Output:** GitHub Pull Request URL

#### Phase 9: USER DECIDES

**User actions:**

1. **Review PR on GitHub**
   - View code changes
   - Check test results
   - Read explanation

2. **Make decision:**
   - ✅ **Merge:** User merges PR (manually on GitHub)
   - ❌ **Close:** User closes PR (not interested)
   - 💬 **Comment:** User asks questions

3. **Webhook updates** (optional):
   - GitHub sends webhook when PR is merged/closed
   - SafeStack updates vulnerability status

**Output:** User has final control over changes

---

## Technology Stack & Dependencies

### Frontend Dependencies

```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.20.0",
    "axios": "^1.6.0",
    "react-hook-form": "^7.48.0",
    "yup": "^1.3.0",
    "react-hot-toast": "^2.4.1",
    "lucide-react": "^0.294.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0",
    "@vitejs/plugin-react": "^4.2.0",
    "tailwindcss": "^3.3.0",
    "postcss": "^8.4.0",
    "autoprefixer": "^10.4.0",
    "eslint": "^8.55.0"
  }
}
```

### Backend Dependencies

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "mongoose": "^8.0.0",
    "bcrypt": "^5.1.1",
    "jsonwebtoken": "^9.0.2",
    "multer": "^1.4.5-lts.1",
    "cors": "^2.8.5",
    "helmet": "^7.1.0",
    "express-rate-limit": "^7.1.0",
    "joi": "^17.11.0",
    "winston": "^3.11.0",
    "simple-git": "^3.21.0",
    "axios": "^1.6.0",
    "@octokit/rest": "^20.0.0",
    "@octokit/app": "^14.0.0",
    "@google/generative-ai": "^0.1.0",
    "dockerode": "^4.0.0",
    "dotenv": "^16.3.0",
    "archiver": "^6.0.0",
    "unzipper": "^0.10.14"
  },
  "devDependencies": {
    "@types/express": "^4.17.0",
    "@types/bcrypt": "^5.0.0",
    "@types/jsonwebtoken": "^9.0.0",
    "@types/multer": "^1.4.0",
    "@types/node": "^20.10.0",
    "typescript": "^5.3.0",
    "ts-node": "^10.9.0",
    "nodemon": "^3.0.0",
    "jest": "^29.7.0",
    "@types/jest": "^29.5.0",
    "supertest": "^6.3.0",
    "@types/supertest": "^6.0.0",
    "eslint": "^8.55.0",
    "@typescript-eslint/parser": "^6.15.0",
    "@typescript-eslint/eslint-plugin": "^6.15.0"
  }
}
```

### External Services

1. **npm audit** (built-in)
   - No API key needed
   - Command-line tool

2. **OSV Database**
   - API: https://api.osv.dev
   - Free, no API key required
   - Rate limits: reasonable for production use

3. **Google Gemini AI**
   - API: https://generativelanguage.googleapis.com
   - Requires API key (free tier available)
   - Model: `gemini-1.5-flash` (recommended for V1)

4. **GitHub App**
   - Create GitHub App with required permissions
   - Installation tokens (short-lived, auto-expiring)
   - Webhooks for PR status updates

### Development Tools

- **Node.js:** 18+ LTS
- **npm:** 9+
- **MongoDB:** 6+
- **Docker:** 20+ (required for isolated testing)
- **Git:** 2.30+
- **TypeScript:** 5+

### Environment Variables

```bash
# Backend .env
NODE_ENV=development
PORT=3000

# Database
MONGODB_URI=mongodb://localhost:27017/safestack

# JWT
JWT_SECRET=your-super-secret-key-change-in-production
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your-refresh-secret-change-in-production
JWT_REFRESH_EXPIRES_IN=30d

# GitHub App
GITHUB_APP_ID=your-github-app-id
GITHUB_APP_PRIVATE_KEY_PATH=./github-app-private-key.pem
GITHUB_WEBHOOK_SECRET=your-webhook-secret
GITHUB_APP_CLIENT_ID=your-client-id
GITHUB_APP_CLIENT_SECRET=your-client-secret

# Gemini AI
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-1.5-flash

# File Storage
UPLOAD_DIR=./storage/uploads
WORKING_DIR=./storage/working
MAX_UPLOAD_SIZE=52428800  # 50MB

# Docker
DOCKER_TEST_IMAGE=safestack-test-runner:latest
DOCKER_TEST_TIMEOUT=600000  # 10 minutes
DOCKER_TEST_MEMORY_LIMIT=512m
DOCKER_TEST_CPU_LIMIT=1.0

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100
```

---

## Development Phases

### Phase 1: Project Setup & Core Infrastructure (Week 1-2)

**Goals:**
- Set up development environment
- Initialize frontend and backend projects with TypeScript
- Configure MongoDB
- Set up basic authentication

**Tasks:**
1. Initialize Git repository
2. Create folder structure
3. Set up MongoDB (local or MongoDB Atlas)
4. Create Mongoose models
5. Set up Express server with TypeScript
6. Configure middleware (CORS, Helmet, etc.)
7. Implement JWT authentication
8. Set up React app with Vite + TypeScript
9. Configure routing
10. Create basic layout components
11. Connect frontend to backend (Axios)

**Deliverable:** Working authentication system (register, login, logout)

---

### Phase 2: Project Management (Week 3)

**Goals:**
- Enable ZIP file uploads
- Enable GitHub App integration
- Display project list

**Tasks:**
1. Implement file upload endpoint (Multer)
2. ZIP extraction service
3. Parse package.json and package-lock.json
4. Create GitHub App (on GitHub)
5. Implement GitHub App authentication flow
6. GitHub repository installation UI
7. Clone GitHub repositories
8. Project CRUD operations
9. Project list UI
10. Project detail page

**Deliverable:** Users can upload projects or connect GitHub repos via App

---

### Phase 3: Vulnerability Scanning (Week 4-5)

**Goals:**
- Implement npm audit integration
- Integrate OSV database
- Display scan results

**Tasks:**
1. npm audit service (execute and parse)
2. OSV API integration
3. Scanner orchestration service
4. Vulnerability aggregation logic
5. Severity calculation
6. Store scan results in MongoDB
7. Scan endpoint with polling
8. Scan UI (initiate scan button)
9. Scan progress indicator (polling-based)
10. Scan results dashboard
11. Vulnerability list component
12. Filtering and sorting

**Deliverable:** Working vulnerability scanner with results display

---

### Phase 4: AI Explanations (Week 6)

**Goals:**
- Integrate Gemini AI
- Generate beginner-friendly explanations
- Display explanations in UI

**Tasks:**
1. Gemini AI service setup
2. Prompt template design
3. Explanation generation endpoint
4. Store explanations in MongoDB
5. Vulnerability detail page
6. AI explanation component
7. Loading states
8. Error handling

**Deliverable:** AI-powered vulnerability explanations

---

### Phase 5: Docker Isolation Setup (Week 7)

**Goals:**
- Build Docker test runner image
- Implement Docker container management
- Test isolation works correctly

**Tasks:**
1. Create Dockerfile for test runner
2. Build Docker image
3. Implement dockerService (dockerode)
4. Implement containerRunner
5. Test resource limits
6. Test network isolation
7. Test timeout mechanism
8. Error handling for Docker operations

**Deliverable:** Working Docker-based test execution

---

### Phase 6: Fix Recommendations (Week 8)

**Goals:**
- Determine fix availability
- Show recommended versions
- Display fix confidence

**Tasks:**
1. Parse npm audit fix recommendations
2. Query OSV for fix information
3. Version comparison logic
4. Fix classification (update/patch/replace/none)
5. Recommendation UI component
6. Version comparison display

**Deliverable:** Fix recommendations with version information

---

### Phase 7: Automated Fix Workflow (Week 9-11)

**Goals:**
- Create isolated fix branches
- Update dependencies
- Run tests in Docker
- Handle compatibility issues
- Create pull requests

**Tasks:**
1. Git operations service (simple-git)
2. Isolated workspace creation
3. Branch creation logic
4. Dependency updater service
5. package.json modification
6. Docker-based npm install
7. Docker-based test runner
8. Test output parsing
9. Compatibility checker
10. Resolution strategies
11. GitHub PR creation service (via GitHub App)
12. PR description generation
13. Fix workflow orchestration
14. Fix UI workflow
15. Fix progress tracking (polling)
16. Test results display
17. PR preview component
18. Error handling and user guidance

**Deliverable:** End-to-end automated fix workflow with PR creation

---

### Phase 8: GitHub App Integration & Webhooks (Week 12)

**Goals:**
- PR status updates via webhooks
- Webhook handling
- Merge/close notifications

**Tasks:**
1. GitHub webhook endpoint
2. Webhook signature verification
3. PR status update handlers
4. Vulnerability status automation
5. Frontend notification system
6. Activity feed

**Deliverable:** Real-time PR status updates via webhooks

---

### Phase 9: Polish & User Experience (Week 13-14)

**Goals:**
- Improve UI/UX
- Add helpful documentation
- Error message improvements
- Loading states

**Tasks:**
1. UI polish (colors, spacing, typography)
2. Responsive design
3. Loading skeletons
4. Empty states
5. Error messages with actionable guidance
6. Tooltips for technical terms
7. In-app documentation
8. User onboarding flow
9. Dashboard overview
10. Security score visualization

**Deliverable:** Polished, user-friendly interface

---

### Phase 10: Testing & Quality Assurance (Week 15)

**Goals:**
- Unit tests
- Integration tests
- Security testing

**Tasks:**
1. Backend unit tests (Jest)
2. API integration tests (Supertest)
3. Frontend component tests
4. Docker isolation tests
5. GitHub App integration tests
6. Security audit
7. Performance testing
8. Error scenario testing

**Deliverable:** Comprehensive test coverage

---

### Phase 11: Documentation & Deployment (Week 16)

**Goals:**
- Complete documentation
- Deployment preparation
- Production configuration

**Tasks:**
1. README.md
2. API documentation
3. Setup guide (including GitHub App setup)
4. User guide
5. Contributing guidelines
6. Docker configuration for production
7. Environment setup scripts
8. Deployment guide
9. Monitoring setup

**Deliverable:** Production-ready application with complete documentation

---

## Success Criteria

SafeStack Version 1 is considered complete when:

✅ Users can upload Node.js projects (ZIP) or connect GitHub repositories  
✅ Scans identify vulnerabilities using npm audit and OSV  
✅ AI generates clear, beginner-friendly explanations  
✅ System recommends safe version updates  
✅ Automated fixes run in isolated branches (never touching main)  
✅ Tests are executed and results are clearly displayed  
✅ Compatibility issues are detected and explained  
✅ Pull requests are created on GitHub  
✅ Users have full control over merging changes  
✅ Interface is simple enough for students, useful for professionals  
✅ All operations are secure and safe  

---

## Future Enhancements (Post-V1)

- Support for Python (pip), Java (Maven/Gradle), Ruby (Bundler)
- GitLab and Bitbucket integration
- Slack/Discord notifications
- Team collaboration features
- Scheduled automatic scans
- Security policy enforcement
- SBOM (Software Bill of Materials) generation
- License compliance checking
- Private package registry support
- Advanced AI-powered code migration assistance

---

## Summary

SafeStack is architecturally designed as a safe, user-friendly security platform that:

1. **Detects** vulnerabilities through industry-standard tools
2. **Explains** issues in plain language using AI
3. **Recommends** safe fix versions
4. **Safely fixes** dependencies in isolated branches
5. **Tests** changes automatically
6. **Resolves** compatibility issues when possible
7. **Creates** pull requests for user review
8. **Empowers** users with final decision-making control

**Most importantly:** SafeStack respects the principle of **never modifying production code without explicit user approval**.

---

**Architecture Status:** ✅ Ready for Implementation  
**Next Step:** Await approval to begin Phase 1 development

