# 🚀 ARCHITECT-X: EXACT STARTUP COMMANDS

**Copy-paste these commands to start your system**

---

## ⚡ FASTEST WAY TO START (Windows)

### Terminal 1: Start Backend

```powershell
# Navigate to project
cd C:\Users\Admin\.gemini\antigravity\scratch\freelance_platform

# Activate environment
.venv\Scripts\activate

# Start backend
python -m uvicorn fastapi_backend.main:app --reload --host 0.0.0.0 --port 8000
```

### Terminal 2: Start Redis (in new PowerShell window)

```powershell
# Option A: Using Docker (EASIEST - if Docker is installed)
docker run -d --name redis-stack -p 6379:6379 -p 8001:8001 redis/redis-stack:latest

# Option B: Using native Redis (if installed)
redis-server
```

### Terminal 3: (Optional) Start Celery Worker

```powershell
cd C:\Users\Admin\.gemini\antigravity\scratch\freelance_platform
.venv\Scripts\activate
celery -A fastapi_backend.celery_config worker -l info
```

---

## ✅ VERIFY EVERYTHING IS RUNNING

### Check Backend (Terminal 1 output should show):
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete
```

### Check Redis (Terminal 2):
```
# Open another terminal, run:
redis-cli ping

# Expected output:
PONG
```

### Access APIs in Browser:
- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc
- **Health Check:** http://localhost:8000/api/health

---

## 🔧 BEFORE YOU START

Make sure you've completed setup:

```powershell
# Run ONE TIME (if you haven't already)
.\FAST_DOWNLOAD.bat
```

This will:
- ✅ Install all Python packages
- ✅ Create virtual environment
- ✅ Create .env file
- ✅ Create directories

---

## 📝 EDIT .env FILE

Before starting, add your API credentials:

```powershell
# Open .env in editor
notepad .env
```

Add these (REQUIRED):
```
OPENAI_API_KEY=sk-your-api-key-here
GITHUB_TOKEN=ghp_your-token-here  (optional)
```

Get credentials from:
- OpenAI: https://platform.openai.com/api-keys
- GitHub: https://github.com/settings/tokens

---

## 🎯 THE 3 EXACT COMMANDS YOU NEED

Copy-paste these into PowerShell:

### Command 1: Activate & Start Backend

```powershell
cd C:\Users\Admin\.gemini\antigravity\scratch\freelance_platform; .venv\Scripts\activate; python -m uvicorn fastapi_backend.main:app --reload --host 0.0.0.0 --port 8000
```

### Command 2: Start Redis (new terminal)

```powershell
docker run -d --name redis-stack -p 6379:6379 -p 8001:8001 redis/redis-stack:latest
```

### Command 3: Test Backend (new terminal)

```powershell
curl http://localhost:8000/api/health
```

Expected output:
```json
{"status":"ok"}
```

---

## 🆘 TROUBLESHOOTING

### Problem: "Port 8000 already in use"

**Solution 1:** Kill existing process
```powershell
# Find process on port 8000
Get-NetTCPConnection -LocalPort 8000

# Kill it
Stop-Process -Id <PID> -Force

# Try again
python -m uvicorn fastapi_backend.main:app --reload --port 8000
```

**Solution 2:** Use different port
```powershell
python -m uvicorn fastapi_backend.main:app --reload --port 8001
# Now access at http://localhost:8001/docs
```

---

### Problem: "aiosqlite not found"

```powershell
pip install aiosqlite
python -m uvicorn fastapi_backend.main:app --reload
```

---

### Problem: "Redis connection refused"

```powershell
# Check if Redis is running
redis-cli ping
# If error, start Redis:

# Option 1: Docker
docker run -d --name redis-stack -p 6379:6379 redis/redis-stack:latest

# Option 2: Native (if installed)
redis-server

# Then try again
python -m uvicorn fastapi_backend.main:app --reload
```

---

### Problem: "OPENAI_API_KEY not set"

```powershell
# Edit .env file
notepad .env

# Add your key:
OPENAI_API_KEY=sk-your-key-here

# Save and restart backend
```

---

### Problem: "ModuleNotFoundError: No module named 'fastapi_backend'"

```powershell
# Make sure you're in the right directory
cd C:\Users\Admin\.gemini\antigravity\scratch\freelance_platform

# And activated venv
.venv\Scripts\activate

# Then try:
python -m uvicorn fastapi_backend.main:app --reload
```

---

## 📊 WHAT HAPPENS WHEN IT STARTS

### Terminal 1 (Backend) Output:
```
INFO:     Started server process [1234]
INFO:     Waiting for application startup.
INFO:     Application startup complete
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### Then You Can:
1. Visit http://localhost:8000/docs in browser
2. See all API endpoints
3. Test endpoints directly
4. See auto-generated documentation

---

## 🎮 TEST THE API

### Via Browser:
1. Go to: http://localhost:8000/docs
2. Click "Try it out" on any endpoint
3. See live API responses

### Via PowerShell:

```powershell
# Test health check
curl http://localhost:8000/api/health

# Test with data (example)
$body = @{
    email = "test@example.com"
} | ConvertTo-Json

curl -X POST http://localhost:8000/api/auth/register `
  -Headers @{"Content-Type"="application/json"} `
  -Body $body
```

---

## 🚀 RUNNING IN PRODUCTION

Instead of `--reload`:

```powershell
# Using Uvicorn directly
python -m uvicorn fastapi_backend.main:app --host 0.0.0.0 --port 8000

# Or using Gunicorn (recommended)
gunicorn -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000 fastapi_backend.main:app
```

---

## 📚 COMPLETE SETUP FLOW

```
1. RUN ONCE:
   .\FAST_DOWNLOAD.bat

2. EDIT:
   notepad .env
   (Add OPENAI_API_KEY and GITHUB_TOKEN)

3. START TERMINAL 1 (Redis):
   docker run -d --name redis-stack -p 6379:6379 redis/redis-stack:latest

4. START TERMINAL 2 (Backend):
   cd C:\Users\Admin\.gemini\antigravity\scratch\freelance_platform
   .venv\Scripts\activate
   python -m uvicorn fastapi_backend.main:app --reload

5. VERIFY:
   curl http://localhost:8000/api/health

6. ACCESS IN BROWSER:
   http://localhost:8000/docs
```

---

## 📞 NEED HELP?

Check:
- `COMPLETE_SETUP_GUIDE.md` - Full setup instructions
- `ARCHITECT_X_MASTER_BLUEPRINT.md` - System architecture
- `ARCHITECT_X_EXECUTION_GUIDE.md` - Implementation guide

---

**You're ready to go!** 🚀
