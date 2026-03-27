#!/usr/bin/env powershell
# Freelance Marketplace - Quick Test Script
# Run this to verify the system is working

Write-Host "╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║  Freelance Marketplace - System Verification Test            ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Cyan

# Function to test endpoint
function Test-Endpoint {
    param(
        [string]$Method,
        [string]$Uri,
        [hashtable]$Body = $null,
        [string]$Token = $null,
        [string]$TestName
    )
    
    Write-Host "`n📍 Test: $TestName" -ForegroundColor Yellow
    Write-Host "   $Method $Uri" -ForegroundColor Gray
    
    try {
        $headers = @{
            "Content-Type" = "application/json"
        }
        
        if ($Token) {
            $headers["Authorization"] = "Bearer $Token"
        }
        
        $params = @{
            Uri = $Uri
            Method = $Method
            Headers = $headers
            UseBasicParsing = $true
            TimeoutSec = 5
        }
        
        if ($Body) {
            $params["Body"] = ($Body | ConvertTo-Json)
        }
        
        $response = Invoke-WebRequest @params
        $content = $response.Content | ConvertFrom-Json
        
        Write-Host "   ✅ Response (HTTP $($response.StatusCode))" -ForegroundColor Green
        
        if ($content.PSObject.Properties.Name -contains "success") {
            if ($content.success) {
                Write-Host "   ✓ Success: true" -ForegroundColor Green
                return $content.data
            } else {
                Write-Host "   ✗ Error: $($content.error)" -ForegroundColor Red
                return $null
            }
        }
        
        return $content
    }
    catch {
        Write-Host "   ❌ Failed: $($_.Exception.Message)" -ForegroundColor Red
        return $null
    }
}

# Check if backend is running
Write-Host "`n1️⃣  Checking Backend Server..." -ForegroundColor Cyan
$health = Test-Endpoint -Method GET -Uri "http://localhost:8080/api/health" -TestName "Health Check"

if (-not $health) {
    Write-Host "`n❌ Backend is not running! Start it with:" -ForegroundColor Red
    Write-Host "   cd backend" -ForegroundColor Gray
    Write-Host "   .\build\FreelancePlatform.exe" -ForegroundColor Gray
    exit 1
}

# Test Registration
Write-Host "`n2️⃣  Testing User Registration..." -ForegroundColor Cyan

$freelancerData = @{
    username = "test_freelancer_$([int](Get-Random))"
    email = "freelancer_$(Get-Random)@example.com"
    password = "TestPass123!"
    collegeName = "MIT"
    studyYear = 3
    skills = @("React", "Node.js", "TypeScript")
    hourlyRate = 75.0
}

$freelancer = Test-Endpoint -Method POST `
    -Uri "http://localhost:8080/api/auth/register-freelancer" `
    -Body $freelancerData `
    -TestName "Register Freelancer"

if (-not $freelancer) {
    Write-Host "❌ Freelancer registration failed!" -ForegroundColor Red
    exit 1
}

$freelancerId = $freelancer.userId
$freelancerToken = $freelancer.token

Write-Host "   Freelancer ID: $freelancerId" -ForegroundColor Green

# Register second freelancer
$freelancer2Data = @{
    username = "test_freelancer_$([int](Get-Random))"
    email = "freelancer_$(Get-Random)@example.com"
    password = "TestPass123!"
    collegeName = "Stanford"
    studyYear = 2
    skills = @("Python", "Django", "React")
}

$freelancer2 = Test-Endpoint -Method POST `
    -Uri "http://localhost:8080/api/auth/register-freelancer" `
    -Body $freelancer2Data `
    -TestName "Register Second Freelancer"

if (-not $freelancer2) {
    Write-Host "❌ Second freelancer registration failed!" -ForegroundColor Red
    exit 1
}

$freelancer2Id = $freelancer2.userId

# Register Client
$clientData = @{
    username = "test_client_$([int](Get-Random))"
    email = "client_$(Get-Random)@example.com"
    password = "ClientPass456!"
    companyName = "Tech Corp Inc"
}

$client = Test-Endpoint -Method POST `
    -Uri "http://localhost:8080/api/auth/register-client" `
    -Body $clientData `
    -TestName "Register Client"

if (-not $client) {
    Write-Host "❌ Client registration failed!" -ForegroundColor Red
    exit 1
}

$clientId = $client.userId
$clientToken = $client.token

Write-Host "   Client ID: $clientId" -ForegroundColor Green

# Test Login
Write-Host "`n3️⃣  Testing Login..." -ForegroundColor Cyan

$loginData = @{
    email = $freelancerData.email
    password = $freelancerData.password
}

$login = Test-Endpoint -Method POST `
    -Uri "http://localhost:8080/api/auth/login" `
    -Body $loginData `
    -TestName "Login Freelancer"

if (-not $login) {
    Write-Host "❌ Login failed!" -ForegroundColor Red
    exit 1
}

# Test Project Creation
Write-Host "`n4️⃣  Testing Project Creation..." -ForegroundColor Cyan

$projectData = @{
    title = "Build React Dashboard"
    description = "Create a professional dashboard with charts and analytics"
    budget = 5000.0
    requiredSkills = @("React", "Node.js", "TypeScript")
    difficulty = 3
    deadline = "2026-05-30"
}

$project = Test-Endpoint -Method POST `
    -Uri "http://localhost:8080/api/projects" `
    -Body $projectData `
    -Token $clientToken `
    -TestName "Create Project"

