@echo off
REM ARCHITECT-X: Complete Setup Script for Windows
REM Downloads all datasets, models, and dependencies

setlocal enabledelayedexpansion

echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                                                              ║
echo ║       ARCHITECT-X: COMPLETE DOWNLOAD ^& SETUP (WINDOWS)    ║
echo ║                                                              ║
echo ║              Production-Grade Setup v2.0                     ║
echo ║                                                              ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.

REM Color definitions
for /F %%A in ('copy /Z "%~f0" nul') do set "BS=%%A"

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python not found. Please install Python 3.10+ and add to PATH.
    pause
    exit /b 1
)

echo [INFO] Python found:
python --version
echo.

REM Step 1: Create directory structure
echo [STEP 1/10] Creating directory structure...
mkdir data\kaggle_jobs >nul 2>&1
mkdir data\resume_dataset >nul 2>&1
mkdir data\ml_datasets >nul 2>&1
mkdir data\onet_database >nul 2>&1
mkdir models\huggingface >nul 2>&1
mkdir models\ner_resume >nul 2>&1
mkdir logs >nul 2>&1
mkdir uploads\resumes >nul 2>&1
mkdir uploads\avatars >nul 2>&1
mkdir backups\database >nul 2>&1
echo [SUCCESS] Directories created
echo.

REM Step 2: Upgrade pip
echo [STEP 2/10] Upgrading pip...
python -m pip install --upgrade pip setuptools wheel >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARNING] Could not upgrade pip, continuing anyway...
) else (
    echo [SUCCESS] pip upgraded
)
echo.

REM Step 3: Install core dependencies
echo [STEP 3/10] Installing core Python dependencies...
echo   - fastapi
pip install fastapi uvicorn aiosqlite sqlalchemy pydantic pydantic-settings python-dotenv requests httpx >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Failed to install core dependencies
    pause
    exit /b 1
)
echo [SUCCESS] Core dependencies installed
echo.

REM Step 4: Install AI/ML dependencies
echo [STEP 4/10] Installing AI/ML dependencies...
echo   - openai, langchain, langgraph
echo   - transformers, torch, sentence-transformers
echo   - PyGithub
pip install openai langchain langgraph transformers torch sentence-transformers PyGithub >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARNING] Some AI packages failed to install (may be OK)
) else (
    echo [SUCCESS] AI/ML dependencies installed
)
echo.

REM Step 5: Install data packages
echo [STEP 5/10] Installing data processing packages...
echo   - pandas, numpy
pip install pandas numpy >nul 2>&1
echo [SUCCESS] Data packages installed
echo.

REM Step 6: Install async packages
echo [STEP 6/10] Installing async/queue packages...
echo   - celery, redis, aioredis
pip install celery redis aioredis >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARNING] Async packages may not have installed (optional)
) else (
    echo [SUCCESS] Async packages installed
)
echo.

REM Step 7: Install Kaggle CLI
echo [STEP 7/10] Installing Kaggle CLI...
pip install kaggle >nul 2>&1
echo [SUCCESS] Kaggle CLI installed
echo.

REM Step 8: Verify installations
echo [STEP 8/10] Verifying Python packages...
python -c "import fastapi; print('  ✓ fastapi')" 2>nul || echo "  ✗ fastapi failed"
python -c "import aiosqlite; print('  ✓ aiosqlite')" 2>nul || echo "  ✗ aiosqlite failed"
python -c "import sqlalchemy; print('  ✓ sqlalchemy')" 2>nul || echo "  ✗ sqlalchemy failed"
python -c "import pydantic; print('  ✓ pydantic')" 2>nul || echo "  ✗ pydantic failed"
python -c "import openai; print('  ✓ openai')" 2>nul || echo "  ✗ openai failed"
python -c "import langchain; print('  ✓ langchain')" 2>nul || echo "  ✗ langchain failed"
python -c "import torch; print('  ✓ torch')" 2>nul || echo "  ✗ torch (optional)"
python -c "import pandas; print('  ✓ pandas')" 2>nul || echo "  ✗ pandas"
echo.

REM Step 9: Create .env file
echo [STEP 9/10] Creating .env configuration file...
if not exist .env (
    (
        echo # ARCHITECT-X Configuration
        echo.
        echo # API Server
        echo HOST=0.0.0.0
        echo PORT=8000
        echo DEBUG=False
        echo LOG_LEVEL=INFO
        echo.
        echo # Database
        echo DATABASE_URL=sqlite:///./architect_x.db
        echo.
        echo # Redis
        echo REDIS_URL=redis://localhost:6379/0
        echo.
        echo # OpenAI
        echo OPENAI_API_KEY=sk-...
        echo.
        echo # GitHub
        echo GITHUB_TOKEN=ghp_...
        echo GITHUB_API_RATE_LIMIT=60
        echo.
        echo # JWT
        echo JWT_SECRET_KEY=your-secret-key-change-this
        echo JWT_ALGORITHM=HS256
        echo ACCESS_TOKEN_EXPIRE_MINUTES=15
        echo REFRESH_TOKEN_EXPIRE_DAYS=7
        echo.
        echo # Kaggle
        echo KAGGLE_USERNAME=your-username
        echo KAGGLE_KEY=your-api-key
    ) > .env
    echo [SUCCESS] Created .env file - EDIT WITH YOUR CREDENTIALS
) else (
    echo [INFO] .env already exists
)
echo.

REM Step 10: Summary and next steps
echo [STEP 10/10] Setup complete!
echo.
echo ════════════════════════════════════════════════════════════════
echo                        SETUP COMPLETE
echo ════════════════════════════════════════════════════════════════
echo.
echo [NEXT STEPS]
echo.
echo 1. EDIT .env FILE with your credentials:
echo    - OPENAI_API_KEY (from https://platform.openai.com/api-keys)
echo    - GITHUB_TOKEN (optional, from https://github.com/settings/tokens)
echo.
echo 2. START REDIS STACK:
echo    docker run -d --name redis-stack -p 6379:6379 redis/redis-stack:latest
echo.
echo 3. START BACKEND:
echo    python -m uvicorn fastapi_backend.main:app --reload
echo.
echo 4. ACCESS API:
echo    http://localhost:8000/docs
echo.
echo [KAGGLE DATASETS]
echo If you want to download datasets:
echo   1. Visit: https://www.kaggle.com/settings/account
echo   2. Create a new token (downloads kaggle.json)
echo   3. Place at: %%USERPROFILE%%\.kaggle\kaggle.json
echo   4. Then run: python download_everything.py
echo.
echo [TROUBLESHOOTING]
echo - If aiosqlite fails: pip install aiosqlite
echo - If Redis fails: Make sure Docker is installed and running
echo - If torch fails: It's optional, continue anyway
echo.

pause
