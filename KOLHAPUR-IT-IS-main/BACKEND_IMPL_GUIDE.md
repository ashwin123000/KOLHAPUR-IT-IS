# FREELANCE MARKETPLACE - IMPLEMENTATION & DEBUGGING GUIDE

## 📋 OVERVIEW

This guide explains how to successfully build, deploy, and debug the COMPLETE freelancer marketplace backend and frontend.

---

## 🏗️ ARCHITECTURE

```
Frontend (React)                Frontend (React)
│                               │
└──→ API Gateway (Port 8080)    └──→ API Gateway (Port 8080)
     │
     ├─ Auth Service (Registration/Login)
     ├─ Project Service (CRUD)
     ├─ Application Service (Apply/Hire)
     ├─ Stats Service (Dashboard)
     │
     └─→ SQLite3 Database (freelance_market.db)
         ├─ users
         ├─ freelancers
         ├─ clients
         ├─ projects
         └─ applications
```

---

## 🔧 BACKEND BUILD & RUN

### Prerequisites
- Windows 10+ or Linux/Mac
- C++ compiler (MinGW on Windows, GCC on Linux)
- CMake 3.15+
- SQLite3 libs (usually included)

### Step 1: Navigate to Backend

```bash
cd freelance_platform/backend
```

### Step 2: Create Build Directory

```bash
mkdir -p build
cd build
```

### Step 3: Configure CMake

**On Windows (MinGW):**
```bash
cmake .. -G "MinGW Makefiles"
```

**On Windows (Visual Studio):**
```bash
cmake .. -G "Visual Studio 17 2022"
```

**On Linux:**
```bash
cmake ..
```

### Step 4: Build

```bash
cmake --build . --config Release
```

### Step 5: Run

**Windows:**
```bash
.\FreelancePlatform.exe
```

**Linux/Mac:**
```bash
./FreelancePlatform
```

### Expected Output

```
████████████████████████████████████████████████████
██  FREELANCE MARKETPLACE - BACKEND API  (PRODUCTION)  ██
████████████████████████████████████████████████████
[DB] Attempting to open: freelance_market.db
[DB] ✓ Database opened successfully: freelance_market.db
[DB] Initializing schema...
[DB] ✓ Schema initialized
[DB] ✓ Database ready for operations

[Server] Starting on http://0.0.0.0:8080
[INFO] All endpoints ready. Press Ctrl+C to stop.
```

**If you see this: ✅ Backend is Working!**

---

## 🗄️ DATABASE PERSISTENCE

### Database Location

The database file `freelance_market.db` is created in the **current working directory** when the backend starts.

**Typical locations:**
- Windows: `C:\path\to\backend\build\freelance_market.db` (if you run from build/)
- Linux: `./freelance_market.db` (relative to where you ran the exe)

### Verify Database Exists

**Windows:**
```bash
dir freelance_market.db
```

**Linux:**
```bash
ls -la freelance_market.db
```

### Inspect Database

```bash
# List all tables
sqlite3 freelance_market.db ".tables"

# Show schema
sqlite3 freelance_market.db ".schema"

# Query users
sqlite3 freelance_market.db "SELECT id, username, email, role FROM users;"

# Query projects
sqlite3 freelance_market.db "SELECT id, client_id, title, status FROM projects;"

# Query applications
sqlite3 freelance_market.db "SELECT id, freelancer_id, project_id, status FROM applications;"
```

### ⚠️ Database Doesn't Persist After Restart?

**Causes:**
1. Database file is not being created in executable directory
2. File permissions issue prevent write
3. Different working directory on second run

**Solution:**
```cpp
// Make sure CWD is correct when running:
cd backend/build  // Run from same dir
.\FreelancePlatform.exe
```

---

## 📡 API ENDPOINTS

### Authentication