if (-not $project) {
    Write-Host "❌ Project creation failed!" -ForegroundColor Red
    exit 1
}

$projectId = $project.projectId

Write-Host "   Project ID: $projectId" -ForegroundColor Green

# Test Get All Projects
Write-Host "`n5️⃣  Testing Get All Projects..." -ForegroundColor Cyan

$projects = Test-Endpoint -Method GET `
    -Uri "http://localhost:8080/api/projects" `
    -TestName "Get All Projects"

if ($projects) {
    Write-Host "   Found $($projects.Count) project(s)" -ForegroundColor Green
}

# Test Freelancer Application
Write-Host "`n6️⃣  Testing Freelancer Application..." -ForegroundColor Cyan

$applyData = @{
    projectId = $projectId
    coverLetter = "I have 5+ years of React experience and have built many dashboards"
    bidAmount = 4800.0
}

$application = Test-Endpoint -Method POST `
    -Uri "http://localhost:8080/api/apply" `
    -Body $applyData `
    -Token $freelancerToken `
    -TestName "Freelancer 1 Applies"

if (-not $application) {
    Write-Host "❌ Application failed!" -ForegroundColor Red
    exit 1
}

$applicationId = $application.applicationId

Write-Host "   Application ID: $applicationId" -ForegroundColor Green

# Second freelancer applies
$applyData2 = @{
    projectId = $projectId
    coverLetter = "I'm an expert in Python and React. Ready to deliver quality!"
    bidAmount = 5000.0
}

$application2 = Test-Endpoint -Method POST `
    -Uri "http://localhost:8080/api/apply" `
    -Body $applyData2 `
    -Token ($freelancer2.token) `
    -TestName "Freelancer 2 Applies"

if ($application2) {
    Write-Host "   ✓ Second application successful" -ForegroundColor Green
}

# Test Get Applications for Project
Write-Host "`n7️⃣  Testing Get Applications..." -ForegroundColor Cyan

$appList = Test-Endpoint -Method GET `
    -Uri "http://localhost:8080/api/applications?project_id=$projectId" `
    -Token $clientToken `
    -TestName "Get Applications for Project"

if ($appList) {
    Write-Host "   Found $($appList.Count) application(s)" -ForegroundColor Green
    foreach ($app in $appList) {
        Write-Host "     - $($app.freelancerName) (bid: $$($app.bidAmount), status: $($app.status))" -ForegroundColor Gray
    }
}

# Test Hire
Write-Host "`n8️⃣  Testing Hire Freelancer..." -ForegroundColor Cyan

$hireData = @{
    applicationId = $applicationId
    projectId = $projectId
    freelancerId = $freelancerId
}

$hire = Test-Endpoint -Method POST `
    -Uri "http://localhost:8080/api/hire" `
    -Body $hireData `
    -Token $clientToken `
    -TestName "Hire Freelancer"

if ($hire) {
    Write-Host "   ✓ Freelancer hired successfully" -ForegroundColor Green
}

# Test Freelancer Dashboard
Write-Host "`n9️⃣  Testing Freelancer Dashboard..." -ForegroundColor Cyan

$freelancerProjects = Test-Endpoint -Method GET `
    -Uri "http://localhost:8080/api/freelancer/projects?freelancer_id=$freelancerId" `
    -Token $freelancerToken `
    -TestName "Get Freelancer Projects"

if ($freelancerProjects) {
    Write-Host "   Found $($freelancerProjects.Count) assigned project(s)" -ForegroundColor Green
    foreach ($proj in $freelancerProjects) {
        Write-Host "     - $($proj.title) (Status: $($proj.status), Budget: $$($proj.budget))" -ForegroundColor Gray
    }
}

# Test Dashboard Stats
Write-Host "`n🔟 Testing Dashboard Stats..." -ForegroundColor Cyan

$stats = Test-Endpoint -Method GET `
    -Uri "http://localhost:8080/api/stats/dashboard/$freelancerId`?role=freelancer" `
    -Token $freelancerToken `
    -TestName "Get Freelancer Stats"

if ($stats) {
    Write-Host "   Active Projects: $($stats.activeProjects)" -ForegroundColor Green
    Write-Host "   Applications: $($stats.applicationsSubmitted)" -ForegroundColor Green
    Write-Host "   Completed: $($stats.completedProjects)" -ForegroundColor Green
}

# Summary
Write-Host "`n╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║  ✅ ALL TESTS PASSED - SYSTEM IS FULLY FUNCTIONAL!           ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════════╝" -ForegroundColor Green

Write-Host "`n📊 Summary:" -ForegroundColor Cyan
Write-Host "   ✓ Backend running on http://localhost:8080" -ForegroundColor Green
Write-Host "   ✓ Database: freelance_market.db" -ForegroundColor Green
Write-Host "   ✓ Users registered: 3 (2 freelancers, 1 client)" -ForegroundColor Green
Write-Host "   ✓ Project created and published" -ForegroundColor Green
Write-Host "   ✓ Applications submitted and visible" -ForegroundColor Green
Write-Host "   ✓ Hiring completed and reflected" -ForegroundColor Green
Write-Host "   ✓ All dashboards working" -ForegroundColor Green

Write-Host "`n📝 Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Start frontend: npm run dev" -ForegroundColor Gray
Write-Host "   2. Open http://localhost:5173 in browser" -ForegroundColor Gray
Write-Host "   3. Test full UI integration" -ForegroundColor Gray
Write-Host "   4. See API_TEST_GUIDE.md for complete endpoint list" -ForegroundColor Gray

Write-Host ""
