# ⚡ QUICK START CHEAT SHEET

## 🟢 SYSTEM A: FREELANCE PLATFORM (READY NOW)

**Backend is ALREADY running on http://127.0.0.1:8000** ✅

### Start Frontend (New Terminal)
```powershell
cd C:\Users\Admin\.gemini\antigravity\scratch\freelance_platform\frontend
npm run dev
```

Then open: **http://localhost:5173**

---

## 🟡 SYSTEM B: ASSESSMENT PLATFORM (REQUIRES DOCKER)

### Step 1: Install Docker Desktop
```
https://www.docker.com/products/docker-desktop
→ Download → Install → Restart → Launch
```

### Step 2: Deploy (New Terminal)
```powershell
cd E:\assessment_platform
docker-compose up --build
```

Then open: **http://localhost:3001**

---

## 📋 WHAT EACH DOES

| System | Purpose | Status |
|--------|---------|--------|
| **A** | Freelance marketplace | 🟢 Running |
| **B** | Coding exams + proctoring | 🟡 Ready |

---

## 🔗 URLS WHEN RUNNING

```
Freelance Backend:     http://127.0.0.1:8000
Freelance Frontend:    http://localhost:5173

Assessment API:        http://localhost:3000
Assessment Dashboard:  http://localhost:3001
Assessment ML Server:  http://localhost:8000
Assessment n8n:        http://localhost:5678
```

---

## 💡 PICK ONE NOW

**Just want to see something work?**
→ Start freelance frontend (1 command, 2 minutes)

**Want the full platform?**
→ Install Docker, deploy assessment system (15 minutes)

**Want both?**
→ Run freelance frontend in one terminal + Docker in another

---

## 📂 KEY FILES

**Freelance Platform:**
- Backend code: `fastapi_backend/main.py`
- Frontend: `frontend/src/main.jsx`
- Database: `fastapi_backend/freelance_market.db`

**Assessment Platform:**
- All files: `E:\assessment_platform/`
- Config: `E:\assessment_platform/.env`
- Services: `E:\assessment_platform/docker-compose.yml`

---

## 🆘 ONE THING NOT WORKING?

**Backend on 8000 not responding?**
```powershell
taskkill /F /IM python.exe
.venv\Scripts\python.exe -m uvicorn fastapi_backend.main:app --host 127.0.0.1 --port 8000
```

**Frontend won't start?**
```powershell
cd frontend
npm install
npm run dev
```

**Docker not found?**
```
Download: https://www.docker.com/products/docker-desktop
```

**Port already in use?**
```powershell
Get-NetTCPConnection -LocalPort 8000 | Stop-Process -Force
```

---

**STATUS: ✅ READY TO GO**

Pick a system above and run one command.

