# 🚀 FREELANCE PLATFORM - COMPLETE SERVICES & STARTUP GUIDE

**Generated:** April 21, 2026  
**Workspace:** `c:\Users\Admin\.gemini\antigravity\scratch\freelance_platform`

---

## 📋 OVERVIEW: ALL SERVICES & APPS

| Service | Type | Port | Status | Config File |
|---------|------|------|--------|-------------|
| **FastAPI Backend** | Python/FastAPI | 8000 | ✅ Active | `fastapi_backend/main.py` |
| **React Frontend** | React/Vite | 5173 | ✅ Active | `frontend/package.json` |
| **Resume Parser** | Python/FastAPI | 8001 | ✅ Standalone | `resume_parser/main.py` |
| **AI Job Analyzer** | Node.js/Express | 3000 | ✅ Standalone | `ai-job-analyzer/app.js` |
| **Redis** | Cache/Queue | 6379 | ⚙️ Optional | Docker/Native |
| **N8N Workflow Engine** | Node-based automation | 5678 | ⚙️ Optional | `workflow.json` |
| **Celery Worker** | Task Queue | - | ⚙️ Optional | `fastapi_backend/celery_config` |
| **C++ Backend** | C++/Crow | 8080 | 🔧 Alternative | `web_server.cpp` |

---

## 1️⃣ FASTAPI BACKEND

### 📍 Location
```
fastapi_backend/main.py
```

### 📦 Dependencies
```
fastapi==0.135.2
uvicorn==0.42.0
sqlalchemy==2.0.30
pydantic==2.12.5
redis==5.0.1
bcrypt==5.0.0
```

### 🎯 Start Command

**Basic (Development)**
```powershell
cd C:\Users\Admin\.gemini\antigravity\scratch\freelance_platform
.venv\Scripts\activate
python -m uvicorn fastapi_backend.main:app --reload --host 0.0.0.0 --port 8000
```

**Production (No auto-reload)**
```powershell
cd C:\Users\Admin\.gemini\antigravity\scratch\freelance_platform
.venv\Scripts\activate
python -m uvicorn fastapi_backend.main:app --host 0.0.0.0 --port 8000 --workers 4
```

**Localhost Only (Development)**
```powershell
cd C:\Users\Admin\.gemini\antigravity\scratch\freelance_platform
.venv\Scripts\activate
python -m uvicorn fastapi_backend.main:app --reload --host 127.0.0.1 --port 8000
```

### ✅ Verification
```powershell
# Health check
curl http://localhost:8000/api/health

# Swagger UI
http://localhost:8000/docs

# ReDoc
http://localhost:8000/redoc
```

### 📊 Features
- ✅ User authentication & JWT tokens
- ✅ Project management
- ✅ Freelancer applications & bidding
- ✅ Payment & escrow system
- ✅ Real-time chat (WebSocket)
- ✅ Redis caching (optional)
- ✅ Analytics & dashboards

---

## 2️⃣ REACT FRONTEND (VITE)

### 📍 Location
```
frontend/
```

### 📦 Dependencies (from package.json)
```
react==18.3.1
react-dom==18.3.1
react-router-dom==7.13.2
axios==1.13.6
vite==6.0.5
tailwindcss==4.2.2
```

### 🎯 Start Command

**Development Server**
```powershell
cd C:\Users\Admin\.gemini\antigravity\scratch\freelance_platform\frontend
npm install          # First time only
npm run dev
```

**Production Build**
```powershell
cd C:\Users\Admin\.gemini\antigravity\scratch\freelance_platform\frontend
npm install          # First time only
npm run build
npm run preview
```

### ✅ Verification
```
http://localhost:5173
```

### 🔧 Configuration
- **Vite Config:** `frontend/vite.config.js`
- **CSS:** `frontend/src/index.css` (Tailwind CSS)
- **Entry:** `frontend/src/main.jsx`

---

## 3️⃣ RESUME PARSER (Standalone FastAPI)

### 📍 Location
```
resume_parser/
```

### 📦 Dependencies
```
fastapi==0.135.2
uvicorn==0.42.0
sqlalchemy==2.0.30
pydantic==2.12.5
PyGithub==2.6.0
```

### 🎯 Start Command

**Option A: Using Batch Script (Windows)**
```powershell
cd C:\Users\Admin\.gemini\antigravity\scratch\freelance_platform\resume_parser
.\START_SERVER.bat
```

**Option B: Manual Start**
```powershell
cd C:\Users\Admin\.gemini\antigravity\scratch\freelance_platform\resume_parser
python -m venv venv          # First time only
.\venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8001
```

### ✅ Verification
```
curl http://localhost:8001/docs
http://localhost:8001/redoc
```

