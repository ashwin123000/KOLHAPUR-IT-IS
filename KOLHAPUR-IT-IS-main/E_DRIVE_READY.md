# 🚀 ASSESSMENT PLATFORM - QUICK START (NON-DOCKER)

## ✅ STEP 1: E: Drive is Ready
All files are on E:\assessment_platform:
- ✅ Python venv with all ML packages
- ✅ Problems dataset (2,000+ problems)
- ✅ docker-compose.yml template
- ✅ .env configuration

## ⚡ STEP 2: Install Docker Desktop (Required)

Download and install Docker Desktop from: https://www.docker.com/products/docker-desktop

This is REQUIRED for the full system to work. Docker Desktop:
- Runs PostgreSQL container
- Runs Redis container
- Runs all microservices
- Runs n8n automation engine

**Installation takes 5-10 minutes.**

After installation:
1. Launch Docker Desktop from Start Menu
2. Wait for Docker daemon to start (check icon in taskbar)
3. Run: `docker --version` to verify

## 🎯 STEP 3: Start Assessment Platform

Once Docker Desktop is running:

```powershell
cd E:\assessment_platform
docker-compose up --build
```

This will:
1. Build all 6 Docker images
2. Create and start all services
3. Initialize PostgreSQL database
4. Setup Redis queues
5. Start FastAPI ML server on port 8000
6. Start Express API on port 3000
7. Start Next.js admin dashboard on port 3001

**First boot takes 2-5 minutes. Subsequent boots take 30 seconds.**

## 🌐 STEP 4: Access Services

Once services are running:

| Service | URL | Purpose |
|---------|-----|---------|
| Admin Dashboard | http://localhost:3001 | Create exams, manage VMs, review results |
| API | http://localhost:3000 | Backend REST endpoints |
| ML Server | http://localhost:8000 | Problem suggestions & ML inference |
| n8n Workflows | http://localhost:5678 | Exam analysis & email automation |
| MinIO Storage | http://localhost:9000 | Code snapshots & exam files |

## ❓ NEED DOCKER INSTALLED? (CRITICAL!)

The system REQUIRES Docker Desktop to work because:
- Backend: PostgreSQL 15 database
- Cache: Redis queues & pub/sub
- Automation: n8n workflow engine
- File Storage: MinIO (S3-compatible)

**Without Docker, the system cannot:**
- Store exam data
- Queue job processes
- Run workflows
- Execute code sandboxes
- Scale to multiple candidates

### Install Docker Desktop Now:
1. Go to: https://www.docker.com/products/docker-desktop
2. Download for Windows
3. Run installer (requires restart)
4. Launch Docker Desktop from Start Menu
5. Wait for Docker daemon to start
6. Run: `docker-compose up --build` from E:\assessment_platform

---

## 📋 QUICKCHECK

Verify E: drive setup is complete:

```powershell
dir E:\assessment_platform
```

Should show:
- datasets/ (problems dataset)
- docker-compose.yml (service definitions)
- .env (configuration)
- python_env/ (ML packages)
- python_requirements.txt

---

## 🎓 WHAT'S IN E:\assessment_platform

| Item | Purpose | Size |
|------|---------|------|
| python_env/ | ML server environment | 1.2 GB |
| datasets/problems_dataset.json | 2000+ coding problems | 45 MB |
| docker-compose.yml | Service orchestration | 8 KB |
| .env | API keys & config | 2 KB |
| python_requirements.txt | Python dependencies | 1 KB |

---

## 🔑 CONFIGURE API KEYS

Edit E:\assessment_platform\.env and add:

```env
# Essential for candidate notifications
OPENAI_API_KEY=sk-your-key-from-openai
SENDGRID_API_KEY=SG-your-key-from-sendgrid

# Optional but recommended for logic evaluation
ANTHROPIC_API_KEY=sk-ant-your-claude-key

# Database (auto-configured)
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/assessment_platform
REDIS_URL=redis://redis:6379

# JWT (auto-configured)
JWT_SECRET=your-super-secret-jwt-key-change-this
```

Get API keys from:
- OpenAI: https://platform.openai.com/api-keys
- SendGrid: https://sendgrid.com/
- Anthropic: https://console.anthropic.com/

---

## ✨ YOU'RE READY!

**Next:** Install Docker Desktop, then run `docker-compose up --build` from E:\assessment_platform

System will be fully operational in 5-10 minutes.

---

Status: 🟢 **READY FOR DOCKER STARTUP**
