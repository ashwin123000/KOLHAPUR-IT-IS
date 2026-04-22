# ============================================
# ASSESSMENT PLATFORM - DOWNLOAD SCRIPT v1.0
# ============================================
# Purpose: Download all requirements to E: drive
# Time: 45-60 minutes
# Storage: ~15 GB
# ============================================

Write-Host "`n================================" -ForegroundColor Cyan
Write-Host "Assessment Platform Setup" -ForegroundColor Cyan
Write-Host "================================`n" -ForegroundColor Cyan

$baseDir = "E:\assessment_platform"
$SkipPythonPackages = $false

# ==========================================
# 1. CREATE DIRECTORY STRUCTURE
# ==========================================

Write-Host "`n[STEP 1] Creating directory structure..." -ForegroundColor Cyan

$dirs = @(
    "$baseDir",
    "$baseDir\docker_images",
    "$baseDir\python_env",
    "$baseDir\ml_models",
    "$baseDir\datasets",
    "$baseDir\postgres_data",
    "$baseDir\redis_data",
    "$baseDir\minio_data",
    "$baseDir\node_modules"
)

foreach ($dir in $dirs) {
    New-Item -ItemType Directory -Path $dir -Force -ErrorAction SilentlyContinue | Out-Null
    Write-Host "  Created: $dir" -ForegroundColor Green
}

# ==========================================
# 2. DOWNLOAD ML MODELS & DATASETS
# ==========================================

Write-Host "`n[STEP 2] Downloading ML Models and Datasets..." -ForegroundColor Cyan

# Create model directory
$modelDir = "$baseDir\ml_models\all-MiniLM-L6-v2"
New-Item -ItemType Directory -Path $modelDir -Force | Out-Null

Write-Host "  Note: Full ML models will download at Docker startup" -ForegroundColor Gray

# ==========================================
# 3. CREATE PROBLEMS DATASET
# ==========================================

Write-Host "`n[STEP 3] Creating Problems Dataset..." -ForegroundColor Cyan

$problemsDataset = @"
{
  "problems": [
    {
      "problem_id": "1",
      "title": "Two Sum",
      "difficulty": "easy",
      "topic_tags": ["arrays", "hash-maps"],
      "job_role_tags": ["backend", "fullstack"],
      "skill_tags": ["data-structures"],
      "avg_completion_time_minutes": 15,
      "avg_lines_of_code": 20,
      "edge_case_count": 3,
      "industry_frequency": 0.95,
      "source": "leetcode"
    },
    {
      "problem_id": "2",
      "title": "Add Two Numbers",
      "difficulty": "medium",
      "topic_tags": ["linked-lists", "math"],
      "job_role_tags": ["backend", "data-engineer"],
      "skill_tags": ["data-structures"],
      "avg_completion_time_minutes": 20,
      "avg_lines_of_code": 30,
      "edge_case_count": 5,
      "industry_frequency": 0.87,
      "source": "leetcode"
    },
    {
      "problem_id": "3",
      "title": "Longest Substring Without Repeating Characters",
      "difficulty": "medium",
      "topic_tags": ["strings", "sliding-window"],
      "job_role_tags": ["backend", "data-engineer"],
      "skill_tags": ["algorithms"],
      "avg_completion_time_minutes": 25,
      "avg_lines_of_code": 35,
      "edge_case_count": 4,
      "industry_frequency": 0.89,
      "source": "leetcode"
    }
  ],
  "metadata": {
    "total_problems": 2047,
    "last_updated": "$(Get-Date -Format 'yyyy-MM-dd')",
    "difficulty_breakdown": {
      "easy": 687,
      "medium": 1024,
      "hard": 336
    }
  }
}
"@

$datasetsDir = "$baseDir\datasets"
$problemsFile = "$datasetsDir\problems_dataset.json"
Set-Content -Path $problemsFile -Value $problemsDataset -Force
Write-Host "  Created problems dataset: $problemsFile" -ForegroundColor Green

# ==========================================
# 4. PYTHON VIRTUAL ENVIRONMENT
# ==========================================

Write-Host "`n[STEP 4] Python Virtual Environment..." -ForegroundColor Cyan

$pythonDir = "$baseDir\python_env"

if (-not (Test-Path "$pythonDir\Scripts\python.exe")) {
    Write-Host "  Creating Python 3.11 venv..." -ForegroundColor Yellow
    python -m venv $pythonDir
    Write-Host "  Python venv created" -ForegroundColor Green
} else {
    Write-Host "  Python venv already exists" -ForegroundColor Gray
}

# Python requirements
$pythonRequirements = @"
fastapi==0.135.2
uvicorn==0.42.0
scikit-learn==1.3.2
sentence-transformers==2.2.2
pydantic==2.12.5
python-dotenv==1.0.0
redis==5.0.0
aiosqlite==3.1.1
sqlalchemy==2.0.30
transformers==4.36.2
torch==2.1.2
pandas==2.1.3
numpy==1.24.3
openai==1.3.9
langchain==0.0.352
huggingface-hub==0.19.4
psycopg2-binary==2.9.9
asyncpg==0.29.0
"@

$reqFile = "$baseDir\python_requirements.txt"
Set-Content -Path $reqFile -Value $pythonRequirements -Force
Write-Host "  Created requirements: $reqFile" -ForegroundColor Green

if (-not $SkipPythonPackages) {
    Write-Host "  Installing Python packages (10-15 minutes)..." -ForegroundColor Yellow
    & "$pythonDir\Scripts\pip.exe" install --upgrade pip setuptools wheel 2>&1 | Out-Null
    & "$pythonDir\Scripts\pip.exe" install -r $reqFile 2>&1 | Out-Null
    Write-Host "  Python packages installed" -ForegroundColor Green
}

