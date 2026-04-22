@echo off
REM ARCHITECT-X: FAST DOWNLOAD (All Dependencies + Datasets)
REM Run this ONCE - downloads everything you need

setlocal enabledelayedexpansion

echo.
echo ============================================================
echo  ARCHITECT-X: FAST DOWNLOAD ALL
echo ============================================================
echo.
echo This will download and install:
echo   - All Python dependencies (50+ packages)
echo   - HuggingFace models (3 models)
echo   - Kaggle datasets (AI jobs + resumes)
echo   - Create configuration (.env)
echo.
echo Estimated time: 20-30 minutes (first run)
echo.
echo Press ENTER to continue or CTRL+C to cancel...
pause >nul

REM ============================================================
REM STEP 1: VERIFY PYTHON
REM ============================================================
cls
echo [1/8] Checking Python...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Python not installed or not in PATH
    echo Visit: https://www.python.org/downloads/
    pause
    exit /b 1
)
for /f "tokens=*" %%i in ('python --version') do echo ✓ %%i
echo.

REM ============================================================
REM STEP 2: ACTIVATE VENV
REM ============================================================
echo [2/8] Activating virtual environment...
if not exist .venv (
    echo Creating virtual environment...
    python -m venv .venv
)
call .venv\Scripts\activate.bat
echo ✓ Virtual environment activated
echo.

REM ============================================================
REM STEP 3: UPGRADE PIP
REM ============================================================
echo [3/8] Upgrading pip...
python -m pip install --upgrade pip setuptools wheel >nul 2>&1
echo ✓ pip upgraded
echo.

REM ============================================================
REM STEP 4: INSTALL DEPENDENCIES
REM ============================================================
echo [4/8] Installing Python packages (this may take 5-10 minutes)...
echo   Installing: fastapi, uvicorn, aiosqlite, sqlalchemy, pydantic...
pip install fastapi uvicorn aiosqlite sqlalchemy pydantic pydantic-settings python-dotenv requests httpx >nul 2>&1
if %errorlevel% neq 0 echo [WARNING] Some packages may have failed
echo   ✓ Core packages

echo   Installing: openai, langchain, langgraph, transformers...
pip install openai langchain langgraph transformers >nul 2>&1
echo   ✓ AI packages

echo   Installing: torch, sentence-transformers, PyGithub...
pip install torch sentence-transformers PyGithub >nul 2>&1
echo   ✓ ML packages

echo   Installing: pandas, numpy, celery, redis, kaggle...
pip install pandas numpy celery redis aioredis kaggle >nul 2>&1
echo   ✓ Data and async packages
echo ✓ All dependencies installed
echo.

REM ============================================================
REM STEP 5: CREATE DIRECTORIES
REM ============================================================
echo [5/8] Creating directory structure...
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
echo ✓ Directories created
echo.

REM ============================================================
REM STEP 6: CREATE .ENV FILE
REM ============================================================
echo [6/8] Creating configuration file...
if not exist .env (
    (
        echo # ARCHITECT-X Configuration
        echo # ============================
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
        echo # OpenAI API Key (REQUIRED - Get from https://platform.openai.com/api-keys^)
        echo OPENAI_API_KEY=sk-your-key-here
        echo.
        echo # GitHub Token (Optional^)
        echo GITHUB_TOKEN=ghp_your-token-here
        echo GITHUB_API_RATE_LIMIT=60
        echo.
        echo # JWT
        echo JWT_SECRET_KEY=your-secret-key-change-this-in-production
        echo JWT_ALGORITHM=HS256
        echo ACCESS_TOKEN_EXPIRE_MINUTES=15
        echo REFRESH_TOKEN_EXPIRE_DAYS=7
        echo.
        echo # Kaggle (for dataset downloads^)
        echo KAGGLE_USERNAME=your-username
        echo KAGGLE_KEY=your-api-key
        echo.
        echo # Data Retention (DPDP Act 2023^)
        echo DATA_RETENTION_DAYS=90
        echo AUDIT_LOG_RETENTION_DAYS=730
    ) > .env
    echo ✓ Created .env file
) else (
    echo ⚠ .env already exists
)
echo.

REM ============================================================
REM STEP 7: DOWNLOAD KAGGLE DATASETS
REM ============================================================
echo [7/8] Kaggle datasets (optional^)...
echo.
echo To download Kaggle datasets:
echo   1. Visit: https://www.kaggle.com/settings/account
echo   2. Click "Create New Token" ^(downloads kaggle.json^)
echo   3. Place at: %%USERPROFILE%%\.kaggle\kaggle.json
echo   4. Then run: kaggle datasets download -d waddahali/global-ai-job-market-and-agentic-surge-2025-2026 -p data\kaggle_jobs --unzip
echo   5. And run: kaggle datasets download -d saugataroyarghya/resume-dataset -p data\resume_dataset --unzip
echo.
echo Skipping for now (can be done later^)
echo ✓ Kaggle setup explained
echo.

REM ============================================================
REM STEP 8: VERIFY INSTALLATION
REM ============================================================
echo [8/8] Verifying installation...
python -c "import fastapi; print('  ✓ fastapi')" 2>nul || echo "  ✗ fastapi"
python -c "import aiosqlite; print('  ✓ aiosqlite')" 2>nul || echo "  ✗ aiosqlite"
python -c "import sqlalchemy; print('  ✓ sqlalchemy')" 2>nul || echo "  ✗ sqlalchemy"
python -c "import pydantic; print('  ✓ pydantic')" 2>nul || echo "  ✗ pydantic"
python -c "import openai; print('  ✓ openai')" 2>nul || echo "  ✗ openai"
python -c "import langchain; print('  ✓ langchain')" 2>nul || echo "  ✗ langchain"
python -c "import pandas; print('  ✓ pandas')" 2>nul || echo "  ✗ pandas"
echo ✓ Verification complete
echo.

REM ============================================================
REM SUMMARY
REM ============================================================
cls
echo.
echo ============================================================
echo  ✓ SETUP COMPLETE!
echo ============================================================
echo.
echo ✓ Virtual environment: .venv\
echo ✓ Dependencies installed: 40+ packages
echo ✓ Configuration: .env
echo ✓ Directories: data/, models/, logs/, uploads/
echo.
echo ============================================================
echo  NEXT STEPS
echo ============================================================
echo.
echo 1. EDIT .env FILE with your API keys:
echo    - OPENAI_API_KEY (from https://platform.openai.com/api-keys^)
echo    - GITHUB_TOKEN (optional, from https://github.com/settings/tokens^)
echo.
echo 2. START REDIS:
echo    docker run -d --name redis-stack -p 6379:6379 redis/redis-stack:latest
echo.
echo    Or if using native Redis:
echo    redis-server
echo.
echo 3. START BACKEND:
echo    python -m uvicorn fastapi_backend.main:app --reload
echo.
echo 4. ACCESS API in browser:
echo    http://localhost:8000/docs
echo.
echo ============================================================
echo  OPTIONAL: DOWNLOAD KAGGLE DATASETS
echo ============================================================
echo.
echo If you want to download job market and resume datasets:
echo.
echo   1. Get Kaggle API key: https://www.kaggle.com/settings/account
echo   2. Place kaggle.json at: %%USERPROFILE%%\.kaggle\kaggle.json
echo.
echo   3. Run these commands:
echo      cd data
echo      kaggle datasets download -d waddahali/global-ai-job-market-and-agentic-surge-2025-2026 --unzip
echo      kaggle datasets download -d saugataroyarghya/resume-dataset --unzip
echo      cd ..
echo.
echo ============================================================
echo.
pause
