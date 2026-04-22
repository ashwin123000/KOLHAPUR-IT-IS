# ⚡ ASSESSMENT PLATFORM - QUICK START CARD

Print this and keep it handy.

---

## 🚀 ONE-TIME SETUP (First Time Only)

```powershell
# Terminal 1: Download to E: Drive (45-60 min)
cd c:\Users\Admin\.gemini\antigravity\scratch\freelance_platform
.\DOWNLOAD_ASSESSMENT_PLATFORM.ps1

# Watch for: "✅ E: DRIVE SETUP COMPLETE!"
# Verify: Get-ChildItem "E:\assessment_platform" -Directory
```

---

## 🎮 EVERY DAY STARTUP

### Terminal 1: Start All Docker Services (5 min boot)
```powershell
cd E:\assessment_platform
docker-compose up --build

# Wait for: "Application startup complete"
# Services ready:
#  ✅ http://localhost:3001  (Admin Dashboard)
#  ✅ http://localhost:3000  (API)
#  ✅ http://localhost:8000  (ML Server)
#  ✅ http://localhost:5678  (N8N Workflows)
```

### Terminal 2: Monitor Logs (Optional)
```powershell
docker-compose logs -f api
# Or: docker-compose logs -f ml-server
# Or: docker-compose logs -f postgres
```

### Terminal 3: Access Services
```powershell
# Open in browser:
start http://localhost:3001                    # Admin Dashboard
start http://localhost:3000/api-docs           # API Documentation
start http://localhost:5678                    # N8N Workflows
start http://localhost:9001                    # MinIO Storage
```

---

## 📋 CRITICAL PATHS

### Admin Dashboard
```
http://localhost:3001

Flows:
├─ Create Exam
│  ├─ Paste Job Description
│  ├─ ML suggests problems
│  ├─ Set time limits
│  └─ Save exam
├─ Schedule VMs
│  ├─ Select candidates
│  ├─ Pick date/time
│  └─ Auto-provision
├─ Monitor (Live)
│  ├─ See all VMs
│  ├─ Watch proctoring flags
│  └─ Force submit if needed
└─ Results
   ├─ View scores
   ├─ Read code quality report
   └─ Mark selected → auto-email
```

### Candidate Exam
```
http://localhost:3001/exam/[examId]

Experience:
├─ Electron kiosk locks browser
├─ Monaco editor + terminal
├─ Live camera + proctoring
├─ 90 min countdown timer
└─ Auto-submit on time expiry
```

### Post-Test Logic Round
```
http://localhost:3001/explain/[examId]

Process:
├─ View submitted code (read-only)
├─ Answer Claude-generated questions
├─ Free-text answers (any language OK)
└─ System scores logic depth
```

---

## 🔌 SERVICE STATUS

```powershell
# Check all services running
docker-compose ps

# Expected output (all "Up"):
# assessment-postgres    Up 5 minutes
# assessment-redis       Up 5 minutes
# assessment-ml-server   Up 4 minutes
# assessment-api         Up 4 minutes
# assessment-web         Up 3 minutes
# assessment-n8n         Up 2 minutes
# assessment-mailer      Up 2 minutes
```

---

## 🛑 STOP & CLEANUP

```powershell
# Stop all services
docker-compose down

# Stop and remove volumes (CAUTION: deletes data)
docker-compose down -v

# View storage used
docker system df
```

---

## 🚨 EMERGENCY COMMANDS

```powershell
# View logs for specific service
docker-compose logs -f api

# Access database
docker-compose exec postgres psql -U postgres -d assessment_platform

# Access Redis
docker-compose exec redis redis-cli

# Check port usage
netstat -ano | findstr :3001

# Kill stuck process
taskkill /PID <PID> /F
```

---

## 🔑 CREDENTIALS & KEYS

**File:** `E:\assessment_platform\.env`

Add these before first run:
```
OPENAI_API_KEY=sk-...                    # From platform.openai.com
SENDGRID_API_KEY=SG...                   # From sendgrid.com
ANTHROPIC_API_KEY=sk-ant-...             # Optional
```

---

## 📊 COMPONENTS CHECKLIST

- [x] E: drive data downloaded
- [x] Python environment (1.2 GB)
- [x] ML models + datasets (600 MB)
- [x] Docker images (7.5 GB)
- [x] Configuration files
- [ ] API keys added to .env
- [ ] docker-compose up running
- [ ] All services healthy
- [ ] Admin dashboard accessible
- [ ] First exam created
- [ ] Candidates scheduled

---

## 📞 QUICK REFERENCE

| Need | Command |
|------|---------|
| Admin Dashboard | `http://localhost:3001` |
| API Docs | `http://localhost:3000/api-docs` |
| Database Shell | `docker-compose exec postgres psql -U postgres` |
| Redis Console | `docker-compose exec redis redis-cli` |
| View ML Models | `E:\assessment_platform\ml_models` |
| View Datasets | `E:\assessment_platform\datasets` |
| View Logs | `docker-compose logs -f api` |
| Stop All | `docker-compose down` |
| Full Rebuild | `docker-compose down && docker-compose up --build` |
| Storage Used | `docker system df` |

---

## 🎯 WHAT TO BUILD NEXT

After setup complete:

1. **Database Schema** → `prisma/schema.prisma`
2. **ML Suggestion Routes** → `/api/v1/problems/suggest`
3. **Exam CRUD** → `/api/v1/exams`
4. **VM Scheduler** → Bull queue jobs
5. **Admin Dashboard** → Next.js flows
6. **Proctoring System** → MediaPipe integration
7. **N8N Workflows** → Analysis + notification
8. **Electron Shell** → Kiosk mode locking

---

**✅ Status: Ready to Build**  
**📍 Location: E:\assessment_platform**  
**💾 Storage: ~15 GB**  
**⏱️ Boot Time: 5-10 minutes**

