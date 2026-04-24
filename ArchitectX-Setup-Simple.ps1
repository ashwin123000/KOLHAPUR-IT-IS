# ============================================================================
# ARCHITECT-X SIMPLIFIED SETUP SCRIPT
# ============================================================================

Write-Host "=======================================================================" -ForegroundColor Green
Write-Host "  ARCHITECT-X COMPLETE ENVIRONMENT SETUP" -ForegroundColor Green
Write-Host "=======================================================================" -ForegroundColor Green

$projectRoot = "c:\Users\Admin\Documents\ASHWIN\KOLHAPUR-IT-IS-main"
$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"

# Create logs directory
New-Item -ItemType Directory -Path "$projectRoot\logs" -Force | Out-Null

# ============================================================================
# PHASE 1: DOCKER INSTALLATION
# ============================================================================
Write-Host "`n[PHASE 1] Docker Installation" -ForegroundColor Yellow

if (Test-Path "$projectRoot\docker.exe") {
    Write-Host "✓ Docker installer found" -ForegroundColor Green
} else {
    Write-Host "⚠ Docker installer not found at $projectRoot\docker.exe" -ForegroundColor Yellow
}

# ============================================================================
# PHASE 2: CREATE PYTHON VIRTUAL ENVIRONMENT
# ============================================================================
Write-Host "`n[PHASE 2] Python Virtual Environment Setup" -ForegroundColor Yellow

if (-not (Test-Path "$projectRoot\venv")) {
    Write-Host "Creating virtual environment..." -ForegroundColor Cyan
    python -m venv "$projectRoot\venv"
    Write-Host "✓ Virtual environment created" -ForegroundColor Green
} else {
    Write-Host "✓ Virtual environment already exists" -ForegroundColor Green
}

# Activate virtual environment
$venvActivate = "$projectRoot\venv\Scripts\Activate.ps1"
& $venvActivate
Write-Host "✓ Virtual environment activated" -ForegroundColor Green

# ============================================================================
# PHASE 3: UPGRADE PIP
# ============================================================================
Write-Host "`n[PHASE 3] Upgrading pip" -ForegroundColor Yellow

python -m pip install --upgrade pip setuptools wheel 2>&1 | Out-Null
Write-Host "✓ pip upgraded" -ForegroundColor Green

# ============================================================================
# PHASE 4: INSTALL CORE PYTHON PACKAGES
# ============================================================================
Write-Host "`n[PHASE 4] Installing Core Python Dependencies" -ForegroundColor Yellow

$packages = @(
    "fastapi",
    "uvicorn[standard]",
    "uvloop",
    "motor",
    "pymongo",
    "python-multipart",
    "passlib[bcrypt]",
    "python-jose[cryptography]",
    "python-dotenv",
    "aioredis",
    "redis[hiredis]",
    "redisvl",
    "websockets",
    "aiohttp",
    "celery[redis]",
    "rq",
    "pytest",
    "httpx"
)

foreach ($pkg in $packages) {
    Write-Host "  Installing $pkg..." -ForegroundColor Cyan
    python -m pip install $pkg 2>&1 | Out-Null
}

Write-Host "✓ Core packages installed" -ForegroundColor Green

# ============================================================================
# PHASE 5: INSTALL ML/AI LIBRARIES
# ============================================================================
Write-Host "`n[PHASE 5] Installing ML/AI Libraries (this may take several minutes)..." -ForegroundColor Yellow

Write-Host "  Installing PyTorch (CPU)..." -ForegroundColor Cyan
python -m pip install torch torchaudio torchvision --index-url https://download.pytorch.org/whl/cpu 2>&1 | Out-Null

$mlPackages = @(
    "transformers",
    "sentence-transformers",
    "datasets",
    "scikit-learn",
    "numpy",
    "pandas",
    "langchain",
    "langgraph"
)

foreach ($pkg in $mlPackages) {
    Write-Host "  Installing $pkg..." -ForegroundColor Cyan
    python -m pip install $pkg 2>&1 | Out-Null
}

Write-Host "✓ ML/AI libraries installed" -ForegroundColor Green

# ============================================================================
# PHASE 6: CREATE DIRECTORY STRUCTURE
# ============================================================================
Write-Host "`n[PHASE 6] Creating Directory Structure" -ForegroundColor Yellow

$directories = @(
    "$projectRoot\data\jobs",
    "$projectRoot\data\resumes",
    "$projectRoot\data\onet",
    "$projectRoot\logs",
    "$projectRoot\uploads",
    "$projectRoot\models",
    "$projectRoot\backend",
    "$projectRoot\scripts"
)

