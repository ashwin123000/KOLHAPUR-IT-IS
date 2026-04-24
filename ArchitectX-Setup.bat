@echo off
setlocal enabledelayedexpansion

echo.
echo ====================================================================
echo   ARCHITECT-X COMPLETE ENVIRONMENT SETUP
echo ====================================================================
echo.

set projectRoot=c:\Users\Admin\Documents\ASHWIN\KOLHAPUR-IT-IS-main
set pythonExe=python

echo [PHASE 1] Checking Python Installation
%pythonExe% --version
if errorlevel 1 (
    echo ERROR: Python not found! Please install Python 3.11+
    exit /b 1
)

echo [PHASE 2] Creating Virtual Environment
if not exist "%projectRoot%\venv" (
    echo Creating venv...
    %pythonExe% -m venv "%projectRoot%\venv"
    echo Created!
) else (
    echo venv already exists
)

echo [PHASE 3] Activating Virtual Environment
call "%projectRoot%\venv\Scripts\activate.bat"

echo [PHASE 4] Upgrading pip and core tools
%pythonExe% -m pip install --upgrade pip setuptools wheel -q

echo [PHASE 5] Installing Core Python Dependencies
echo Installing FastAPI and web frameworks...
%pythonExe% -m pip install fastapi uvicorn[standard] motor pymongo python-multipart passlib[bcrypt] python-jose[cryptography] python-dotenv -q

echo Installing database and cache libraries...
%pythonExe% -m pip install aioredis redis[hiredis] redisvl websockets aiohttp -q

echo Installing background job workers...
%pythonExe% -m pip install celery[redis] rq -q

echo Installing testing tools...
%pythonExe% -m pip install pytest httpx -q

echo [PHASE 6] Installing ML/AI Libraries (may take 5-10 minutes)
echo Installing PyTorch (CPU)...
%pythonExe% -m pip install torch torchaudio torchvision --index-url https://download.pytorch.org/whl/cpu -q

echo Installing transformers and NLP models...
%pythonExe% -m pip install transformers sentence-transformers datasets scikit-learn numpy pandas -q

echo Installing LLM orchestration...
%pythonExe% -m pip install langchain langgraph -q

echo [PHASE 7] Creating Directory Structure
if not exist "%projectRoot%\data\jobs" mkdir "%projectRoot%\data\jobs"
if not exist "%projectRoot%\data\resumes" mkdir "%projectRoot%\data\resumes"
if not exist "%projectRoot%\data\onet" mkdir "%projectRoot%\data\onet"
if not exist "%projectRoot%\logs" mkdir "%projectRoot%\logs"
if not exist "%projectRoot%\uploads" mkdir "%projectRoot%\uploads"
if not exist "%projectRoot%\models" mkdir "%projectRoot%\models"
if not exist "%projectRoot%\backend" mkdir "%projectRoot%\backend"
if not exist "%projectRoot%\scripts" mkdir "%projectRoot%\scripts"

echo ✓ Directories created

echo [PHASE 8] Creating .env Configuration File
(
echo # ARCHITECT-X ENGINE CONFIGURATION
echo.
echo # Database
echo MONGO_URL=mongodb://admin:password@localhost:27017/architect-x?authSource=admin
echo MONGO_DB_NAME=architect-x
echo REDIS_URL=redis://localhost:6379/0
echo REDIS_CACHE_DB=1
echo.
echo # API
echo API_HOST=0.0.0.0
echo API_PORT=8000
echo API_DEBUG=True
echo ENVIRONMENT=development
echo.
echo # Security
echo SECRET_KEY=architect-x-secret-key-change-this-in-production
echo JWT_EXPIRATION_MINUTES=1440
echo ALGORITHM=HS256
echo.
echo # Embedding
echo EMBEDDING_MODEL=all-MiniLM-L6-v2
echo EMBEDDING_DIM=384
echo BATCH_SIZE=32
echo.
echo # Vector Search
echo VECTOR_INDEX_NAME=job_embeddings
echo TOP_K_RESULTS=10
echo.
echo # Background Workers
echo CELERY_BROKER=redis://localhost:6379/0
echo CELERY_BACKEND=redis://localhost:6379/1
echo.
echo # Frontend
echo FRONTEND_URL=http://localhost:5173
echo FRONTEND_PORT=5173
echo.
echo # n8n
echo N8N_URL=http://localhost:5678
echo.
echo # Kaggle
echo KAGGLE_CONFIG_DIR=%USERPROFILE%\.kaggle
) > "%projectRoot%\.env"

echo ✓ .env file created

echo [PHASE 9] Verifying Key Installations
%pythonExe% -c "import importlib.metadata; print('✓ fastapi:', importlib.metadata.version('fastapi'))" 2>nul || echo ✗ fastapi not found
%pythonExe% -c "import importlib.metadata; print('✓ motor:', importlib.metadata.version('motor'))" 2>nul || echo ✗ motor not found
%pythonExe% -c "import importlib.metadata; print('✓ torch:', importlib.metadata.version('torch'))" 2>nul || echo ✗ torch not found
%pythonExe% -c "import importlib.metadata; print('✓ transformers:', importlib.metadata.version('transformers'))" 2>nul || echo ✗ transformers not found
%pythonExe% -c "import importlib.metadata; print('✓ sentence-transformers:', importlib.metadata.version('sentence-transformers'))" 2>nul || echo ✗ sentence-transformers not found

echo.
echo ====================================================================
echo   SETUP COMPLETE!
echo ====================================================================
echo.
echo NEXT STEPS:
echo.
echo 1. INSTALL NODE.JS (if not already installed^)
echo    Download from: https://nodejs.org/
echo.
echo 2. START DOCKER SERVICES (requires Docker Desktop^)
echo    docker run -d --name mongodb -p 27017:27017 mongo:latest
echo    docker run -d --name redis-stack -p 6379:6379 -p 8001:8001 redis/redis-stack:latest
echo.
echo 3. VERIFY SERVICES
echo    mongosh mongodb://localhost:27017
echo    Browser: http://localhost:8001  (Redis Insight^)
echo.
echo 4. INITIALIZE VECTOR INDEXES
echo    python scripts\init_vector_index.py
echo.
echo 5. SEED DATABASE WITH SAMPLE DATA
echo    python scripts\seed_database.py
echo.
echo 6. START BACKEND SERVER (Terminal 1^)
echo    python -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
echo.
echo 7. START FRONTEND (Terminal 2^)
echo    cd frontend
echo    npm install
echo    npm run dev
echo.
echo 8. START n8n AUTOMATION (Terminal 3^)
echo    n8n
echo.
echo ====================================================================
echo   Environment Status:
echo ====================================================================
echo venv location: %projectRoot%\venv
echo project root: %projectRoot%
echo Python: %pythonExe%
echo ====================================================================
echo.

pause
