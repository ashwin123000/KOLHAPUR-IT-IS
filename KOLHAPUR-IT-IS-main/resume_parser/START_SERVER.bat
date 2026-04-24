@echo off
REM Resume Parser - Windows Startup Script
REM This script starts the FastAPI Resume Parser server

setlocal enabledelayedexpansion
color 0A
title Resume Parser - API Server

cd /d "%~dp0"

echo.
echo ============================================================
echo  Resume Parser - FastAPI Server
echo ============================================================
echo.

REM Check if venv exists
if not exist "venv" (
    echo Creating virtual environment...
    python -m venv venv
    if errorlevel 1 (
        echo Error creating virtual environment
        echo Make sure Python 3.9+ is installed
        pause
        exit /b 1
    )
)

REM Activate virtual environment
echo Activating virtual environment...
call venv\Scripts\activate.bat

REM Install/update dependencies
echo Installing dependencies...
pip install -q -r requirements.txt
if errorlevel 1 (
    echo Error installing dependencies
    pause
    exit /b 1
)

REM Start server
echo.
echo ============================================================
echo Starting server on http://0.0.0.0:8000
echo.
echo Documentation:
echo   - Swagger UI: http://localhost:8000/docs
echo   - ReDoc: http://localhost:8000/redoc
echo.
echo To run tests:
echo   - Python: python test_api.py (in another terminal)
echo.
echo Press CTRL+C to stop
echo ============================================================
echo.

python run.py

pause
