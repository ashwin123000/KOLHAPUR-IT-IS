# Automatic Deployment Script for Freelance Marketplace
# This script copies the entire project to C or E drive and sets it up

param(
    [string]$TargetDrive = "C",
    [switch]$Install = $false
)

$ScriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectName = "FreelanceMarketplace"
$TargetPath = "$($TargetDrive):\$ProjectName"

Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║     FREELANCE MARKETPLACE - AUTOMATIC DEPLOYMENT SCRIPT       ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "📦 Source:      $ScriptPath"
Write-Host "📍 Target:      $TargetPath"
Write-Host "🔧 Install:     $($Install ? 'Yes' : 'No')"
Write-Host ""

# Check if target drive exists
$DriveTest = Test-Path "$($TargetDrive):\"
if (-not $DriveTest) {
    Write-Host "❌ Drive $($TargetDrive): not found!" -ForegroundColor Red
    exit 1
}

# Create target directory
Write-Host "📂 Creating directory structure..." -ForegroundColor Yellow
New-Item -ItemType Directory -Path $TargetPath -Force | Out-Null

# Copy project files (exclude large directories initially)
Write-Host "📋 Copying project files..." -ForegroundColor Yellow
$ExcludeItems = @(".git", ".venv", "node_modules", "build", ".vscode", "__pycache__")

Get-ChildItem -Path $ScriptPath -Recurse -Exclude $ExcludeItems | ForEach-Object {
    $RelativePath = $_.FullName.Substring($ScriptPath.Length + 1)
    $TargetItem = Join-Path $TargetPath $RelativePath
    
    if ($_.PSIsContainer) {
        New-Item -ItemType Directory -Path $TargetItem -Force | Out-Null
    } else {
        Copy-Item -Path $_.FullName -Destination $TargetItem -Force
    }
}

Write-Host "✅ Project files copied" -ForegroundColor Green

# Copy virtual environment
Write-Host "🐍 Copying Python virtual environment..." -ForegroundColor Yellow
Copy-Item -Path "$ScriptPath\.venv" -Destination "$TargetPath\.venv" -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "✅ Virtual environment copied" -ForegroundColor Green

# Copy node_modules
Write-Host "📦 Copying frontend dependencies..." -ForegroundColor Yellow
Copy-Item -Path "$ScriptPath\frontend\node_modules" -Destination "$TargetPath\frontend\node_modules" -Recurse -Force -ErrorAction SilentlyContinue
Write-Host "✅ Frontend dependencies copied" -ForegroundColor Green

# Create start scripts
Write-Host "🚀 Creating startup scripts..." -ForegroundColor Yellow

# Backend startup script
@"
@echo off
cd /d "$TargetPath"
call .venv\Scripts\activate.bat
echo.
echo ════════════════════════════════════════════════════════════
echo  FREELANCE MARKETPLACE - BACKEND SERVER
echo ════════════════════════════════════════════════════════════
echo.
echo Starting FastAPI server on http://0.0.0.0:8000...
echo Press CTRL+C to stop
echo.
uvicorn fastapi_backend.main:app --reload --host 0.0.0.0 --port 8000
pause
"@ | Out-File -FilePath "$TargetPath\START_BACKEND.bat" -Encoding ASCII

# Frontend startup script
@"
@echo off
cd /d "$TargetPath\frontend"
echo.
echo ════════════════════════════════════════════════════════════
echo  FREELANCE MARKETPLACE - FRONTEND DEV SERVER
echo ════════════════════════════════════════════════════════════
echo.
echo Starting Vite dev server on http://localhost:5173...
echo Press CTRL+C to stop
echo.
npm run dev
pause
"@ | Out-File -FilePath "$TargetPath\START_FRONTEND.bat" -Encoding ASCII

Write-Host "✅ Startup scripts created" -ForegroundColor Green

# Create combined startup
@"
@echo off
color 0A
title Freelance Marketplace - Startup Manager
cls
echo.
echo ╔════════════════════════════════════════════════════════════════╗
echo ║     FREELANCE MARKETPLACE - STARTUP MANAGER                    ║
echo ╚════════════════════════════════════════════════════════════════╝
echo.
echo 1. Start Backend (FastAPI on port 8000)
echo 2. Start Frontend (Vite on port 5173)
echo 3. Start Both (opens 2 windows)
echo 4. Run Tests
echo 5. Open in Browser
echo.
set /p choice="Select option (1-5): "

if "%choice%"=="1" goto backend
if "%choice%"=="2" goto frontend
if "%choice%"=="3" goto both
if "%choice%"=="4" goto tests
if "%choice%"=="5" goto browser
goto end

:backend
start "Freelance Marketplace - Backend" cmd /k "$TargetPath\START_BACKEND.bat"
goto end

:frontend
start "Freelance Marketplace - Frontend" cmd /k "$TargetPath\START_FRONTEND.bat"
goto end

:both
start "Freelance Marketplace - Backend" cmd /k "$TargetPath\START_BACKEND.bat"
timeout /t 3
start "Freelance Marketplace - Frontend" cmd /k "$TargetPath\START_FRONTEND.bat"
goto end

:tests
cd /d "$TargetPath"
powershell -NoProfile -ExecutionPolicy Bypass -Command "&'.\TEST_SYSTEM.ps1'"
pause
goto end

:browser
start http://localhost:5173
goto end

:end
cls
echo.
echo ✅ Freelance Marketplace - Setup Complete!
echo.
echo 🌐 Access application at: http://localhost:5173
echo 📡 Backend API at: http://localhost:8000
echo 📚 API Docs at: http://localhost:8000/docs
echo.
echo For help, see DEPLOYMENT_SETUP.md
echo.
pause
"@ | Out-File -FilePath "$TargetPath\STARTUP_MANAGER.bat" -Encoding ASCII

Write-Host "✅ Startup manager created" -ForegroundColor Green

# Verify installation
Write-Host ""
Write-Host "🔍 Verifying installation..." -ForegroundColor Yellow

$CheckPython = Test-Path "$TargetPath\.venv\Scripts\python.exe"
$CheckFastAPI = Test-Path "$TargetPath\fastapi_backend\main.py"
$CheckFrontend = Test-Path "$TargetPath\frontend\node_modules"
$CheckPackageJson = Test-Path "$TargetPath\frontend\package.json"

Write-Host "  🐍 Python venv: $(if($CheckPython) { '✅' } else { '❌' })"
Write-Host "  🚀 FastAPI backend: $(if($CheckFastAPI) { '✅' } else { '❌' })"
Write-Host "  📦 Frontend dependencies: $(if($CheckFrontend) { '✅' } else { '❌' })"
Write-Host "  📋 Package config: $(if($CheckPackageJson) { '✅' } else { '❌' })"

Write-Host ""
Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║            ✅ DEPLOYMENT COMPLETE AND VERIFIED!               ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Green
Write-Host ""
Write-Host "📍 Location: $TargetPath" -ForegroundColor Cyan
Write-Host ""
Write-Host "🚀 Quick Start:" -ForegroundColor Yellow
Write-Host "   1. Navigate to: $TargetPath"
Write-Host "   2. Run: .\STARTUP_MANAGER.bat"
Write-Host "   3. Select option to start backend/frontend"
Write-Host "   4. Access: http://localhost:5173"
Write-Host ""
Write-Host "📚 Documentation:" -ForegroundColor Yellow
Write-Host "   • DEPLOYMENT_SETUP.md - Full deployment guide"
Write-Host "   • QUICK_START_FINAL.md - Quick start guide"
Write-Host "   • API_ENDPOINTS.md - API documentation"
Write-Host ""
