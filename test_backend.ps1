#!/bin/bash (Run in PowerShell or Bash - see instructions below)
# FREELANCE MARKETPLACE - COMPREHENSIVE BACKEND TEST SCRIPT
# ==========================================================================================================
# This script tests ALL critical flows end-to-end using HTTP requests
# 
# PREREQUISITES:
# - Backend running on http://localhost:8080
# - PowerShell (Windows) OR bash (Linux/Mac) with curl
#
# USAGE (PowerShell):
#   .\test_backend.ps1
#
# USAGE (bash):
#   bash test_backend.sh
#
# ============================================================================================================

echo "🚀 FREELANCE MARKETPLACE - COMPREHENSIVE TEST SUITE"
echo "=================================================="
echo ""
echo "Testing: Registration → Login → Project → Apply → Hire → Dashboard"
echo ""

# COLOR CODES (for bash)
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

test_endpoint() {
    local method=$1
    local endpoint=$2
    local data=$3
    local description=$4
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "TEST: $description"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Method: $method"
    echo "Endpoint: $endpoint"
    
    if [ -z "$data" ]; then
        echo "Making request..."
        curl -s -X $method "http://localhost:8080$endpoint" \
            -H "Content-Type: application/json" | python -m json.tool
    else
        echo "Data: $data"
        echo "Making request..."
        curl -s -X $method "http://localhost:8080$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data" | python -m json.tool
    fi
    
    echo ""
}

# ==========================================================================================================
# PHASE 1: HEALTH CHECK
# ==========================================================================================================

echo ""
echo "████ PHASE 1: HEALTH CHECK ████"
echo ""

test_endpoint "GET" "/api/health" "" "Health Check - Server Running?"

# ==========================================================================================================
# PHASE 2: USER REGISTRATION
# ==========================================================================================================

echo ""
echo "████ PHASE 2: USER REGISTRATION ████"
echo ""

# Register Freelancer 1
FREELANCER_1_DATA='{
  "username": "alice_dev",
  "email": "alice@example.com",
  "password": "password123",
  "skills": ["React", "Node.js", "MongoDB"],
  "hourlyRate": 50,
  "collegeName": "MIT",
  "studyYear": 2
}'

test_endpoint "POST" "/api/auth/register-freelancer" "$FREELANCER_1_DATA" "Register Freelancer #1 (Alice)"
FREELANCER_1_ID="freelancer_alice001"  # Save the ID (user would extract from response)

# Register Freelancer 2
FREELANCER_2_DATA='{
  "username": "bob_design",
  "email": "bob@example.com",
  "password": "password456",
  "skills": ["UI Design", "Figma", "CSS"],
  "hourlyRate": 45,
  "collegeName": "Stanford",
  "studyYear": 3
}'

test_endpoint "POST" "/api/auth/register-freelancer" "$FREELANCER_2_DATA" "Register Freelancer #2 (Bob)"
FREELANCER_2_ID="freelancer_bob001"

# Register Freelancer 3
FREELANCER_3_DATA='{
  "username": "charlie_python",
  "email": "charlie@example.com",
  "password": "password789",
  "skills": ["Python", "Django", "PostgreSQL"],
  "hourlyRate": 55,
  "collegeName": "Berkeley",
  "studyYear": 1
}'

test_endpoint "POST" "/api/auth/register-freelancer" "$FREELANCER_3_DATA" "Register Freelancer #3 (Charlie)"
FREELANCER_3_ID="freelancer_charlie001"

# Register Freelancer 4
FREELANCER_4_DATA='{
  "username": "diana_devops",
  "email": "diana@example.com",
  "password": "password000",
  "skills": ["Kubernetes", "Docker", "AWS"],
  "hourlyRate": 60,
  "collegeName": "Carnegie Mellon",
  "studyYear": 4
}'

test_endpoint "POST" "/api/auth/register-freelancer" "$FREELANCER_4_DATA" "Register Freelancer #4 (Diana)"
FREELANCER_4_ID="freelancer_diana001"

# Register Client
CLIENT_DATA='{
  "username": "john_client",
  "email": "john@clientcompany.com",
  "password": "clientpass123",
  "companyName": "Tech Innovations Inc"
}'

test_endpoint "POST" "/api/auth/register-client" "$CLIENT_DATA" "Register Client (John)"
CLIENT_ID="client_john001"

# ==========================================================================================================
# PHASE 3: USER LOGIN
# ==========================================================================================================

