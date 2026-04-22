# 🎓 PROCTORED CODING ASSESSMENT PLATFORM - COMPLETE SETUP GUIDE

## 📋 OVERVIEW

This document covers the **entire setup** for the Docker-native coding assessment platform with:
- ✅ ML-powered problem suggestions (client-side only)
- ✅ Live proctoring (eye tracking + object detection)
- ✅ Automated scoring & logic explanation rounds
- ✅ Post-exam email notifications
- ✅ Complete Docker Compose orchestration

**Total Setup Time:** 60-90 minutes  
**Total Storage Needed on E: drive:** ~15 GB  
**Required:** Docker Desktop, Node.js 20+, Python 3.11+

---

## 🚀 QUICKSTART (Copy-Paste Commands)

### Terminal 1: Download Everything to E: Drive
```powershell
cd c:\Users\Admin\.gemini\antigravity\scratch\freelance_platform

# Run the download script
.\DOWNLOAD_ASSESSMENT_PLATFORM.ps1

# This will:
# - Create E:\assessment_platform structure
# - Download Python dependencies
# - Download ML models
# - Create problems dataset
# - Pull all Docker images
# - Generate configuration files
# Takes 45-60 minutes
```

### Terminal 2: Boot All Services (Once Downloaded)
```powershell
# Navigate to assessment platform
cd E:\assessment_platform

# Ensure Docker Desktop is running, then:
docker-compose up --build

# Services will be available at:
# - Admin Dashboard: http://localhost:3001
# - Candidate Exam: http://localhost:3001/exam
# - API Docs: http://localhost:3000/api-docs
# - N8N Workflows: http://localhost:5678
# - MinIO Storage: http://localhost:9001
```

### Terminal 3: Access Admin Dashboard
```powershell
# Once docker-compose is running, open browser:
# http://localhost:3001

# Login credentials (create in first setup):
# Admin: admin@example.com / password
```

---

## 📥 DETAILED SETUP INSTRUCTIONS

### STEP 1: Download to E: Drive (45-60 min)

```powershell
# Open PowerShell as Administrator
Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned

# Navigate to project root
cd c:\Users\Admin\.gemini\antigravity\scratch\freelance_platform

# Run download script (will create E:\assessment_platform)
.\DOWNLOAD_ASSESSMENT_PLATFORM.ps1
```

**What this downloads:**
- Python 3.11 venv + 20+ packages (scikit-learn, fastapi, sentence-transformers)
- ML models from HuggingFace (41 MB)
- Docker images (7.5 GB total)
  - PostgreSQL 15
  - Redis 7
  - MinIO (S3 storage)
  - n8n (workflow engine)
  - Node.js 20
  - Python 3.11
- Problems dataset (2000+ coding problems in JSON)
- Configuration files

**Output:** `E:\assessment_platform\`

---

### STEP 2: Verify E: Drive Setup

```powershell
# Check what was created
Get-ChildItem -Path "E:\assessment_platform" -Directory

# Expected output:
# Mode                 LastWriteTime         Length Name
# ----                 ---------              ------ ----
# d-----         4/21/2026  11:23 AM                docker_images
# d-----         4/21/2026  11:24 AM                python_env
# d-----         4/21/2026  11:25 AM                ml_models
# d-----         4/21/2026  11:26 AM                datasets
# d-----         4/21/2026  11:27 AM                node_modules
# d-----         4/21/2026  11:28 AM                postgres_data
# d-----         4/21/2026  11:29 AM                minio_data
```

---

### STEP 3: Bootstrap the Project Structure

Clone the GitHub repository and integrate with E: drive setup:

```powershell
# Clone the base repo
git clone https://github.com/ashwin123000/KOLHAPUR-IT-IS C:\Dev\assessment-platform
cd C:\Dev\assessment-platform

# Create essential directories
mkdir -p apps/web
mkdir -p apps/api
mkdir -p services/ml-server
mkdir -p services/vm-scheduler
mkdir -p services/mailer
mkdir -p services/logger
mkdir -p services/execution-sandbox
mkdir -p electron
mkdir -p prisma
mkdir -p n8n-workflows
mkdir -p ml-training

# Link E: drive data
New-Item -ItemType SymbolicLink -Path ".\ml_models" -Target "E:\assessment_platform\ml_models" -Force
New-Item -ItemType SymbolicLink -Path ".\datasets" -Target "E:\assessment_platform\datasets" -Force
New-Item -ItemType SymbolicLink -Path ".\docker_data" -Target "E:\assessment_platform" -Force
```

---

### STEP 4: Initialize Docker Services

```powershell
# Copy docker-compose from E: drive
Copy-Item "E:\assessment_platform\docker-compose.yml" ".\docker-compose.yml" -Force

