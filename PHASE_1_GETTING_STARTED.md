# 🚀 AI HIRING OS — Phase 1: Foundation (Getting Started)

**Status**: ✅ **READY FOR EXECUTION**

**Estimated Time**: ~1 hour  
**Difficulty**: Easy  
**Prerequisites**: PostgreSQL, Python 3.11+

---

## 📋 Checklist

Complete these steps in order:

### **STEP 1: Install PostgreSQL** (5-10 min)

If you haven't installed PostgreSQL yet:

#### **Option A: Windows Installer (Recommended)**
1. Download from: https://www.postgresql.org/download/windows/
2. Run the installer
3. **Important**: Remember the password you set for the `postgres` superuser
4. Choose default port: **5432**
5. Verify installation:
   ```powershell
   psql --version
   ```

#### **Option B: Chocolatey (If you have it)**
```powershell
choco install postgresql14
```

#### **Option C: WSL2 + Linux**
```bash
sudo apt update && sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

---

### **STEP 2: Run PostgreSQL Setup Script** (2 min)

This script creates the database, user, and schema automatically:

```powershell
cd c:\Users\Admin\Documents\ASHWIN\KOLHAPUR-IT-IS-main

# Run the setup script (from PowerShell as Administrator)
.\setup_postgres.ps1

# Default password will be: secure-password-123
# You can change it: .\setup_postgres.ps1 -PostgresPassword "your-password"
```

**What the script does:**
- ✅ Creates `hiring_os` database
- ✅ Creates `hiring_user` role
- ✅ Enables `pgvector` extension
- ✅ Sets up proper permissions
- ✅ Tests the connection
- ✅ Prints your DATABASE_URL

---

### **STEP 3: Create .env File** (2 min)

```bash
cd backend

# Copy the template
cp .env.example .env

# Edit .env with your actual values:
```

**Edit these values in .env:**

```bash
# PostgreSQL (get this from script output)
DATABASE_URL=postgresql://hiring_user:secure-password-123@localhost:5432/hiring_os

# Generate a random JWT secret
# Run: openssl rand -hex 32  (or use PowerShell: [System.Random]::new().Next().ToString('X32'))
JWT_SECRET=your-32-char-random-string-here

# Get from https://console.anthropic.com/
ANTHROPIC_API_KEY=sk-ant-...

# Leave the rest as defaults
```

---

### **STEP 4: Verify Setup** (3 min)

```powershell
cd backend

# Test 1: Can we import config?
python -c "from config import settings; print('✅ Config OK'); print(f'Environment: {settings.ENVIRONMENT}')"

# Test 2: Can we connect to database?
python -c "from database_new import engine; print('✅ Database connection OK')"

# Test 3: Can we import all models?
python -c "from models.user_new import User; from models.resume import Resume; print('✅ All models OK')"

# Test 4: Can we verify auth?
python -c "from auth.jwt_handler import create_access_token; print('✅ JWT auth OK')"
```

**Expected output:**
```
✅ Config OK
Environment: development
✅ Database connection OK
✅ All models OK
✅ JWT auth OK
```

---

### **STEP 5: Start the Backend** (1 min)

```powershell
cd backend

# Option A: Development mode (with auto-reload)
python main_new.py

# Option B: Using uvicorn directly
uvicorn main_new:app --reload --host 0.0.0.0 --port 8000
```

**Expected output:**
```
======================================================================
🚀 AI HIRING OS — Starting up (Master Prompt V2.0)
======================================================================
Environment: development
Database: postgresql://...
Initializing PostgreSQL database...
✅ Database initialized
...
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Press CTRL+C to quit
```

---

### **STEP 6: Test the API** (5 min)

Open a new PowerShell terminal and test the endpoints:

#### **Health Check**
```powershell
curl http://localhost:8000/health
```

Expected response:
```json
{
  "status": "ok",
  "service": "AI Hiring OS",
  "version": "2.0.0",
  "environment": "development"
}
```

#### **API Docs**
Open browser: http://localhost:8000/api/docs

This is Swagger UI where you can test all endpoints interactively.

#### **Register a New User**
```powershell
curl -X POST http://localhost:8000/auth/register `
  -H "Content-Type: application/json" `
  -d '{"email":"test@example.com","password":"testpass123","full_name":"Test User"}'
```

Expected response:
```json
{
  "message": "Account created successfully",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "test@example.com",
    "full_name": "Test User",
    "role": "candidate",
    "is_verified": false,
    "created_at": "2024-04-23T10:30:00"
  },
  "access_token": "eyJhbGciOiJIUzI1NiIs..."
}
```

#### **Login**
```powershell
$response = curl -X POST http://localhost:8000/auth/login `
  -H "Content-Type: application/json" `
  -d '{"email":"test@example.com","password":"testpass123"}'

# Save the access_token from response
```

#### **Get Current User Profile**
```powershell
$token = "YOUR_ACCESS_TOKEN_HERE"

curl -X GET http://localhost:8000/auth/me `
  -H "Authorization: Bearer $token"