echo ""
echo "████ PHASE 3: USER LOGIN ████"
echo ""

LOGIN_DATA='{
  "email": "john@clientcompany.com",
  "password": "clientpass123"
}'

test_endpoint "POST" "/api/auth/login" "$LOGIN_DATA" "Client Login"

LOGIN_FREELANCER='{
  "email": "alice@example.com",
  "password": "password123"
}'

test_endpoint "POST" "/api/auth/login" "$LOGIN_FREELANCER" "Freelancer Login"

# ==========================================================================================================
# PHASE 4: PROJECT CREATION
# ==========================================================================================================

echo ""
echo "████ PHASE 4: PROJECT CREATION ████"
echo ""

PROJECT_DATA='{
  "clientId": "'$CLIENT_ID'",
  "title": "Build a React Dashboard",
  "description": "We need a responsive React dashboard with real-time data updates and charts",
  "budget": 2000,
  "requiredSkills": ["React", "JavaScript", "CSS"],
  "deadline": "2025-05-30",
  "difficultyLevel": 3
}'

test_endpoint "POST" "/api/projects" "$PROJECT_DATA" "Client creates Project #1"
PROJECT_1_ID="proj_react001"

PROJECT_2_DATA='{
  "clientId": "'$CLIENT_ID'",
  "title": "API Backend Development",
  "description": "Build a REST API backend with Django and PostgreSQL",
  "budget": 3000,
  "requiredSkills": ["Python", "Django", "PostgreSQL"],
  "deadline": "2025-06-15",
  "difficultyLevel": 4
}'

test_endpoint "POST" "/api/projects" "$PROJECT_2_DATA" "Client creates Project #2"
PROJECT_2_ID="proj_api001"

# ==========================================================================================================
# PHASE 5: GET ALL PROJECTS (PUBLIC BROWSE)
# ==========================================================================================================

echo ""
echo "████ PHASE 5: BROWSE PROJECTS ████"
echo ""

test_endpoint "GET" "/api/projects" "" "Browse all open projects"

# ==========================================================================================================
# PHASE 6: FREELANCERS APPLY TO PROJECTS
# ==========================================================================================================

echo ""
echo "████ PHASE 6: FREELANCER APPLICATIONS ████"
echo ""

# Alice applies to Project 1 (React Dashboard)
APPLY_1='{
  "freelancerId": "'$FREELANCER_1_ID'",
  "projectId": "'$PROJECT_1_ID'",
  "coverLetter": "I have 5 years of React experience and love working with dashboards. I am confident I can deliver this on time.",
  "bidAmount": 1800
}'

test_endpoint "POST" "/api/apply" "$APPLY_1" "Freelancer #1 (Alice) applies to Project #1"

# Bob applies to Project 1
APPLY_2='{
  "freelancerId": "'$FREELANCER_2_ID'",
  "projectId": "'$PROJECT_1_ID'",
  "coverLetter": "UI Designer with experience in responsive design. Can make it look fantastic!",
  "bidAmount": 1600
}'

test_endpoint "POST" "/api/apply" "$APPLY_2" "Freelancer #2 (Bob) applies to Project #1"

# Charlie applies to Project 2 (API Backend)
APPLY_3='{
  "freelancerId": "'$FREELANCER_3_ID'",
  "projectId": "'$PROJECT_2_ID'",
  "coverLetter": "Python and Django guru. Built 10+ production APIs. Ready to start immediately.",
  "bidAmount": 2800
}'

test_endpoint "POST" "/api/apply" "$APPLY_3" "Freelancer #3 (Charlie) applies to Project #2"

# Diana applies to Project 2
APPLY_4='{
  "freelancerId": "'$FREELANCER_4_ID'",
  "projectId": "'$PROJECT_2_ID'",
  "coverLetter": "DevOps expert. Can also help with deployment and infrastructure.",
  "bidAmount": 2500
}'

test_endpoint "POST" "/api/apply" "$APPLY_4" "Freelancer #4 (Diana) applies to Project #2"

# Alice also applies to Project 2 (for variety)
APPLY_5='{
  "freelancerId": "'$FREELANCER_1_ID'",
  "projectId": "'$PROJECT_2_ID'",
  "coverLetter": "Full-stack engineer. Can handle both frontend and backend needs.",
  "bidAmount": 3000
}'

test_endpoint "POST" "/api/apply" "$APPLY_5" "Freelancer #1 (Alice) applies to Project #2"

