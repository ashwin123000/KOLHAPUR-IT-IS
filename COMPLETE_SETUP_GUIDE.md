# 🚀 ARCHITECT-X: COMPLETE SETUP & DOWNLOAD GUIDE

**Download Everything Needed for Production Deployment**

---

## 📋 WHAT GETS DOWNLOADED

This guide covers downloading:
- ✅ All Python dependencies (50+ packages)
- ✅ HuggingFace pre-trained models (3 models)
- ✅ Kaggle datasets (AI Job Market, Resume Dataset)
- ✅ O*NET skill taxonomy database
- ✅ Configuration files (.env template)
- ✅ Directory structure setup

---

## 🪟 WINDOWS SETUP (Recommended for You)

### Quick Start (5 minutes)

```powershell
# 1. Open PowerShell in the project directory
cd C:\Users\Admin\.gemini\antigravity\scratch\freelance_platform

# 2. Run setup script
.\setup_windows.bat
```

**That's it!** The script will:
- ✅ Create all directories
- ✅ Upgrade pip
- ✅ Install all Python packages
- ✅ Create .env file
- ✅ Verify installations

### Manual Setup (if batch file doesn't work)

```powershell
# 1. Activate virtual environment
.venv\Scripts\activate

# 2. Upgrade pip
python -m pip install --upgrade pip setuptools wheel

# 3. Install core dependencies
pip install ^
    fastapi^
    uvicorn^
    aiosqlite^
    sqlalchemy^
    pydantic^
    pydantic-settings^
    python-dotenv^
    requests^
    httpx

# 4. Install AI/ML
pip install ^
    openai^
    langchain^
    langgraph^
    transformers^
    torch^
    sentence-transformers^
    PyGithub

# 5. Install data packages
pip install pandas numpy

# 6. Install async
pip install celery redis aioredis

# 7. Install Kaggle
pip install kaggle

# 8. Verify
python -c "import fastapi; print('✓ FastAPI OK')"
python -c "import aiosqlite; print('✓ aiosqlite OK')"
python -c "import openai; print('✓ OpenAI OK')"
```

---

## 🐧 MAC/LINUX SETUP

```bash
#!/bin/bash

# 1. Activate virtual environment
source .venv/bin/activate

# 2. Upgrade pip
python -m pip install --upgrade pip setuptools wheel

# 3. Install all dependencies
pip install \
    fastapi uvicorn aiosqlite sqlalchemy pydantic pydantic-settings \
    python-dotenv requests httpx \
    openai langchain langgraph transformers torch sentence-transformers PyGithub \
    pandas numpy \
    celery redis aioredis \
    kaggle

# 4. Create directories
mkdir -p data/kaggle_jobs data/resume_dataset data/onet_database
mkdir -p models/huggingface models/ner_resume
mkdir -p logs uploads/resumes uploads/avatars
mkdir -p backups/database

# 5. Verify
python -c "import fastapi; print('✓ FastAPI OK')"
python -c "import aiosqlite; print('✓ aiosqlite OK')"
python -c "import openai; print('✓ OpenAI OK')"
```

---

## 📊 DOWNLOADING KAGGLE DATASETS

### Option 1: Automatic (Python Script)

```bash
python download_everything.py
```

### Option 2: Manual Commands

```powershell
# Step 1: Install Kaggle CLI (if not done above)
pip install kaggle

# Step 2: Configure Kaggle API
# Visit: https://www.kaggle.com/settings/account
# Click "Create New Token" (downloads kaggle.json)
# Place the file at: C:\Users\<YourUsername>\.kaggle\kaggle.json

# Step 3: Download datasets
mkdir data
cd data

# Download AI Job Market dataset (50k jobs, salary info, skill requirements)
kaggle datasets download -d waddahali/global-ai-job-market-and-agentic-surge-2025-2026 --unzip

# Download Resume Dataset (9k+ resumes for NER training)
kaggle datasets download -d saugataroyarghya/resume-dataset --unzip

# Optional: Download ML datasets
kaggle datasets download -d sujan2002/machine-learning-100-datasets --unzip

cd ..
```

---