### 📊 Features
- ✅ Resume parsing from text/PDF
- ✅ Skill extraction
- ✅ GitHub integration
- ✅ Structured data extraction (name, email, phone, skills, education)

---

## 4️⃣ AI JOB ANALYZER (Node.js)

### 📍 Location
```
ai-job-analyzer/
```

### 📦 Files
```
ai-job-analyzer/
├── app.js          # Main server
├── index.html      # Frontend
├── style.css       # Styling
```

### 🎯 Start Command

**Development Server**
```powershell
cd C:\Users\Admin\.gemini\antigravity\scratch\freelance_platform\ai-job-analyzer
npm install          # First time only
node app.js
```

**or with npm scripts (if configured)**
```powershell
cd C:\Users\Admin\.gemini\antigravity\scratch\freelance_platform\ai-job-analyzer
npm run start
```

### ✅ Verification
```
http://localhost:3000
```

### 📊 Features
- ✅ AI job post analysis
- ✅ Resume improvement tool
- ✅ Skill matching
- ✅ Salary estimation

---

## 5️⃣ REDIS (Cache & Queue)

### 🎯 Start Command

**Option A: Docker (Recommended)**
```powershell
docker run -d --name redis-stack -p 6379:6379 -p 8001:8001 redis/redis-stack:latest
```

**Option B: Native Redis (if installed)**
```powershell
redis-server
```

### ✅ Verification
```powershell
redis-cli ping
# Expected: PONG
```

### 📊 Usage
- Used by FastAPI for caching
- Used by Celery for task queue
- Used by WebSocket connections

### 🔧 Configuration
- **Host:** localhost
- **Port:** 6379
- **UI Dashboard:** http://localhost:8001 (with Redis Stack)

---

## 6️⃣ N8N WORKFLOW ENGINE (Optional)

### 📍 Location
```
workflow.json
```

### 🎯 Start Command

**Docker (Recommended)**
```powershell
docker run -d --name n8n -p 5678:5678 \
  -e N8N_HOST=0.0.0.0 \
  n8nio/n8n:latest
```

**or with Docker Compose**
```powershell
docker-compose up -d n8n
```

### ✅ Verification
```
http://localhost:5678
```

### 📊 Workflow Components
The `workflow.json` includes:
1. **Webhook** - Resume upload endpoint
2. **File Type Check** - Validates multipart form-data
3. **Clean Text** - Text preprocessing
4. **OpenAI Parse** - GPT-4 resume parsing
5. **Parse JSON** - Structured output
6. **Send to FastAPI** - POST to `http://localhost:8000/api/resume/parsed`
7. **Respond to Webhook** - Return result to client

### 🔗 Integration
```
Resume Upload → N8N → OpenAI → FastAPI Backend → Database
```

---

## 7️⃣ CELERY WORKER (Optional Task Queue)

### 📍 Location
```
fastapi_backend/celery_config.py
```

### 📦 Dependencies
```
celery==5.x.x
redis==5.0.1
```

### 🎯 Start Command

**Start Worker**
```powershell
cd C:\Users\Admin\.gemini\antigravity\scratch\freelance_platform
.venv\Scripts\activate
celery -A fastapi_backend.celery_config worker -l info
```

**Start Flower (Task Monitor)**
```powershell
cd C:\Users\Admin\.gemini\antigravity\scratch\freelance_platform
.venv\Scripts\activate
celery -A fastapi_backend.celery_config flower
```

### ✅ Verification
```
# Flower UI
http://localhost:5555
```

### 📊 Usage
- Async task processing
- Email notifications
- Data exports
- Batch operations

---

## 8️⃣ C++ BACKEND (Alternative - Legacy)

### 📍 Location
```
web_server.cpp
main.cpp
```

### 🎯 Start Command

**Build & Run**
```powershell
cd C:\Users\Admin\.gemini\antigravity\scratch\freelance_platform
mkdir build
cd build
cmake ..
cmake --build .
.\FreelancePlatform.exe
```

**or direct compilation**
```powershell
g++ -std=c++17 web_server.cpp -o server -lws2_32 -pthread
.\server.exe
```

### ✅ Verification
```
http://localhost:8080/api/health
```

### 📊 Features (Not Recommended)
- ⚠️ Legacy alternative to FastAPI
- Use FastAPI instead (port 8000)
- Database: `freelance_market.db`

---

## 🚀 COMPLETE STARTUP SEQUENCE

### Terminal 1: Backend
```powershell
cd C:\Users\Admin\.gemini\antigravity\scratch\freelance_platform
.venv\Scripts\activate
python -m uvicorn fastapi_backend.main:app --reload --host 0.0.0.0 --port 8000
```

### Terminal 2: Frontend
```powershell
cd C:\Users\Admin\.gemini\antigravity\scratch\freelance_platform\frontend
npm run dev
```

