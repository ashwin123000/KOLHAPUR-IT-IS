@echo off
setlocal

set "ROOT=%~dp0"
set "APP_ROOT=%ROOT%KOLHAPUR-IT-IS-main"
set "FRONTEND_DIR=%APP_ROOT%\frontend"
set "VENV_PYTHON=%ROOT%venv\Scripts\python.exe"
set "NODE_HOME=%ROOT%tools\node-v20.11.1-win-x64"
set "NPM_CMD=%NODE_HOME%\npm.cmd"
set "NPX_CMD=%NODE_HOME%\npx.cmd"
set "MONGO_URL=mongodb://localhost:27017/?replicaSet=rs0&directConnection=true"
set "MONGODB_URI=%MONGO_URL%"
set "MONGO_DB_NAME=freelancer_db"
set "MONGODB_DB=freelancer_db"
set "REDIS_URL=redis://localhost:6379/0"

cd /d "%ROOT%"

echo [Architect-X] Starting Docker services...
docker-compose up -d
if errorlevel 1 exit /b %errorlevel%

echo [Architect-X] Initializing MongoDB, Redis, Python, and frontend dependencies...
"%VENV_PYTHON%" "%ROOT%init-stack.py"
if errorlevel 1 exit /b %errorlevel%

echo [Architect-X] Launching FastAPI backend...
start "Architect-X Backend" cmd /k "cd /d \"%APP_ROOT%\" && \"%VENV_PYTHON%\" -m uvicorn fastapi_backend.main:app --reload"

echo [Architect-X] Launching frontend...
start "Architect-X Frontend" cmd /k "cd /d \"%FRONTEND_DIR%\" && \"%NPM_CMD%\" run dev"

echo [Architect-X] Launching n8n tunnel...
docker ps --format "{{.Names}}" | findstr /I "^architectx_n8n$" >nul
if %errorlevel%==0 (
  start "Architect-X n8n" cmd /k "echo n8n container is already running at http://localhost:5678 && echo Tunnel startup skipped to avoid a port conflict."
) else (
  start "Architect-X n8n" cmd /k "cd /d \"%APP_ROOT%\" && \"%NPX_CMD%\" n8n start --tunnel"
)

echo [Architect-X] Stack launch complete.
endlocal