# Ensure Docker Desktop is running (check system tray)
# If not running, search "Docker Desktop" and launch it

# Start all services
docker-compose up --build

# First run will take 10-15 minutes as images are pulled and built
# Watch for: "Application startup complete" in logs
```

**Services that will start:**
- ✅ PostgreSQL (port 5432)
- ✅ Redis (port 6379)
- ✅ MinIO (port 9000, 9001)
- ✅ FastAPI ML Server (port 8000)
- ✅ Express API (port 3000)
- ✅ Next.js Frontend (port 3001)
- ✅ N8N Workflows (port 5678)
- ✅ Mailer Service (port 3002)

---

### STEP 5: Access Services

Once all containers are running:

**Admin Dashboard:**
```
http://localhost:3001
```

**API Documentation:**
```
http://localhost:3000/api-docs
```

**N8N Workflow Engine:**
```
http://localhost:5678
```

**MinIO File Storage:**
```
http://localhost:9001
User: minioadmin
Pass: minioadmin
```

---

## 🔧 CONFIGURATION

### .env File Location
```
E:\assessment_platform\.env
```

**Required API Keys:**
```env
# OpenAI for logic evaluation
OPENAI_API_KEY=sk-...

# SendGrid for email notifications
SENDGRID_API_KEY=SG...

# Anthropic Claude (optional, for enhanced logic scoring)
ANTHROPIC_API_KEY=sk-ant-...
```

### Update API Keys

```powershell
# Edit the .env file
notepad E:\assessment_platform\.env

# Add your keys, then restart Docker:
docker-compose restart api ml-server mailer
```

---

## 📊 SYSTEM ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────────┐
│                   CANDIDATE EXAM ENVIRONMENT                     │
├─────────────────────────────────────────────────────────────────┤
│  Electron.js (Kiosk Mode)                                        │
│    ├─ Locked Browser Shell (no Alt+F4, F12, Ctrl+W)             │
│    ├─ Monaco Editor (code editor)                               │
│    ├─ Terminal Panel (Docker sandbox execution)                 │
│    ├─ Camera & Proctoring                                       │
│    │   ├─ MediaPipe FaceMesh (eye tracking)                     │
│    │   └─ TensorFlow.js COCO-SSD (object detection)             │
│    └─ Activity Logger (all events streamed to backend)          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                   ADMIN DASHBOARD (Next.js)                      │
├─────────────────────────────────────────────────────────────────┤
│  JD-Based Problem Suggestion                                     │
│    ├─ Paste Job Description                                     │
│    ├─ ML Server extracts skills & role                          │
│    └─ Returns 10-15 suggested problems                          │
│                                                                  │
│  Exam Creation                                                   │
│    ├─ Select/customize problems                                 │
│    ├─ ML suggests time limits per problem                       │
│    └─ Configure whitelist, proctoring rules                     │
│                                                                  │
│  VM Scheduling                                                   │
│    ├─ Select candidates                                         │
│    ├─ Set exam date/time                                        │
│    └─ Auto-provision VMs at T-10min                             │
│                                                                  │
│  Live Monitoring                                                 │
│    ├─ Real-time grid of candidate VMs                           │
│    ├─ Proctoring risk flags                                     │
│    └─ Force submit / emergency stop                             │
│                                                                  │
│  Results & Notifications                                         │
│    ├─ Code quality report                                       │
│    ├─ Logic explanation scores                                  │
│    └─ Mark selected/rejected → auto-email                       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                   BACKEND SERVICES                               │
├─────────────────────────────────────────────────────────────────┤
│  PostgreSQL: Exams, candidates, results, logs                   │
│  Redis: Job queue (Bull), pub/sub for real-time events          │
│  MinIO: Code snapshots, codebase ZIP files                      │
│  FastAPI ML Server: Problem suggestions, time predictions       │
│  Express API: All exam/result endpoints                         │
│  N8N: Workflow automation (analysis pipeline)                   │
│  Mailer: SendGrid + SMTP for notifications                      │
│  Docker-in-Docker: Isolated execution sandboxes                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 COMPLETE WORKFLOW EXAMPLE

### 1. Admin Creates Exam (5 min)

```
Admin Dashboard → Create Exam
└─ Paste Job Description
   ```
   Looking for a Senior Backend Engineer
   Skills: Python, Distributed Systems, PostgreSQL, Docker
   Experience: 5+ years
   ```
