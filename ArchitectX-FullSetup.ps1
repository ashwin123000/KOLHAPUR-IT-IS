# ============================================================================
# ARCHITECT-X COMPLETE ENVIRONMENT SETUP
# ============================================================================
# This script automates the entire setup including:
# - Docker installation and verification
# - MongoDB and Redis containers
# - Python environment and ML/AI libraries
# - Embedding pipeline
# - Vector indexing
# - Celery background workers
# - Environment configuration
# ============================================================================

Write-Host "=== ARCHITECT-X FULL ENVIRONMENT SETUP ===" -ForegroundColor Green
Write-Host "Phase-wise Installation and Configuration" -ForegroundColor Cyan

$ErrorActionPreference = "Stop"
$projectRoot = "c:\Users\Admin\Documents\ASHWIN\KOLHAPUR-IT-IS-main"
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"

# ============================================================================
# PHASE 1: DOCKER INSTALLATION
# ============================================================================
Write-Host "`n[PHASE 1] Installing Docker Desktop..." -ForegroundColor Yellow

if (Test-Path "$projectRoot\docker.exe") {
    Write-Host "✓ Docker installer found. Installing..." -ForegroundColor Green
    & "$projectRoot\docker.exe" install --quiet --norestart 2>&1 | Tee-Object -FilePath "$projectRoot\logs\docker-install-$timestamp.log"
    Write-Host "✓ Docker installed successfully" -ForegroundColor Green
} else {
    Write-Host "⚠ Docker installer not found. Downloading..." -ForegroundColor Yellow
    curl -o "$projectRoot\docker.exe" "https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe"
    Write-Host "✓ Docker downloaded. Manual restart required before continuing." -ForegroundColor Yellow
}

# ============================================================================
# PHASE 2: VERIFY DOCKER AND DOCKER COMPOSE
# ============================================================================
Write-Host "`n[PHASE 2] Verifying Docker installation..." -ForegroundColor Yellow

$dockerCheck = docker --version 2>&1
if ($?) {
    Write-Host "✓ Docker: $dockerCheck" -ForegroundColor Green
} else {
    Write-Host "⚠ Docker not yet available in PATH. Manual restart may be needed." -ForegroundColor Yellow
}

# ============================================================================
# PHASE 3: START MONGODB CONTAINER
# ============================================================================
Write-Host "`n[PHASE 3] Starting MongoDB container..." -ForegroundColor Yellow

try {
    docker ps -a | Select-String "mongodb" | Out-Null
    if ($?) {
        write-host "✓ MongoDB container exists. Starting..." -ForegroundColor Green
        docker start mongodb 2>&1 | Out-Null
    } else {
        Write-Host "✓ Creating MongoDB container..." -ForegroundColor Green
        docker run -d `
            --name mongodb `
            -p 27017:27017 `
            -e MONGO_INITDB_ROOT_USERNAME=admin `
            -e MONGO_INITDB_ROOT_PASSWORD=password `
            -v mongodb_data:/data/db `
            mongo:latest 2>&1 | Out-Null
    }
    Start-Sleep -Seconds 2
    Write-Host "✓ MongoDB running on port 27017" -ForegroundColor Green
} catch {
    Write-Host "⚠ MongoDB Docker failed: $_" -ForegroundColor Yellow
}

# ============================================================================
# PHASE 4: START REDIS STACK CONTAINER
# ============================================================================
Write-Host "`n[PHASE 4] Starting Redis Stack container..." -ForegroundColor Yellow

try {
    docker ps -a | Select-String "redis-stack" | Out-Null
    if ($?) {
        Write-Host "✓ Redis container exists. Starting..." -ForegroundColor Green
        docker start redis-stack 2>&1 | Out-Null
    } else {
        Write-Host "✓ Creating Redis Stack container..." -ForegroundColor Green
        docker run -d `
            --name redis-stack `
            -p 6379:6379 `
            -p 8001:8001 `
            redis/redis-stack:latest 2>&1 | Out-Null
    }
    Start-Sleep -Seconds 2
    Write-Host "✓ Redis Stack running on ports 6379 (Redis) and 8001 (Insight UI)" -ForegroundColor Green
} catch {
    Write-Host "⚠ Redis Docker failed: $_" -ForegroundColor Yellow
}

# ============================================================================
# PHASE 5: CREATE PYTHON VIRTUAL ENVIRONMENT
# ============================================================================
Write-Host "`n[PHASE 5] Creating Python virtual environment..." -ForegroundColor Yellow

if (-not (Test-Path "$projectRoot\venv")) {
    python -m venv "$projectRoot\venv" 2>&1 | Tee-Object -FilePath "$projectRoot\logs\venv-creation-$timestamp.log"
    Write-Host "✓ Virtual environment created" -ForegroundColor Green
} else {
    Write-Host "✓ Virtual environment already exists" -ForegroundColor Green
}

# Activate venv
$venvActivate = "$projectRoot\venv\Scripts\Activate.ps1"
& $venvActivate