#### Register Freelancer
```bash
POST /api/auth/register-freelancer
Content-Type: application/json

{
  "username": "alice_dev",
  "email": "alice@example.com",
  "password": "password123",
  "skills": ["React", "Node.js"],
  "hourlyRate": 50,
  "collegeName": "MIT",
  "studyYear": 2
}

Response:
{
  "success": true,
  "data": {
    "userId": "freelancer_XXXXXXXX",
    "token": "freelancer_XXXXXXXX:freelancer:XXXXXXXX",
    "role": "freelancer"
  }
}
```

#### Register Client
```bash
POST /api/auth/register-client
Content-Type: application/json

{
  "username": "john_boss",
  "email": "john@company.com",
  "password": "pass123",
  "companyName": "Tech Innovations Inc"
}

Response:
{
  "success": true,
  "data": {
    "userId": "client_XXXXXXXX",
    "token": "client_XXXXXXXX:client:XXXXXXXX",
    "role": "client"
  }
}
```

#### Login
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@company.com",
  "password": "pass123"
}

Response:
{
  "success": true,
  "data": {
    "userId": "client_XXXXXXXX",
    "token": "...",
    "role": "client"
  }
}
```

### Projects

#### Create Project
```bash
POST /api/projects
Content-Type: application/json
Authorization: Bearer <token>

{
  "clientId": "client_XXXXXXXX",
  "title": "Build React Dashboard",
  "description": "Responsive dashboard with charts",
  "budget": 2000,
  "requiredSkills": ["React", "JavaScript"],
  "deadline": "2025-05-30",
  "difficultyLevel": 3
}

Response:
{
  "success": true,
  "data": {
    "projectId": "proj_XXXXXXXX",
    "title": "Build React Dashboard",
    "status": "open",
    "budget": 2000,
    "createdAt": "2025-03-26 15:30:45"
  }
}
```

#### Get All Projects
```bash
GET /api/projects

Response:
{
  "success": true,
  "data": [
    {
      "projectId": "proj_001",
      "title": "Build React Dashboard",
      "clientId": "client_001",
      "budget": 2000,
      "status": "open",
      "requiredSkills": "React,JavaScript",
      "assignedFreelancerId": null
    },
    ...
  ]
}
```

#### Get Client's Projects
```bash
GET /api/projects/client/<clientId>

Response:
{
  "success": true,
  "data": [
    {
      "projectId": "proj_001",
      "title": "Build React Dashboard",
      "budget": 2000,
      "status": "open"
    }
  ]
}
```

###Applications

#### Apply to Project
```bash
POST /api/apply
Content-Type: application/json

{
  "freelancerId": "freelancer_XXXXXXXX",
  "projectId": "proj_XXXXXXXX",
  "coverLetter": "I have 5 years React experience...",
  "bidAmount": 1800
}

Response:
{
  "success": true,
  "data": {
    "applicationId": "app_XXXXXXXX",
    "projectId": "proj_XXXXXXXX",
    "status": "pending",
    "createdAt": "2025-03-26 15:35:22"
  }
}
```

#### Get Applications for Project
```bash
GET /api/applications?project_id=<projectId>

Response:
{
  "success": true,
  "data": [
    {
      "applicationId": "app_001",
      "freelancerId": "freelancer_001",
      "freelancerName": "alice_dev",
      "status": "pending",
      "bidAmount": 1800,
      "skills": "React,Node.js",
      "reliabilityScore": 100,
      "hourlyRate": 50
    },
    {
      "applicationId": "app_002",
      "freelancerId": "freelancer_002",
      "freelancerName": "bob_design",
      "status": "pending",
      "bidAmount": 1600,
      "skills": "UI Design,CSS",
      "reliabilityScore": 95,
      "hourlyRate": 45
    }
  ]
}
```

#### Hire Freelancer
```bash
POST /api/hire
Content-Type: application/json

{
  "clientId": "client_XXXXXXXX",
  "applicationId": "app_XXXXXXXX",
  "projectId": "proj_XXXXXXXX",
  "freelancerId": "freelancer_XXXXXXXX"
}