foreach ($dir in $directories) {
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Path $dir -Force | Out-Null
        Write-Host "  ✓ Created $([System.IO.Path]::GetFileName($dir))" -ForegroundColor Cyan
    }
}

Write-Host "✓ Directory structure ready" -ForegroundColor Green

# ============================================================================
# PHASE 7: CREATE ENVIRONMENT FILE
# ============================================================================
Write-Host "`n[PHASE 7] Creating .env Configuration" -ForegroundColor Yellow

$envContent = @"
# ARCHITECT-X ENGINE CONFIGURATION

# Database
MONGO_URL=mongodb://admin:password@localhost:27017/architect-x?authSource=admin
MONGO_DB_NAME=architect-x
REDIS_URL=redis://localhost:6379/0
REDIS_CACHE_DB=1

# API
API_HOST=0.0.0.0
API_PORT=8000
API_DEBUG=True
ENVIRONMENT=development

# Security
SECRET_KEY=architect-x-secret-key-change-this-in-production
JWT_EXPIRATION_MINUTES=1440
ALGORITHM=HS256

# Embedding
EMBEDDING_MODEL=all-MiniLM-L6-v2
EMBEDDING_DIM=384
BATCH_SIZE=32

# Vector Search
VECTOR_INDEX_NAME=job_embeddings
TOP_K_RESULTS=10

# Background Jobs
CELERY_BROKER=redis://localhost:6379/0
CELERY_BACKEND=redis://localhost:6379/1

# Frontend
FRONTEND_URL=http://localhost:5173
FRONTEND_PORT=5173

# n8n
N8N_URL=http://localhost:5678

# Kaggle
KAGGLE_CONFIG_DIR=$env:USERPROFILE\.kaggle
"@

Set-Content -Path "$projectRoot\.env" -Value $envContent -Force
Write-Host "✓ .env file created" -ForegroundColor Green

# ============================================================================
# PHASE 8: VERIFY INSTALLATIONS
# ============================================================================
Write-Host "`n[PHASE 8] Verification" -ForegroundColor Yellow

Write-Host "`nPython Environment:" -ForegroundColor Cyan
python --version

Write-Host "`nKey Packages:" -ForegroundColor Cyan
$criticalPackages = @("fastapi", "motor", "torch", "transformers", "sentence-transformers")

foreach ($pkg in $criticalPackages) {
    $version = python -c "import importlib.metadata; print(importlib.metadata.version('$pkg'))" 2>&1
    if ($?) {
        Write-Host "  ✓ $pkg : $version" -ForegroundColor Green
    } else {
        Write-Host "  ✗ $pkg : NOT INSTALLED" -ForegroundColor Red
    }
}

# ============================================================================
# SUMMARY
# ============================================================================
Write-Host "`n=======================================================================" -ForegroundColor Green
Write-Host "  SETUP COMPLETE - NEXT STEPS" -ForegroundColor Green
Write-Host "=======================================================================" -ForegroundColor Green

Write-Host "`n1. START DOCKER SERVICES" -ForegroundColor Cyan
Write-Host "   Open PowerShell as Admin and run:"
Write-Host "   docker run -d --name mongodb -p 27017:27017 mongo:latest"
Write-Host "   docker run -d --name redis-stack -p 6379:6379 -p 8001:8001 redis/redis-stack:latest"

Write-Host "`n2. VERIFY SERVICES" -ForegroundColor Cyan
Write-Host "   mongosh mongodb://localhost:27017"
Write-Host "   http://localhost:8001  (Redis Insight UI)"

Write-Host "`n3. INITIALIZE VECTOR INDEXES" -ForegroundColor Cyan
Write-Host "   python .\scripts\init_vector_index.py"

Write-Host "`n4. SEED DATABASE" -ForegroundColor Cyan
Write-Host "   python .\scripts\seed_database.py"

Write-Host "`n5. START BACKEND" -ForegroundColor Cyan
Write-Host "   python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000"

Write-Host "`n6. START FRONTEND (in new terminal)" -ForegroundColor Cyan
Write-Host "   cd frontend"
Write-Host "   npm install"
Write-Host "   npm run dev"

Write-Host "`n7. START n8n (in new terminal)" -ForegroundColor Cyan
Write-Host "   n8n"

Write-Host "`n=======================================================================" -ForegroundColor Green
Write-Host "  ENVIRONMENT READY FOR ARCHITECT-X DEVELOPMENT" -ForegroundColor Green
Write-Host "=======================================================================" -ForegroundColor Green