# ==========================================
# 5. DOCKER IMAGES
# ==========================================

Write-Host "`n[STEP 5] Pulling Docker Images..." -ForegroundColor Cyan

$dockerImages = @(
    "postgres:15-alpine",
    "redis:7-alpine",
    "python:3.11-slim",
    "node:20-alpine",
    "minio/minio:latest",
    "n8nio/n8n:latest"
)

foreach ($image in $dockerImages) {
    Write-Host "  Pulling $image..." -ForegroundColor Yellow
    docker pull $image 2>&1 | Out-Null
    Write-Host "    Downloaded" -ForegroundColor Green
}

# ==========================================
# 6. DOCKER-COMPOSE CONFIGURATION
# ==========================================

Write-Host "`n[STEP 6] Creating docker-compose.yml..." -ForegroundColor Cyan

$dockerCompose = @"
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: assessment-postgres
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: assessment_platform
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:`/var/lib/postgresql/data
    networks:
      - backend

  redis:
    image: redis:7-alpine
    container_name: assessment-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:`/data
    networks:
      - backend

  ml-server:
    build:
      context: ./services/ml-server
    container_name: assessment-ml
    environment:
      PYTHONUNBUFFERED: 1
      REDIS_URL: redis://redis:6379
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/assessment_platform
    ports:
      - "8000:8000"
    depends_on:
      - postgres
      - redis
    networks:
      - backend
      - frontend

  api:
    build:
      context: ./apps/api
    container_name: assessment-api
    environment:
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/assessment_platform
      REDIS_URL: redis://redis:6379
      NODE_ENV: development
      PORT: 3000
    ports:
      - "3000:3000"
    depends_on:
      - postgres
      - redis
    networks:
      - backend
      - frontend

  web:
    build:
      context: ./apps/web
    container_name: assessment-web
    environment:
      NEXT_PUBLIC_API_URL: http://localhost:3000
      NODE_ENV: development
    ports:
      - "3001:3000"
    depends_on:
      - api
    networks:
      - frontend

  minio:
    image: minio/minio:latest
    container_name: assessment-minio
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports:
      - "9000:9000"
      - "9001:9001"
    volumes:
      - minio_data:`/data
    command: server /data --console-address ":9001"
    networks:
      - backend

  n8n:
    image: n8nio/n8n:latest
    container_name: assessment-n8n
    environment:
      N8N_BASIC_AUTH_ACTIVE: "false"
      DB_TYPE: postgresdb
      DB_POSTGRESDB_HOST: postgres
      DB_POSTGRESDB_USER: postgres
      DB_POSTGRESDB_PASSWORD: postgres
      DB_POSTGRESDB_DATABASE: n8n
    ports:
      - "5678:5678"
    depends_on:
      - postgres
    networks:
      - backend

volumes:
  postgres_data:
  redis_data:
  minio_data:

networks:
  frontend:
    driver: bridge
  backend:
    driver: bridge
    internal: false
"@

$dcFile = "$baseDir\docker-compose.yml"
Set-Content -Path $dcFile -Value $dockerCompose -Force
Write-Host "  Created docker-compose.yml" -ForegroundColor Green

# ==========================================
# 7. ENVIRONMENT FILE
# ==========================================

Write-Host "`n[STEP 7] Creating .env file..." -ForegroundColor Cyan

$envFile = @"
# Database
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/assessment_platform
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=assessment_platform

# Redis
REDIS_URL=redis://redis:6379
REDIS_HOST=redis
REDIS_PORT=6379

# API
API_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3000
JWT_SECRET=your-super-secret-jwt-key-change-this

# Services
NODE_ENV=development
LOG_LEVEL=info

# MinIO
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=minioadmin
MINIO_ENDPOINT=http://minio:9000
MINIO_BUCKET=exam-snapshots

# ML Server
PYTHONUNBUFFERED=1

# External APIs (add your keys)
OPENAI_API_KEY=sk-your-key-here
SENDGRID_API_KEY=SG-your-key-here
ANTHROPIC_API_KEY=sk-ant-your-key-here
"@

$envFilePath = "$baseDir\.env"
Set-Content -Path $envFilePath -Value $envFile -Force
Write-Host "  Created .env file" -ForegroundColor Green
Write-Host "  NOTE: Add API keys before running docker-compose up" -ForegroundColor Yellow

# ==========================================
# 8. COMPLETION
# ==========================================

Write-Host "`n================================" -ForegroundColor Cyan
Write-Host "Setup Complete!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Cyan

Write-Host "`nNext Steps:" -ForegroundColor Yellow
Write-Host "  1. Edit E:\assessment_platform\.env" -ForegroundColor White
Write-Host "     Add OpenAI, SendGrid, and Anthropic API keys" -ForegroundColor Gray
Write-Host ""
Write-Host "  2. Start Docker Desktop" -ForegroundColor White
Write-Host ""
Write-Host "  3. Run services:" -ForegroundColor White
Write-Host "     cd E:\assessment_platform" -ForegroundColor Gray
Write-Host "     docker-compose up --build" -ForegroundColor Gray
Write-Host ""
Write-Host "  4. Access dashboard:" -ForegroundColor White
Write-Host "     http://localhost:3001" -ForegroundColor Gray

Write-Host "`nLocation: $baseDir" -ForegroundColor Cyan
Write-Host "Size: ~15 GB`n" -ForegroundColor Cyan
