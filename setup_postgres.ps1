#!/usr/bin/env pwsh
<#
.SYNOPSIS
AI HIRING OS — PostgreSQL Setup Script (Windows PowerShell)
Master Prompt V2.0 — Phase 1 Database Initialization

.DESCRIPTION
This script:
1. Checks if PostgreSQL is installed
2. Creates hiring_os database and hiring_user role
3. Configures pgvector extension
4. Sets up proper permissions

.EXAMPLE
./setup_postgres.ps1
#>

param(
    [string]$PostgresPassword = "secure-password-123",
    [string]$PostgresPort = "5432"
)

Write-Host "=" * 70 -ForegroundColor Cyan
Write-Host "🐘 AI HIRING OS — PostgreSQL Setup for Windows" -ForegroundColor Cyan
Write-Host "=" * 70 -ForegroundColor Cyan

# Check if PostgreSQL is installed
Write-Host "`n[1/5] Checking PostgreSQL installation..." -ForegroundColor Yellow

$PostgresPath = Get-Command psql -ErrorAction SilentlyContinue

if ($null -eq $PostgresPath) {
    Write-Host "❌ PostgreSQL not found in PATH" -ForegroundColor Red
    Write-Host "`nTo install PostgreSQL on Windows:" -ForegroundColor Yellow
    Write-Host "  Option A: Download from https://www.postgresql.org/download/windows/" -ForegroundColor Gray
    Write-Host "  Option B: Use Chocolatey: choco install postgresql14" -ForegroundColor Gray
    Write-Host "`nAfter installation, add PostgreSQL 'bin' directory to PATH:" -ForegroundColor Gray
    Write-Host "  Default path: C:\Program Files\PostgreSQL\15\bin" -ForegroundColor Gray
    exit 1
}

Write-Host "✅ PostgreSQL found: $($PostgresPath.Source)" -ForegroundColor Green

# Check PostgreSQL version
Write-Host "`n[2/5] Checking PostgreSQL version..." -ForegroundColor Yellow
$PgVersion = psql --version
Write-Host "✅ $PgVersion" -ForegroundColor Green

# Create database and role
Write-Host "`n[3/5] Creating hiring_os database and hiring_user role..." -ForegroundColor Yellow

$SqlScript = @"
-- Drop existing objects if they exist (for reset)
DROP DATABASE IF EXISTS hiring_os;
DROP USER IF EXISTS hiring_user;

-- Create hiring_user role
CREATE USER hiring_user WITH PASSWORD '$PostgresPassword';
ALTER ROLE hiring_user SET client_encoding TO 'utf8';
ALTER ROLE hiring_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE hiring_user SET default_transaction_deferrable TO off;
ALTER ROLE hiring_user SET default_transaction_read_only TO off;

-- Create hiring_os database
CREATE DATABASE hiring_os OWNER hiring_user;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE hiring_os TO hiring_user;

-- Enable pgvector extension
\c hiring_os
CREATE EXTENSION IF NOT EXISTS vector;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO hiring_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO hiring_user;
"@

# Save SQL script to temp file
$TempSqlFile = [System.IO.Path]::GetTempFileName() | Rename-Item -NewName { $_.Name -replace 'tmp$', 'sql' } -PassThru

$SqlScript | Out-File -FilePath $TempSqlFile -Encoding UTF8

try {
    # Execute SQL script as postgres superuser
    psql -U postgres -h localhost -p $PostgresPort -f $TempSqlFile | Out-Null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Database and role created successfully" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Some SQL commands may have failed. Check output above." -ForegroundColor Yellow
    }
} catch {
    Write-Host "❌ Failed to execute SQL script: $_" -ForegroundColor Red
    exit 1
} finally {
    Remove-Item -Path $TempSqlFile -Force -ErrorAction SilentlyContinue
}

# Test connection
Write-Host "`n[4/5] Testing connection as hiring_user..." -ForegroundColor Yellow

try {
    $TestConnection = psql -U hiring_user -h localhost -p $PostgresPort -d hiring_os -c "SELECT 1" 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Connection successful!" -ForegroundColor Green
    } else {
        Write-Host "❌ Connection failed. Password may be incorrect." -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Connection test failed: $_" -ForegroundColor Red
    exit 1
}

# Display connection string
Write-Host "`n[5/5] Connection Information" -ForegroundColor Yellow
Write-Host "`n📋 Add this to your .env file:" -ForegroundColor Cyan
Write-Host "DATABASE_URL=postgresql://hiring_user:$PostgresPassword@localhost:$PostgresPort/hiring_os" -ForegroundColor Gray

Write-Host "`n" -ForegroundColor Cyan
Write-Host "=" * 70 -ForegroundColor Cyan
Write-Host "✅ PostgreSQL Setup Complete!" -ForegroundColor Green
Write-Host "=" * 70 -ForegroundColor Cyan

Write-Host "`n📝 Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Copy the DATABASE_URL above to your .env file" -ForegroundColor Gray
Write-Host "  2. Generate JWT_SECRET: openssl rand -hex 32" -ForegroundColor Gray
Write-Host "  3. Add your ANTHROPIC_API_KEY to .env" -ForegroundColor Gray
Write-Host "  4. Run: python main_new.py" -ForegroundColor Gray
Write-Host "  5. Test: curl http://localhost:8000/health" -ForegroundColor Gray
Write-Host "`n" -ForegroundColor Cyan