### Terminal 3: Redis
```powershell
docker run -d --name redis-stack -p 6379:6379 redis/redis-stack:latest
```

### Terminal 4 (Optional): Resume Parser
```powershell
cd C:\Users\Admin\.gemini\antigravity\scratch\freelance_platform\resume_parser
.\START_SERVER.bat
```

### Terminal 5 (Optional): Celery Worker
```powershell
cd C:\Users\Admin\.gemini\antigravity\scratch\freelance_platform
.venv\Scripts\activate
celery -A fastapi_backend.celery_config worker -l info
```

---

## ✅ HEALTH CHECK COMMANDS

```powershell
# Backend
curl http://localhost:8000/api/health

# Frontend (Vite)
curl http://localhost:5173

# Resume Parser
curl http://localhost:8001/docs

# AI Job Analyzer
curl http://localhost:3000

# Redis
redis-cli ping

# Swagger UI
Start-Process http://localhost:8000/docs
```

---

## 📝 SETUP SCRIPTS AVAILABLE

| Script | Purpose | Run Time |
|--------|---------|----------|
| **FAST_DOWNLOAD.bat** | Install all dependencies in one command | ~20 min |
| **setup_windows.bat** | Alternative step-by-step setup | ~20 min |
| **download_everything.py** | Python-based download (cross-platform) | ~30 min |

### Run Setup (First Time Only)
```powershell
cd C:\Users\Admin\.gemini\antigravity\scratch\freelance_platform
.\FAST_DOWNLOAD.bat
```

---

## 🔧 ENVIRONMENT CONFIGURATION

### .env File (Required)
```
# Create file: C:\Users\Admin\.gemini\antigravity\scratch\freelance_platform\.env

OPENAI_API_KEY=sk-your-key-here
GITHUB_TOKEN=ghp_your-token-here
DATABASE_URL=sqlite:///freelance_market.db
REDIS_URL=redis://localhost:6379
```

### Get API Keys
- **OpenAI:** https://platform.openai.com/api-keys
- **GitHub:** https://github.com/settings/tokens

---

## 🐛 TROUBLESHOOTING

### Port Already in Use
```powershell
# Find process on port 8000
Get-NetTCPConnection -LocalPort 8000 | Select-Object -ExpandProperty OwningProcess

# Kill it
Stop-Process -Id <PID> -Force
```

### Redis Connection Failed
```powershell
# Check if Redis is running
docker ps | grep redis

# Restart Redis
docker restart redis-stack
```

### Python Virtual Environment Issues
```powershell
# Remove old venv
Remove-Item -Recurse -Force .venv

# Create new venv
python -m venv .venv

# Activate
.venv\Scripts\activate

# Reinstall
pip install -r requirements.txt
```

### Module Not Found
```powershell
# Ensure venv is activated
.venv\Scripts\activate

# Reinstall missing package
pip install -r requirements.txt

# For frontend
npm install
```

---

## 📊 SUMMARY TABLE: QUICK REFERENCE

| Service | Port | Command | Status |
|---------|------|---------|--------|
| **FastAPI** | 8000 | `uvicorn fastapi_backend.main:app --reload` | ✅ PRIMARY |
| **Frontend** | 5173 | `npm run dev` | ✅ PRIMARY |
| **Resume Parser** | 8001 | `.\START_SERVER.bat` | ⚙️ OPTIONAL |
| **AI Analyzer** | 3000 | `node app.js` | ⚙️ OPTIONAL |
| **Redis** | 6379 | `docker run redis/redis-stack` | ⚙️ OPTIONAL |
| **N8N** | 5678 | `docker run n8nio/n8n` | ⚙️ OPTIONAL |
| **Celery** | - | `celery -A fastapi_backend.celery_config worker` | ⚙️ OPTIONAL |
| **C++ Backend** | 8080 | `cmake && cmake --build . && run` | ❌ LEGACY |

---

## 🎯 RECOMMENDED STARTUP (MINIMAL)

```powershell
# Terminal 1: Backend
cd C:\Users\Admin\.gemini\antigravity\scratch\freelance_platform
.venv\Scripts\activate
python -m uvicorn fastapi_backend.main:app --reload --host 0.0.0.0 --port 8000

# Terminal 2: Frontend
cd C:\Users\Admin\.gemini\antigravity\scratch\freelance_platform\frontend
npm run dev

# Terminal 3: Redis (if using features that need it)
docker run -d --name redis-stack -p 6379:6379 redis/redis-stack:latest
```

Then access:
- **Frontend:** http://localhost:5173
- **API Docs:** http://localhost:8000/docs
- **API ReDoc:** http://localhost:8000/redoc

---

**Last Updated:** April 21, 2026  
**Created by:** Architect-X Automation System