# ============================================================================
# PHASE 6: UPGRADE PIP
# ============================================================================
Write-Host "`n[PHASE 6] Upgrading pip, setuptools, wheel..." -ForegroundColor Yellow

python -m pip install --upgrade pip setuptools wheel 2>&1 | Tee-Object -FilePath "$projectRoot\logs\pip-upgrade-$timestamp.log"
Write-Host "✓ pip upgraded" -ForegroundColor Green

# ============================================================================
# PHASE 7: INSTALL CORE DEPENDENCIES
# ============================================================================
Write-Host "`n[PHASE 7] Installing FastAPI and Web Framework..." -ForegroundColor Yellow

$coreDeps = @(
    "fastapi",
    "uvicorn[standard]",
    "uvloop",
    "motor",
    "pymongo",
    "python-multipart",
    "passlib[bcrypt]",
    "python-jose[cryptography]",
    "python-dotenv"
)

foreach ($dep in $coreDeps) {
    Write-Host "  Installing $dep..." -ForegroundColor Cyan
    python -m pip install $dep 2>&1 | Out-Null
}
Write-Host "✓ Core dependencies installed" -ForegroundColor Green

# ============================================================================
# PHASE 8: INSTALL DATABASE AND CACHING LIBRARIES
# ============================================================================
Write-Host "`n[PHASE 8] Installing database and caching libraries..." -ForegroundColor Yellow

$dbDeps = @(
    "aioredis",
    "redis[hiredis]",
    "redisvl"
)

foreach ($dep in $dbDeps) {
    Write-Host "  Installing $dep..." -ForegroundColor Cyan
    python -m pip install $dep 2>&1 | Out-Null
}
Write-Host "✓ Database libraries installed" -ForegroundColor Green

# ============================================================================
# PHASE 9: INSTALL ML/AI LIBRARIES (PYTORCH + TRANSFORMERS)
# ============================================================================
Write-Host "`n[PHASE 9] Installing PyTorch and ML libraries (this may take 5-10 mins)..." -ForegroundColor Yellow

# PyTorch
Write-Host "  Installing torch & torchaudio..." -ForegroundColor Cyan
python -m pip install torch torchaudio torchvision --index-url https://download.pytorch.org/whl/cpu 2>&1 | Out-Null

# Transformers and sentence embeddings
$mlDeps = @(
    "transformers",
    "sentence-transformers",
    "datasets",
    "scikit-learn",
    "numpy",
    "pandas"
)

foreach ($dep in $mlDeps) {
    Write-Host "  Installing $dep..." -ForegroundColor Cyan
    python -m pip install $dep 2>&1 | Out-Null
}
Write-Host "✓ ML/AI libraries installed" -ForegroundColor Green

# ============================================================================
# PHASE 10: INSTALL LLM AND ORCHESTRATION LIBRARIES
# ============================================================================
Write-Host "`n[PHASE 10] Installing LangChain and AI orchestration..." -ForegroundColor Yellow

$aiDeps = @(
    "langchain",
    "langgraph",
    "websockets",
    "aiohttp"
)

foreach ($dep in $aiDeps) {
    Write-Host "  Installing $dep..." -ForegroundColor Cyan
    python -m pip install $dep 2>&1 | Out-Null
}
Write-Host "✓ AI orchestration libraries installed" -ForegroundColor Green

# ============================================================================
# PHASE 11: INSTALL BACKGROUND WORKER (CELERY)
# ============================================================================
Write-Host "`n[PHASE 11] Installing Celery for background workers..." -ForegroundColor Yellow

$celeryDeps = @(
    "celery[redis]",
    "rq",
    "rq-scheduler"
)

foreach ($dep in $celeryDeps) {
    Write-Host "  Installing $dep..." -ForegroundColor Cyan
    python -m pip install $dep 2>&1 | Out-Null
}
Write-Host "✓ Celery async workers installed" -ForegroundColor Green

# ============================================================================
# PHASE 12: INSTALL TESTING AND DEVELOPMENT TOOLS
# ============================================================================
Write-Host "`n[PHASE 12] Installing testing and dev tools..." -ForegroundColor Yellow

$devDeps = @(
    "pytest",
    "httpx",
    "black",
    "flake8",
    "mypy"
)

foreach ($dep in $devDeps) {
    Write-Host "  Installing $dep..." -ForegroundColor Cyan
    python -m pip install $dep 2>&1 | Out-Null
}
Write-Host "✓ Development tools installed" -ForegroundColor Green

# ============================================================================
# PHASE 13: CREATE DIRECTORIES STRUCTURE
# ============================================================================
Write-Host "`n[PHASE 13] Creating project directory structure..." -ForegroundColor Yellow

$dirs = @(
    "$projectRoot\data\jobs",
    "$projectRoot\data\resumes",
    "$projectRoot\data\onet",
    "$projectRoot\logs",
    "$projectRoot\uploads",
    "$projectRoot\models",
    "$projectRoot\backend",
    "$projectRoot\scripts"
)