Response:
{
  "success": true,
  "message": "Freelancer hired successfully"
}

Side Effects:
- Application status changes to "accepted"
- Other applications for same project change to "rejected"
- Project.assigned_freelancer_id → <freelancerId>
- Project.status → "in_progress"
```

### Freelancer Views

#### Get Freelancer Projects
```bash
GET /api/freelancer/projects?freelancer_id=<freelancerId>

Response:
{
  "success": true,
  "assigned": [
    {
      "projectId": "proj_001",
      "title": "Build React Dashboard",
      "status": "in_progress",
      "applicationStatus": "accepted",
      "clientName": "John"
    }
  ],
  "applied": [
    {
      "projectId": "proj_002",
      "title": "API Development",
      "status": "open",
      "applicationStatus": "pending",
      "clientName": "Jane"
    }
  ]
}
```

### Dashboard Stats

#### Get Dashboard
```bash
GET /api/stats/dashboard/<userId>?role=<role>

# For Freelancer
GET /api/stats/dashboard/freelancer_001?role=freelancer

Response:
{
  "success": true,
  "data": {
    "applicationsSubmitted": 5,
    "activeProjects": 2,
    "completedProjects": 12,
    "totalEarnings": 45000
  }
}

# For Client
GET /api/stats/dashboard/client_001?role=client

Response:
{
  "success": true,
  "data": {
    "totalProjects": 10,
    "openProjects": 2,
    "applicationsReceived": 47,
    "totalSpent": 95000
  }
}
```

---

## 🧪 TESTING

### Quick Test with PowerShell

```bash
# Test Health
Invoke-WebRequest -Uri "http://localhost:8080/api/health"