## 🤖 DOWNLOADING HUGGINGFACE MODELS

These models are automatically downloaded when first used, but you can pre-download:

```powershell
# Activate environment
.venv\Scripts\activate

# Download Semantic Similarity Model
python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"

# Download Cross-Encoder for Re-ranking
python -c "from sentence_transformers import CrossEncoder; CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')"

# Download LayoutLM for Resume NER
python -c "from transformers import AutoTokenizer, AutoModel; AutoTokenizer.from_pretrained('microsoft/layoutlm-base-uncased'); AutoModel.from_pretrained('microsoft/layoutlm-base-uncased')"
```

---

## 📦 O*NET DATABASE (Manual)

O*NET provides skill taxonomy data. Download manually:

1. Visit: https://www.onetcenter.org/database.html
2. Download: O*NET-SOC 2010 Database
3. Extract to: `./data/onet_database/`

Files needed:
- Occupation Data CSV
- Skills CSV
- Knowledge CSV
- Job Zones

---

## 🗄️ REDIS STACK SETUP

### Option 1: Docker (Easiest - Windows/Mac/Linux)

```powershell
# Start Redis Stack container
docker run -d --name redis-stack -p 6379:6379 -p 8001:8001 redis/redis-stack:latest

# Verify it's running
redis-cli ping
# Expected: PONG
```

### Option 2: Direct Installation

**Windows (Chocolatey):**
```powershell
choco install redis-64
redis-server
```

**Mac (Homebrew):**
```bash
brew install redis
brew services start redis
redis-cli ping
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt-get update
sudo apt-get install redis-stack-server
redis-server
```

---

## ⚙️ ENVIRONMENT CONFIGURATION

### 1. Create .env File

The setup script creates `.env` automatically, but here's what it contains:

```bash
# Create .env
cat > .env << 'EOF'
# ARCHITECT-X Configuration

# API Server
HOST=0.0.0.0
PORT=8000
DEBUG=False
LOG_LEVEL=INFO

# Database
DATABASE_URL=sqlite:///./architect_x.db

# Redis
REDIS_URL=redis://localhost:6379/0

# OpenAI (REQUIRED - Get from https://platform.openai.com/api-keys)
OPENAI_API_KEY=sk-...

# GitHub (Optional - Get from https://github.com/settings/tokens)
GITHUB_TOKEN=ghp_...

# JWT
JWT_SECRET_KEY=change-this-to-random-string
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7

# Kaggle (for dataset downloads)
KAGGLE_USERNAME=your-username
KAGGLE_KEY=your-api-key
EOF
```

### 2. Add Your Credentials

Edit `.env` and add:
- **OPENAI_API_KEY**: Get from https://platform.openai.com/api-keys
- **GITHUB_TOKEN** (optional): Get from https://github.com/settings/tokens
- **KAGGLE credentials** (optional): From https://www.kaggle.com/settings/account

---

## ✅ VERIFICATION CHECKLIST

After running setup, verify everything:

```powershell
# Activate environment
.venv\Scripts\activate

# Check Python packages
python -c "import fastapi; print('✓ fastapi')"
python -c "import aiosqlite; print('✓ aiosqlite')"
python -c "import sqlalchemy; print('✓ sqlalchemy')"
python -c "import pydantic; print('✓ pydantic')"
python -c "import openai; print('✓ openai')"
python -c "import langchain; print('✓ langchain')"
python -c "import torch; print('✓ torch')"
python -c "import pandas; print('✓ pandas')"

# Check Redis
redis-cli ping
# Expected: PONG

# Check .env exists
if (Test-Path .env) { echo "✓ .env configured" }

# Check directories exist
if (Test-Path data) { echo "✓ data/ directory" }
if (Test-Path models) { echo "✓ models/ directory" }
if (Test-Path logs) { echo "✓ logs/ directory" }
```

---

## 🚀 NEXT: START THE BACKEND

Once everything is downloaded:

```powershell
# 1. Activate environment
.venv\Scripts\activate

# 2. Make sure Redis is running
docker run -d --name redis-stack -p 6379:6379 redis/redis-stack:latest

# 3. Start backend
python -m uvicorn fastapi_backend.main:app --reload --host 0.0.0.0 --port 8000
```