```

---

## 🗄️ Database Structure

After setup, you should have these tables:

```sql
-- View all tables:
psql -U hiring_user -d hiring_os -h localhost -c "\dt"
```

Expected tables:
- `users` — User accounts
- `resumes` — Parsed resume data
- `jobs` — Job listings
- `applications` — Job applications
- `vm_sessions` — Coding test sessions
- `vm_events` — Anti-cheat events
- `chat_messages` — Conversation history

---

## 🐛 Troubleshooting

### **PostgreSQL not found in PATH**
```powershell
# Add PostgreSQL bin directory to PATH manually:
# 1. Open System Properties → Environment Variables
# 2. Add: C:\Program Files\PostgreSQL\15\bin
# 3. Restart PowerShell
```

### **Connection refused on localhost:5432**
```powershell
# Check if PostgreSQL is running:
Get-Service -Name postgresql-x64-15  # Replace 15 with your version

# Start PostgreSQL if stopped:
Start-Service -Name postgresql-x64-15

# Or use Windows Services (services.msc) to start it manually
```

### **"hiring_user" password authentication failed**
```powershell
# Reset the password:
psql -U postgres -c "ALTER USER hiring_user PASSWORD 'new-password';"

# Update .env with new password:
# DATABASE_URL=postgresql://hiring_user:new-password@localhost:5432/hiring_os
```

### **pgvector extension not found**
```powershell
# The setup script should handle this, but if it fails:
psql -U postgres -d hiring_os -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

### **Port 8000 already in use**
```powershell
# Run on a different port:
uvicorn main_new:app --port 8001

# Or find and kill the process using port 8000:
netstat -ano | findstr :8000
taskkill /PID {pid} /F
```

---

## 📝 Files Created/Modified

| File | Status | Purpose |
|------|--------|---------|
| `config.py` | ✅ NEW | Pydantic settings (30+ env vars) |
| `database_new.py` | ✅ NEW | SQLAlchemy + PostgreSQL setup |
| `models/user_new.py` | ✅ NEW | User ORM model |
| `models/resume.py` | ✅ NEW | Resume ORM model |
| `models/job_new.py` | ✅ NEW | Job ORM model |
| `models/application.py` | ✅ NEW | Application ORM model |
| `models/vm_session.py` | ✅ NEW | VM session + event models |
| `models/chat_message.py` | ✅ NEW | Chat message ORM model |
| `auth/jwt_handler.py` | ✅ NEW | JWT token operations |
| `auth/dependencies.py` | ✅ NEW | FastAPI dependency injection |
| `schemas/auth.py` | ✅ NEW | Request/response schemas |
| `utils/password.py` | ✅ NEW | Bcrypt password hashing |
| `routes/auth_new.py` | ✅ NEW | Auth endpoints (5 endpoints) |
| `main_new.py` | ✅ NEW | FastAPI app entry point |
| `.env.example` | ✅ UPDATED | Environment variables template |
| `requirements.txt` | ✅ UPDATED | All dependencies (40+) |
| `setup_postgres.ps1` | ✅ NEW | PostgreSQL setup script |

---

## 🎯 What's Next (After Phase 1)

Once auth is working:

### **Phase 2: Resume Parsing** (2-3 days)
- PDF upload endpoint
- pdfplumber + OCR extraction
- Claude LLM structuring
- Background job processing

### **Phase 3: Job Matching** (1-2 days)
- Job application system
- Weighted skill matching algorithm
- Match score calculation
- Gap analysis

### **Phase 4: Chatbot** (1 day)
- Context-aware chat
- Tool calling (get_live_jobs, get_salary_benchmark, get_skill_demand)
- Interview prep conversations

### **Phase 5: VM Tests** (3-4 days)
- Docker container lifecycle
- Real-time WebSocket communication
- Anti-cheat event tracking
- Code execution + grading

### **Phase 6: Data Integration** (2-3 days)
- Adzuna API integration
- Kaggle CSV ingestion
- Knowledge graph building
- Enhanced chatbot with live data

---

## 📞 Need Help?

1. **Database connection issues**: Check PostgreSQL is running (`net start postgresql-x64-15`)
2. **Import errors**: Verify all dependencies installed (`pip list | grep -E "sqlalchemy|pydantic"`)
3. **Port conflicts**: Find what's using port 8000 (`netstat -ano | findstr :8000`)
4. **JWT issues**: Verify JWT_SECRET is set in .env and is at least 32 characters

---

## ✅ Phase 1 Complete When:

- [ ] PostgreSQL is installed and running
- [ ] `setup_postgres.ps1` runs without errors
- [ ] `.env` file exists with real values
- [ ] `python -c "from config import settings"` works
- [ ] `python main_new.py` starts without errors
- [ ] Health check returns `{"status": "ok"}`
- [ ] Can register, login, and get user profile via API

**Estimated Time to Phase 1 Complete**: **1 hour**

---

**Ready? Let's build! 🚀**