foreach ($dir in $dirs) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "  ✓ Created $dir" -ForegroundColor Cyan
    }
}
Write-Host "✓ Directory structure created" -ForegroundColor Green

# ============================================================================
# PHASE 14: CREATE .ENV FILE
# ============================================================================
Write-Host "`n[PHASE 14] Creating .env configuration file..." -ForegroundColor Yellow

$envContent = @"
# ============================================================================
# ARCHITECT-X ENVIRONMENT VARIABLES
# ============================================================================

# ===== MONGODB =====
MONGO_URL=mongodb://admin:password@localhost:27017/architect-x?authSource=admin
MONGO_DB_NAME=architect-x

# ===== REDIS =====
REDIS_URL=redis://localhost:6379
REDIS_VECTOR_DB=0
REDIS_CACHE_DB=1

# ===== API CONFIGURATION =====
API_HOST=0.0.0.0
API_PORT=8000
API_DEBUG=True
API_WORKERS=4

# ===== SECURITY =====
SECRET_KEY=your-secret-key-change-this-in-production-$(Get-Random -Minimum 100000 -Maximum 999999)
JWT_EXPIRATION_MINUTES=1440
ALGORITHM=HS256

# ===== OPENAI / LLM KEYS =====
OPENAI_API_KEY=sk-your-key-here
ANTHROPIC_API_KEY=your-key-here

# ===== EMBEDDING CONFIGURATION =====
EMBEDDING_MODEL=all-MiniLM-L6-v2
EMBEDDING_DIM=384
BATCH_SIZE=32

# ===== VECTOR SEARCH CONFIGURATION =====
VECTOR_INDEX_NAME=job_embeddings
TOP_K_RESULTS=10

# ===== BACKGROUND WORKERS =====
CELERY_BROKER=redis://localhost:6379/0
CELERY_BACKEND=redis://localhost:6379/1
CELERY_WORKER_POOL=prefork
CELERY_WORKER_CONCURRENCY=4

# ===== UI / FRONTEND =====
FRONTEND_URL=http://localhost:5173
FRONTEND_PORT=5173

# ===== N8N AUTOMATION =====
N8N_URL=http://localhost:5678
N8N_API_KEY=your-n8n-api-key

# ===== LOGGING =====
LOG_LEVEL=INFO
LOG_FILE=$projectRoot\logs\architect-x.log

# ===== KAGGLE DATASETS =====
KAGGLE_CONFIG_DIR=$projectRoot\.kaggle
DOWNLOAD_DATASETS=true
"@

$envFile = "$projectRoot\.env"
Set-Content -Path $envFile -Value $envContent -Force
Write-Host "✓ .env file created at $envFile" -ForegroundColor Green
Write-Host "  ⚠ Please update API keys and credentials in .env file" -ForegroundColor Yellow

# ============================================================================
# VERIFICATION SUMMARY
# ============================================================================
Write-Host "`n" -ForegroundColor Green
Write-Host "=== SETUP VERIFICATION ===" -ForegroundColor Green
Write-Host ""

Write-Host "Docker Services Status:" -ForegroundColor Cyan
try {
    $dockerStatus = docker ps --format "table {{.Names}}`t{{.Status}}"
    Write-Host $dockerStatus -ForegroundColor Green
} catch {
    Write-Host "⚠ Docker not yet available" -ForegroundColor Yellow
}

Write-Host "`nPython Environment:" -ForegroundColor Cyan
python --version
Write-Host ""

Write-Host "Installed Python Packages (Critical):" -ForegroundColor Cyan
$packages = @("fastapi", "motor", "torch", "transformers", "sentence-transformers", "celery", "redis")
foreach ($pkg in $packages) {
    $version = python -c "import importlib.metadata; print(importlib.metadata.version('$pkg'))" 2>&1
    if ($?) {
        Write-Host "  ✓ $pkg : $version" -ForegroundColor Green
    } else {
        Write-Host "  ✗ $pkg : NOT FOUND" -ForegroundColor Red
    }
}

Write-Host "`n=== NEXT STEPS ===" -ForegroundColor Green
Write-Host "1. Manually verify Docker services are running:"
Write-Host "   - MongoDB: mongosh mongodb://localhost:27017"
Write-Host "   - Redis Insight: http://localhost:8001"
Write-Host ""
Write-Host "2. Download Kaggle datasets:"
Write-Host "   python .\scripts\download_datasets.py"
Write-Host ""
Write-Host "3. Create vector indexes:"
Write-Host "   python .\scripts\init_vector_index.py"
Write-Host ""
Write-Host "4. Seed database:"
Write-Host "   python .\scripts\seed_database.py"
Write-Host ""
Write-Host "5. Start backend:"
Write-Host "   python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000"
Write-Host ""
Write-Host "6. Start n8n (in separate terminal):"
Write-Host "   n8n"
Write-Host ""
Write-Host "=== SETUP COMPLETE ===" -ForegroundColor Green