**Access API:**
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
- Health check: http://localhost:8000/api/health

---

## 📋 COMPLETE DEPENDENCIES LIST

### Core (Required)
- fastapi (0.135.2)
- uvicorn (0.42.0)
- aiosqlite (3.1.1)
- sqlalchemy (2.0.30)
- pydantic (2.12.5)
- pydantic-settings (2.6.1)
- python-dotenv (1.0.0)
- requests (2.32.0)
- httpx (0.27.0)

### AI/ML (Required)
- openai (1.45.0)
- langchain (0.1.20)
- langgraph (0.0.69)
- transformers (4.40.0)
- torch (2.3.0)
- sentence-transformers (3.0.1)
- PyGithub (2.6.0)

### Data (Required)
- pandas (2.2.0)
- numpy (1.26.4)

### Async (Required)
- celery (5.3.6)
- redis (5.0.0)
- aioredis (2.0.1)

### Database (Optional)
- alembic (1.13.1)
- psycopg2-binary (2.9.0) - for PostgreSQL

### Utilities
- kaggle (for dataset download)

**Total:** 40+ packages

---

## 🆘 TROUBLESHOOTING

### "aiosqlite not found"
```powershell
pip install aiosqlite
```

### "Redis connection refused"
```powershell
# Make sure Redis is running
docker run -d --name redis-stack -p 6379:6379 redis/redis-stack:latest

# Or test:
redis-cli ping
```

### "OPENAI_API_KEY not set"
```
1. Edit .env file
2. Get key from https://platform.openai.com/api-keys
3. Add: OPENAI_API_KEY=sk-...
```

### "Kaggle API not configured"
```powershell
# 1. Download kaggle.json from https://www.kaggle.com/settings/account
# 2. Place at: C:\Users\<YourUsername>\.kaggle\kaggle.json
# 3. Verify: ls ~/.kaggle/kaggle.json
```

### "Port 8000 already in use"
```powershell
# Use different port
python -m uvicorn fastapi_backend.main:app --port 8001
```

### "torch installation fails"
This is optional. Try:
```powershell
pip install torch --index-url https://download.pytorch.org/whl/cpu
```

---

## 📊 WHAT GETS CREATED

After setup, you'll have:

```
freelance_platform/
├── .venv/                          # Python virtual environment
├── .env                            # Configuration (EDIT WITH YOUR KEYS)
├── setup_windows.bat               # Windows setup script
├── download_everything.py          # Python setup script
│
├── data/
│   ├── kaggle_jobs/                # AI Job Market dataset
│   ├── resume_dataset/             # Resume examples
│   ├── ml_datasets/                # ML datasets
│   └── onet_database/              # O*NET skill taxonomy
│
├── models/
│   ├── huggingface/                # Pre-trained models
│   └── ner_resume/                 # Fine-tuned NER model
│
├── logs/                           # Application logs
├── uploads/
│   ├── resumes/                    # Uploaded resume files
│   └── avatars/                    # User avatars
│
└── backups/database/               # Database backups
```

---

## 🎯 SUMMARY

### Quick Start (Windows):
```
1. Run: .\setup_windows.bat
2. Edit .env with your credentials
3. Run: python -m uvicorn fastapi_backend.main:app --reload
4. Visit: http://localhost:8000/docs
```

### Quick Start (Mac/Linux):
```
1. Run: bash setup_linux.sh
2. Edit .env with your credentials
3. Run: python -m uvicorn fastapi_backend.main:app --reload
4. Visit: http://localhost:8000/docs
```

### Time Required:
- ⏱️ ~10-15 minutes on first run (downloads everything)
- ⏱️ ~2-3 minutes on subsequent runs

---

## 📞 NEED HELP?

Check these files:
- `ARCHITECT_X_MASTER_BLUEPRINT.md` - Complete specification
- `ARCHITECT_X_EXECUTION_GUIDE.md` - Implementation guide
- `STARTUP_GUIDE.txt` - Generated after setup
- `.env` file - Configuration reference

---

**Everything is now ready to download and run!** 🚀
