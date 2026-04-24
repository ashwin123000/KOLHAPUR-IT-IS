$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $PSScriptRoot
$AppRoot = Join-Path $Root "KOLHAPUR-IT-IS-main"
$LogsDir = Join-Path $Root "logs"
$MongoDataDir = Join-Path $Root "data\mongo"
$BackendDir = Join-Path $AppRoot "fastapi_backend"
$FrontendDir = Join-Path $AppRoot "frontend"
$MongoLog = Join-Path $LogsDir "mongo.log"
$BackendLog = Join-Path $LogsDir "backend.log"
$FrontendLog = Join-Path $LogsDir "frontend.log"
$BackendErrLog = Join-Path $LogsDir "backend.err.log"
$FrontendErrLog = Join-Path $LogsDir "frontend.err.log"
$MongoErrLog = Join-Path $LogsDir "mongo.err.log"
$VenvPython = Join-Path $Root "venv\Scripts\python.exe"
$NpmCmd = "C:\Program Files\nodejs\npm.cmd"

function Stop-ManagedProcess {
    param([System.Diagnostics.Process]$Process)

    if ($null -eq $Process) { return }
    try {
        if (-not $Process.HasExited) {
            Stop-Process -Id $Process.Id -Force -ErrorAction SilentlyContinue
        }
    } catch {
    }
}

function Resolve-Mongod {
    $local = Get-ChildItem -Path $Root -Recurse -Filter "mongod.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($local) { return $local.FullName }

    $cmd = Get-Command "mongod.exe" -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }

    return $null
}

New-Item -ItemType Directory -Force -Path $LogsDir | Out-Null
New-Item -ItemType Directory -Force -Path $MongoDataDir | Out-Null

$mongod = Resolve-Mongod
if (-not $mongod) {
    Write-Host "[MongoDB] mongod.exe not found. Install MongoDB or add mongod.exe to PATH, then rerun start.bat or start.sh." -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $VenvPython)) {
    Write-Host "[Backend] Python virtualenv not found at $VenvPython" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path $NpmCmd)) {
    Write-Host "[Frontend] npm.cmd not found at $NpmCmd" -ForegroundColor Red
    exit 1
}

Write-Host "[MongoDB] Starting..."
$mongoProcess = Start-Process -FilePath $mongod `
    -ArgumentList "--dbpath", $MongoDataDir, "--port", "27017", "--bind_ip", "127.0.0.1" `
    -WorkingDirectory $Root `
    -RedirectStandardOutput $MongoLog `
    -RedirectStandardError $MongoErrLog `
    -PassThru

Write-Host "[Backend] Starting..."
$backendProcess = Start-Process -FilePath $VenvPython `
    -ArgumentList "-m", "uvicorn", "main:app", "--reload", "--host", "0.0.0.0", "--port", "8000" `
    -WorkingDirectory $BackendDir `
    -RedirectStandardOutput $BackendLog `
    -RedirectStandardError $BackendErrLog `
    -PassThru

Write-Host "[Frontend] Starting..."
$frontendProcess = Start-Process -FilePath $NpmCmd `
    -ArgumentList "run", "dev" `
    -WorkingDirectory $FrontendDir `
    -RedirectStandardOutput $FrontendLog `
    -RedirectStandardError $FrontendErrLog `
    -PassThru

$cleanup = {
    Stop-ManagedProcess -Process $frontendProcess
    Stop-ManagedProcess -Process $backendProcess
    Stop-ManagedProcess -Process $mongoProcess
}

Register-EngineEvent PowerShell.Exiting -Action $cleanup | Out-Null

Write-Host "All services running. Open http://localhost:5173"

try {
    while ($true) {
        Start-Sleep -Seconds 1
        if ($mongoProcess.HasExited -or $backendProcess.HasExited -or $frontendProcess.HasExited) {
            break
        }
    }
} finally {
    & $cleanup
}