└─ ML Server suggests problems:
   ├─ Problem: "Design a Distributed Cache"
   ├─ Difficulty: Hard (recommended)
   ├─ Time Limit: 45 min (ML suggested, can override)
   └─ Reason: "Matches 'Distributed Systems' requirement"

└─ Admin adds 3 problems, clicks "Schedule Exam"
└─ Selects 5 candidates, sets date for tomorrow 2:00 PM
```

### 2. VMs Provisioned (Automatic, T-10 min)

```
Tomorrow 1:50 PM → VM Scheduler
└─ Provisions 5 Docker containers
   ├─ Pre-installs Electron shell
   ├─ Injects exam token + codebase
   ├─ Configures network whitelist
   └─ Health-checks each VM
└─ Admin sees: "5 VMs ready"
```

### 3. Candidate Starts Exam (2:00 PM)

```
Candidate receives email → clicks exam link
└─ VM boots, camera permission request (mandatory)
└─ Exam locks browser → can only access:
   ├─ Code editor (Monaco)
   ├─ Terminal (sandboxed)
   ├─ Whitelisted sites (w3schools.com, stackoverflow.com)
   └─ Cannot: Alt+F4, F12, right-click, copy/paste clipboard

During exam (90 min):
├─ Eyes tracked every 500ms (MediaPipe FaceMesh)
│  └─ If gaze away > 3s → logged as suspicious
├─ Every 3s: object detection (no phone, no second person)
├─ Code edits streamed in real-time
├─ All terminal runs logged
└─ Admin sees live grid:
   ```
   Candidate Name | VM Status | Gaze Away (5s) | Objects Detected | Time Left
   John Doe       | ACTIVE    | 5s             | 0                | 34:22
   Jane Smith     | ACTIVE    | 0s             | 1 (earphone)     | 31:45
   ```
```

### 4. Exam Ends (Auto-Submit)

```
Time expires → Browser locks, code auto-submitted
└─ Final code snapshot saved to MinIO
└─ All logs shipped to PostgreSQL
└─ Exam marked as "completed"
└─ N8N workflow triggered
```

### 5. N8N Analysis Pipeline

```
Workflow: exam-complete webhook received
├─ Node 1: Fetch logs & code
├─ Node 2: Analyze AI tool usage
│  └─ Count AI_TOOL_OPEN events, correlate with code changes
├─ Node 3: Submit code to code-quality API
│  └─ Return: bug count, severity, edge case coverage
├─ Node 4: Decide AI penalty level
│  └─ HIGH penalty if >5 AI uses for trivial bugs
├─ Node 5: Aggregate proctoring risk score
│  └─ Include: gaze away time, object detections, suspicious timing
├─ Node 6: Generate disclaimer message
│  └─ "You used AI [X] times for minor issues..."
└─ Node 7: POST analysis back to API
   └─ Backend stores result in exam_results table
```

### 6. Candidate Takes Logic Explanation Round

```
Candidate portal → "Your Exam Results"
├─ Shows submitted code (read-only)
├─ Claude generates 3 questions:
│  ├─ "Why did you choose this algorithm?"
│  ├─ "What's the time complexity and why?"
│  └─ "Which edge cases does your solution miss?"
│
└─ Candidate answers in free text (Hinglish/any language OK)
   ├─ Question: "Why this algorithm?"
   └─ Answer: "I chose BFS because level-by-level traversal guarantees shortest path"

└─ Backend evaluates each answer via Claude API
   └─ Scores on: conceptual correctness, depth, tradeoff awareness
   └─ Generates logicExplanationScore (0-100)
```

### 7. Admin Reviews & Notifies

```
Admin Dashboard → Results Tab
├─ Sees: Code score, Logic score, Proctoring flags
├─ AI Penalty Level: MEDIUM → −8 points
├─ Disclaimer: "You used AI 4 times for minor fixes. Your independent problem-solving..."
│
├─ Admin clicks: "Mark Selected" on John Doe
│
└─ Notification workflow triggered:
   ├─ N8N receives POST /api/results/notify
   ├─ Fetches John's email (john@company.com)
   ├─ Renders "selected" email template
   ├─ Calls Mailer service → SendGrid sends email
   │  ```
   │  Subject: 🎉 Congratulations John — You've been selected!
   │  
   │  Hi John,
   │  
   │  We're thrilled to inform you that you have been SELECTED
   │  after your coding assessment for Senior Backend Engineer.
   │  
   │  Your Performance:
   │  Overall Score: 87/100
   │  Percentile: Top 12%
   │  Logic Explanation: 92/100
   │  
   │  Next Steps:
   │  We'll reach out to john@company.com within 2 business days.
   │  
   │  [Company Name] Hiring Team
   │  ```
   │
   └─ Email delivered (tracked via SendGrid webhook)
      └─ Admin sees: "john@company.com - DELIVERED - 2:15 PM"
