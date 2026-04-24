@echo off
setlocal enabledelayedexpansion

echo.
echo ============================================
echo SETTING UP FREELANCE PLATFORM - C: DRIVE
echo ============================================
echo.

cd /d c:\Users\Admin\.gemini\antigravity\scratch\freelance_platform

echo [1/4] Creating C: drive directories...
mkdir C:\freelance_platform_data\resumes 2>nul
mkdir C:\freelance_platform_data\models 2>nul
mkdir C:\freelance_platform_data\jobs_data 2>nul
mkdir C:\freelance_platform_data\cache 2>nul
echo ✓ Directories created

echo.
echo [2/4] Activating Python virtual environment...
call .venv\Scripts\activate.bat
if errorlevel 1 (
    echo ✗ Failed to activate venv
    exit /b 1
)
echo ✓ Virtual environment activated

echo.
echo [3/4] Installing Python dependencies...
pip install -q -r requirements.txt
if errorlevel 1 (
    echo ✗ Failed to install requirements
    exit /b 1
)
echo ✓ All packages installed

echo.
echo [4/4] Installing frontend dependencies...
cd frontend
npm install --silent
if errorlevel 1 (
    echo ✗ Failed to install npm packages
    cd ..
    exit /b 1
)
echo ✓ Frontend packages installed

cd ..

echo.
echo ============================================
echo ✓ SETUP COMPLETE!
echo ============================================
echo.
echo YOUR COMMANDS TO START:
echo.
echo TERMINAL 1 (Backend):
echo   .\.venv\Scripts\activate.bat
echo   python -m uvicorn fastapi_backend.main:app --reload --host 127.0.0.1 --port 8000
echo.
echo TERMINAL 2 (Frontend):
echo   cd frontend
echo   npm run dev
echo.
echo Downloads will be saved to: C:\freelance_platform_data
echo.
pause