# ==========================================================================================================
# PHASE 7: CLIENT VIEWS APPLICATIONS
# ==========================================================================================================

echo ""
echo "████ PHASE 7: CLIENT VIEWS APPLICATIONS ████"
echo ""

test_endpoint "GET" "/api/applications?project_id=$PROJECT_1_ID" "" "Client views applications for Project #1"

test_endpoint "GET" "/api/applications?project_id=$PROJECT_2_ID" "" "Client views applications for Project #2"

# ==========================================================================================================
# PHASE 8: CLIENT GETS THEIR PROJECTS
# ==========================================================================================================

echo ""
echo "████ PHASE 8: CLIENT DASHBOARD - MY PROJECTS ████"
echo ""

test_endpoint "GET" "/api/projects/client/$CLIENT_ID" "" "Client views their own projects"

# ==========================================================================================================
# PHASE 9: CLIENT HIRES A FREELANCER
# ==========================================================================================================

echo ""
echo "████ PHASE 9: HIRING FREELANCER ████"
echo ""

# Assume Alice's application ID is "app_001" and her user ID is FREELANCER_1_ID
HIRE_1='{
  "clientId": "'$CLIENT_ID'",
  "applicationId": "app_001",
  "projectId": "'$PROJECT_1_ID'",
  "freelancerId": "'$FREELANCER_1_ID'"
}'

test_endpoint "POST" "/api/hire" "$HIRE_1" "Client hires Freelancer #1 (Alice) for Project #1"

# Hire freelancer for project 2
HIRE_2='{
  "clientId": "'$CLIENT_ID'",
  "applicationId": "app_003",
  "projectId": "'$PROJECT_2_ID'",
  "freelancerId": "'$FREELANCER_3_ID'"
}'

test_endpoint "POST" "/api/hire" "$HIRE_2" "Client hires Freelancer #3 (Charlie) for Project #2"

# ==========================================================================================================
# PHASE 10: FREELANCER VIEWS ASSIGNED PROJECTS
# ==========================================================================================================

echo ""
echo "████ PHASE 10: FREELANCER DASHBOARD ████"
echo ""

test_endpoint "GET" "/api/freelancer/projects?freelancer_id=$FREELANCER_1_ID" "" "Freelancer #1 views assigned AND applied projects"

test_endpoint "GET" "/api/freelancer/projects?freelancer_id=$FREELANCER_3_ID" "" "Freelancer #3 views assigned AND applied projects"

# ==========================================================================================================
# PHASE 11: DASHBOARD STATISTICS
# ==========================================================================================================

echo ""
echo "████ PHASE 11: DASHBOARD STATISTICS ████"
echo ""

test_endpoint "GET" "/api/stats/dashboard/$CLIENT_ID?role=client" "" "Client views dashboard statistics"

test_endpoint "GET" "/api/stats/dashboard/$FREELANCER_1_ID?role=freelancer" "" "Freelancer #1 views dashboard statistics"

# ==========================================================================================================
# SUMMARY
# ==========================================================================================================

echo ""
echo ""
echo "════════════════════════════════════════════════════════════"
echo "                   TEST SUMMARY"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "✅ If all responses came back with success: true"
echo "✅ Data should be persisted in freelance_market.db"
echo "✅ Each freelancer should have unique ID"
echo "✅ Projects should show assigned_freelancer_id after hiring"
echo "✅ Dashboard stats should update correctly"
echo ""
echo "🔍 KEY THINGS TO VERIFY:"
echo ""
echo "1. ✓ REGISTRATION: Each user gets unique ID (freelancer_*, client_*)"
echo "2. ✓ LOGIN: Returns token that can be used for auth"
echo "3. ✓ PROJECTS: Created and visible to all users"
echo "4. ✓ APPLY: Multiple freelancers can apply to same project"
echo "5. ✓ VIEW APPS: Client sees all applicants with full details"
echo "6. ✓ HIRE: Application status changes to 'accepted', others to 'rejected'"
echo "7. ✓ PROJECT UPDATE: Project status changes to 'in_progress' and assigned_freelancer_id is set"
echo "8. ✓ FREELANCER PROJECTS: Shows assigned (accepted) and applied (pending/rejected)"
echo "9. ✓ STATS: Show correct counts for applications, projects, earnings"
echo "10. ✓ PERSISTENCE: Data survives after server restart"
echo ""
echo "════════════════════════════════════════════════════════════"
echo ""