```

---

## 🚨 EMERGENCY COMMANDS

### Stop All Services
```powershell
docker-compose down
```

### View Logs for Specific Service
```powershell
docker-compose logs -f api          # Express API
docker-compose logs -f ml-server    # ML Server
docker-compose logs -f postgres     # Database
docker-compose logs -f redis        # Cache
```

### Access Database Shell
```powershell
docker-compose exec postgres psql -U postgres -d assessment_platform
```

### Access Redis CLI
```powershell
docker-compose exec redis redis-cli
```

### Rebuild a Single Service
```powershell
docker-compose build --no-cache api
docker-compose up -d api
```

### Check All Container Status
```powershell
docker-compose ps

# Expected output:
# NAME                    STATUS          PORTS
# assessment-postgres     Up 2 minutes    5432/tcp
# assessment-redis        Up 2 minutes    6379/tcp
# assessment-ml-server    Up 1 minute     8000/tcp
# assessment-api          Up 1 minute     3000/tcp
# assessment-web          Up 30 seconds   3001/tcp
# assessment-n8n          Up 45 seconds   5678/tcp
# assessment-mailer       Up 30 seconds   3002/tcp
```

---

## 📊 STORAGE BREAKDOWN

```
E:\assessment_platform (15.2 GB total)
├─ docker_images/ ..................... 7.5 GB
│  ├─ postgres:15-alpine .............. 84 MB
│  ├─ redis:7-alpine .................. 32 MB
│  ├─ python:3.11-slim ................ 156 MB
│  ├─ node:20-alpine .................. 186 MB
│  ├─ minio/minio:latest .............. 265 MB
│  └─ n8nio/n8n:latest ................ 847 MB
│
├─ python_env/ ........................ 1.2 GB
│  └─ site-packages/ (numpy, pandas, torch, etc.)
│
├─ ml_models/ ......................... 512 MB
│  └─ all-MiniLM-L6-v2/
│     ├─ pytorch_model.bin ............ 87 MB
│     └─ tokenizer files .............. 4 MB
│
├─ datasets/ .......................... 85 MB
│  ├─ problems_dataset.json ........... 42 MB (2000+ problems)
│  └─ training_data/ .................. 43 MB
│
├─ postgres_data/ ..................... 2.1 GB (grows with exam data)
├─ minio_data/ ........................ 3.0 GB (code snapshots)
├─ redis_data/ ........................ 512 MB (queue/cache)
└─ node_modules/ ...................... 500 MB
```

---

## ✅ VERIFICATION CHECKLIST

After `docker-compose up --build`, verify:

```powershell
# 1. All containers running
docker-compose ps | Select-String "Up"

# 2. API health check
curl http://localhost:3000/health

# 3. ML Server ready
curl http://localhost:8000/api/v1/health

# 4. Database connected
docker-compose exec postgres psql -U postgres -c "SELECT version();"

# 5. Redis responding
docker-compose exec redis redis-cli ping

# 6. MinIO accessible
curl http://localhost:9000/minio/bootstrap.html

# 7. Frontend loads
Start-Process http://localhost:3001
```

All should return success status.

---

## 📞 TROUBLESHOOTING

### "Port 3001 already in use"
```powershell
# Find what's using port 3001
netstat -ano | findstr :3001

# Kill the process (get PID from above)
taskkill /PID <PID> /F

# Restart docker-compose
docker-compose restart web
```

### "E: drive not found"
The download script has fallback logic. It will use `C:\assessment_platform` instead.
To use E: drive later, reconfigure in `.env`:
```env
DATA_ROOT=E:\assessment_platform
```

### "Out of memory"
Increase Docker Desktop memory limit:
- Docker Desktop → Settings → Resources → Memory: 8GB (minimum)

### "Build failed: npm install failed"
```powershell
# Clear npm cache and retry
docker-compose build --no-cache web

# Or manually rebuild
docker-compose down
docker-compose up --build
```

---

## 🎓 NEXT: CODE IMPLEMENTATION

Once everything is running, start building:

1. **Create `prisma/schema.prisma`** — Full database schema
2. **Implement ML routes** — `/suggest`, `/predict-time`
3. **Build admin dashboard flows** — Exam creation, VM scheduling
4. **Implement proctoring** — MediaPipe + COCO-SSD integration
5. **Set up N8N workflows** — Exam analysis + notification pipelines

---

**Total Setup Time:** 60-90 minutes  
**Status:** ✅ READY TO BUILD