# Register
$body = @{
    username = "testuser"
    email = "test@example.com"
    password = "test123"
    skills = @("React", "Node")
    hourlyRate = 50
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:8080/api/auth/register-freelancer" `
    -Method POST `
    -Body $body `
    -ContentType "application/json"
```

### Use Test Script

```bash
# From freelance_platform root
.\test_backend.ps1
```

This will run through all 11 phases of testing.

---

## ✅ CRITICAL FUNCTIONALITY CHECKLIST

### Registration & Persistence
- [ ] Freelancer can register with unique username/email
- [ ] Client can register with unique username/email
- [ ] User details saved in `users` table
- [ ] Freelancer profile saved in `freelancers` table
- [ ] Client profile saved in `clients` table
- [ ] Password is hashed, not plaintext
- [ ] Data persists after server restart

### Login & Authentication
- [ ] User can login with email and password
- [ ] Invalid credentials rejected
- [ ] Token returned on successful login
- [ ] Token format: `userId:role:signature`

### Project Management
- [ ] Client can create project
- [ ] Project details saved with `status = 'open'`
- [ ] All open projects visible to freelancers
- [ ] Client can view their own projects
- [ ] Project shows correct required_skills, budget, deadline

### Freelancer Applications
- [ ] Freelancer can apply to project
- [ ] Multiple freelancers can apply to same project (UNIQUE constraint on project_id, freelancer_id)
- [ ] Application saved with `status = 'pending'`
- [ ] Same freelancer CANNOT apply twice to same project
- [ ] Application includes bid_amount and cover_letter

### Client Views Applications
- [ ] Client can see all applications for their project
- [ ] Shows freelancer name, email, skills, rating
- [ ] Shows bid amount and cover letter
- [ ] Shows date of application
- [ ] Applications sorted by creation date (DESC)

### Hiring & Assignment
- [ ] Client can accept one application
- [ ] Accepted application status → "accepted"
- [ ] All other applications → "rejected"
- [ ] Project.assigned_freelancer_id → selected freelancer_id
- [ ] Project.status → "in_progress"

### Freelancer Dashboard
- [ ] Freelancer sees "assigned" projects (where they were hired)
- [ ] Freelancer sees "applied" projects (where they have pending/rejected applications)
- [ ] Shows correct applicationStatus for each
- [ ] Counts are accurate

### Statistics
- [ ] Client dashboard shows: totalProjects, openProjects, applicationsReceived
- [ ] Freelancer dashboard shows: applicationsSubmitted, activeProjects, completedProjects, totalEarnings

### Data Persistence
- [ ] Server restart does NOT lose any data
- [ ] Database file `freelance_market.db` remains intact
- [ ] All tables and relationships maintained

---

## 🐛 DEBUGGING

### Backend Won't Start

**Check 1: Port 8080 in use?**
```bash
# Windows
netstat -ano | findstr :8080

# Linux
lsof -i :8080

#Kill process
taskkill /PID <PID> /F
```

**Check 2: Database locked?**
- Delete `freelance_market.db` and restart
- If permission denied, check file permissions

**Check 3: Build failed?**
```bash
cd backend
rm -rf build
mkdir build
cd build
cmake ..
cmake --build .
```

### Endpoints Returning 404

**Check 1: Backend running?**
```bash
curl http://localhost:8080/api/health
```

**Check 2: Correct case?**
- `/api/health` ✓
- `/API/health` ✗
- `/api/projects` ✓
- `/api/Projects` ✗

**Check 3: Correct HTTP method?**
- POST for create/write
- GET for read
- See API docs above

### Registration Fails

**Check 1: Email already exists?**
- Use unique email each test
- Or delete database and restart

**Check 2: Missing fields?**
- username, email, password required for both
- For freelancer: skills, hourlyRate optional
- For client: companyName optional

**Check 3: JSON syntax?**
- Use double quotes: `{"username": "test"}`
- Not single quotes: `{'username': 'test'}`

### Application/Hiring Fails

**Check 1: projectId correct?**
```bash
GET /api/projects
# Copy projectId from response
```

**Check 2: freelancerId correct?**
- From registration response or login
- Format: `freelancer_XXXXXXXX` or `client_XXXXXXXX`

**Check 3: Project not open?**
- Project status must be "open" to apply
- Can't apply to "completed" or "cancelled" projects

**Check 4: Already applied?**
- UNIQUE constraint: (project_id, freelancer_id)
- Same freelancer can't apply twice to same project

### Database Shows No Data

**Check 1: Was data actually inserted?**
```bash
sqlite3 freelance_market.db "SELECT COUNT(*) FROM users;"
```

**Check 2: Database file location?**
```bash
# Ensure running from correct directory
Where-Object freelance_market.db
# or
python -c "import os; print(os.path.abspath('.'))"
```

**Check 3: Transaction failed silently?**
- Check API response for errors
- Look at console output for [DB ERROR] messages

---

## 📊 EXPECTED DATABASE STATE AFTER TESTS

```
Users table:
├─ 4 Freelancers (alice, bob, charlie, diana)
└─ 1 Client (john)

Projects table:
├─ Project 1: "React Dashboard" (status: in_progress, assigned_freelancer_id: alice)
└─ Project 2: "API Backend" (status: in_progress, assigned_freelancer_id: charlie)

Applications table:
├─ alice → project1 (status: accepted)
├─ bob → project1 (status: rejected)
├─ charlie → project2 (status: accepted)
├─ diana → project2 (status: rejected)
└─ alice → project2 (status: rejected)
```

---

## 🚀 NEXT STEPS

1. **Build backend** using instructions above
2. **Run backend** on port 8080
3. **Run test script** to verify all flows
4. **Connect frontend** to backend (see frontend README)
5. **Deploy to production** (Docker/Cloud recommended)

---

## 📞 SUPPORT

If you encounter issues:

1. Check database: `sqlite3 freelance_market.db ".dump"`
2. Check console output for error messages
3. Test endpoints with correct parameters
4. Verify database file is created
5. Try deleting database and restarting (wipes all test data)

