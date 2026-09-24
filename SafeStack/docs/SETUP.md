# SafeStack Phase 1 - Installation & Setup Guide

## Prerequisites

Before you begin, ensure you have the following installed on your system:

- **Node.js 18+ LTS** - [Download](https://nodejs.org/)
- **MongoDB 6+** - [Download](https://www.mongodb.com/try/download/community)
- **npm 9+** (comes with Node.js)
- **Git** (optional, for cloning)

## Step-by-Step Installation

### 1. Install MongoDB

#### Windows
1. Download MongoDB Community Server from the official website
2. Run the installer and follow the setup wizard
3. MongoDB will start automatically as a Windows service

#### macOS (with Homebrew)
```bash
brew tap mongodb/brew
brew install mongodb-community@6.0
brew services start mongodb-community@6.0
```

#### Linux (Ubuntu/Debian)
```bash
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod
```

### 2. Verify MongoDB Installation

```bash
# Check if MongoDB is running
mongosh

# You should see:
# Current Mongosh Log ID: ...
# Connecting to: mongodb://127.0.0.1:27017/

# Exit mongosh
exit
```

### 3. Navigate to Project Directory

```bash
cd C:\CybersecurityProject\SafeStack
```

### 4. Install Backend Dependencies

```bash
cd backend
npm install
```

**Expected output:**
```
added XXX packages in XXs
```

### 5. Create Backend .env File

```bash
# Copy the example environment file
cp .env.example .env

# The .env file should contain:
# (already configured in .env.example)
```

### 6. Install Frontend Dependencies

```bash
cd ../frontend
npm install
```

**Expected output:**
```
added XXX packages in XXs
```

## Running the Application

### Option 1: Two Separate Terminals

**Terminal 1 - Backend:**
```bash
cd C:\CybersecurityProject\SafeStack\backend
npm run dev
```

**Expected output:**
```
[nodemon] starting `ts-node src/server.ts`
✅ MongoDB connected successfully
📦 Database: safestack
🚀 SafeStack Backend running on port 3000
📍 Environment: development
🌐 Frontend URL: http://localhost:5173
⏰ Server started at: 2026-09-21T...
```

**Terminal 2 - Frontend:**
```bash
cd C:\CybersecurityProject\SafeStack\frontend
npm run dev
```

**Expected output:**
```
  VITE v5.0.8  ready in XXX ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h to show help
```

### Option 2: Using npm-run-all (Optional)

You can install `npm-run-all` to run both servers with one command:

```bash
# In the root directory
npm install -g npm-run-all

# Create a root package.json with scripts (see below)
npm run dev
```

## Verification Checklist

### ✅ Backend Verification

1. **Health Check API**
   ```bash
   curl http://localhost:3000/api/v1/health
   ```
   
   **Expected response:**
   ```json
   {
     "success": true,
     "message": "SafeStack API is running",
     "timestamp": "2026-09-21T...",
     "version": "1.0.0"
   }
   ```

2. **API Info**
   ```bash
   curl http://localhost:3000/api/v1
   ```
   
   **Expected response:**
   ```json
   {
     "success": true,
     "message": "SafeStack API v1",
     "endpoints": {
       "health": "/api/v1/health",
       "auth": "/api/v1/auth",
       "projects": "/api/v1/projects"
     }
   }
   ```

3. **Database Connection**
   - Check backend terminal logs for: `✅ MongoDB connected successfully`
   - No error messages in logs

### ✅ Frontend Verification

1. **Open Browser**
   - Navigate to `http://localhost:5173`
   - Landing page should load with SafeStack branding

2. **UI Elements Present**
   - ✅ SafeStack logo and navigation
   - ✅ Hero section with "Secure Your Software Supply Chain"
   - ✅ Three feature cards (Detect, Explain, Fix)
   - ✅ Green safety guarantee box
   - ✅ GitHub and Upload options
   - ✅ Footer

3. **Navigation**
   - Click "Get Started" → Should navigate to `/dashboard`
   - Click "Back to Home" → Should return to `/`
   - Navigate to `/nonexistent` → Should show 404 page

4. **Dashboard Page**
   - ✅ Two project option cards (GitHub & Upload)
   - ✅ Safety notice with shield icon
   - ✅ "Your Projects" section (empty placeholder)
   - ✅ Clicking buttons shows Phase 2 alert

### ✅ TypeScript Compilation

**Backend:**
```bash
cd backend
npm run build
```

**Expected:** No TypeScript errors, `dist/` folder created

**Frontend:**
```bash
cd frontend
npm run build
```

**Expected:** No TypeScript errors, `dist/` folder created

## Troubleshooting

### MongoDB Connection Failed

**Error:** `MongoDB connection failed`

**Solution:**
```bash
# Check if MongoDB is running
# Windows
services.msc  # Look for "MongoDB"

# macOS
brew services list

# Linux
sudo systemctl status mongod

# Start MongoDB if not running
# Windows: Start service from services.msc
# macOS: brew services start mongodb-community
# Linux: sudo systemctl start mongod
```

### Port Already in Use

**Error:** `Port 3000 is already in use`

**Solution:**
```bash
# Find and kill process using port 3000
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:3000 | xargs kill -9

# Or change port in backend/.env
PORT=3001
```

### Frontend Not Loading

**Error:** Blank page or React errors

**Solution:**
1. Check browser console (F12) for errors
2. Verify backend is running (`http://localhost:3000/api/v1/health`)
3. Check CORS configuration in backend
4. Clear browser cache and reload

### TypeScript Errors

**Error:** `Cannot find module` or type errors

**Solution:**
```bash
# Reinstall dependencies
cd backend  # or frontend
rm -rf node_modules package-lock.json
npm install
```

## Next Steps

Once Phase 1 is verified and working:

1. Test all routes (/, /dashboard, /404)
2. Verify MongoDB connection logs
3. Test API health endpoints
4. Check browser console for errors
5. **Wait for approval before Phase 2**

## Phase 1 Complete! ✅

Your SafeStack foundation is ready. The following are implemented:

- ✅ Project structure
- ✅ Backend API with Express + TypeScript
- ✅ Frontend with React + Vite + Tailwind CSS
- ✅ MongoDB connection
- ✅ User and Project models
- ✅ Landing page with SafeStack branding
- ✅ Dashboard with project selection UI
- ✅ Security middleware (CORS, Helmet, Rate Limiting)
- ✅ Error handling
- ✅ Logging

**Phase 2 Preview:**
- User authentication (register/login)
- GitHub App integration
- Project upload functionality
- Vulnerability scanning
