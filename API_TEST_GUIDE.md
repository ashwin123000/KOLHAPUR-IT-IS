# Freelance Marketplace - Complete API Test Guide

## Server Status
- **Backend**: Running on `http://localhost:8080` ✅
- **Frontend**: Built at `frontend/dist`
- **Database**: SQLite `freelance_market.db` (persistent file)

---

## 1. HEALTH CHECK

### Request
```
GET http://localhost:8080/api/health
```

### Expected Response (200 OK)
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "database": "connected",
    "timestamp": "2026-03-26 10:30:45"
  }
}
```

---

## 2. REGISTRATION FLOW

### 2.1 Register Freelancer

**Request**
```
POST http://localhost:8080/api/auth/register-freelancer
Content-Type: application/json

{
  "username": "john_dev",
  "email": "john@example.com",
  "password": "SecurePass123!",
  "collegeName": "MIT",
  "studyYear": 3,
  "skills": ["React", "TypeScript", "Node.js"],
  "hourlyRate": 75.0
}
```

**Expected Response (201 Created)**
```json
{
  "success": true,
  "data": {
    "userId": "freelancer_456789",
    "username": "john_dev",
    "email": "john@example.com",
    "role": "freelancer",
    "token": "freelancer_456789:freelancer:a1b2c3d4"
  }
}
```

---

### 2.2 Register Client

**Request**
```
POST http://localhost:8080/api/auth/register-client
Content-Type: application/json

{
  "username": "acme_corp",
  "email": "hiring@acmecorp.com",
  "password": "ClientPass456!",
  "companyName": "ACME Corporation"
}
```

**Expected Response (201 Created)**
```json
{
  "success": true,
  "data": {
    "userId": "client_123456",
    "username": "acme_corp",
    "email": "hiring@acmecorp.com",
    "role": "client",
    "companyName": "ACME Corporation",
    "token": "client_123456:client:x9y8z7w6"
  }
}
```

---

## 3. LOGIN FLOW

### Request
```
POST http://localhost:8080/api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "SecurePass123!",
  "role": "freelancer"
}
```

### Expected Response (200 OK)
```json
{
  "success": true,
  "data": {
    "userId": "freelancer_456789",
    "username": "john_dev",
    "email": "john@example.com",
    "role": "freelancer",
    "token": "freelancer_456789:freelancer:a1b2c3d4"
  }
}
```

---

## 4. PROJECT CREATION (Client)

### Request
```
POST http://localhost:8080/api/projects
Content-Type: application/json
Authorization: Bearer client_123456:client:x9y8z7w6

{
  "title": "Build React Dashboard",
  "description": "Create a professional dashboard with charts and analytics",
  "budget": 5000.0,
  "requiredSkills": ["React", "TypeScript", "Node.js"],
  "difficulty": 3,
  "deadline": "2026-04-30"
}
```

### Expected Response (201 Created)
```json
{
  "success": true,
  "data": {
    "projectId": "proj_789012",
    "title": "Build React Dashboard",
    "budget": 5000.0,
    "status": "open",
    "createdAt": "2026-03-26 10:35:00"
  }
}
```

---

## 5. FREELANCER APPLICATION (CRITICAL TEST)

### Request
```
POST http://localhost:8080/api/apply
Content-Type: application/json
Authorization: Bearer freelancer_456789:freelancer:a1b2c3d4

{
  "projectId": "proj_789012",
  "coverLetter": "I have 5+ years of React experience and have built many dashboards",
  "bidAmount": 4800.0
}
```

### Expected Response (201 Created)
```json
{
  "success": true,
  "data": {
    "applicationId": "app_345678",
    "projectId": "proj_789012",
    "freelancerId": "freelancer_456789",
    "status": "pending",
    "createdAt": "2026-03-26 10:40:00"
  }
}
```

---

## 6. GET PROJECT APPLICATIONS (Client View)

### Request
```
GET http://localhost:8080/api/applications?project_id=proj_789012
Authorization: Bearer client_123456:client:x9y8z7w6
```

### Expected Response (200 OK)
```json
{
  "success": true,
  "data": [
    {
      "applicationId": "app_345678",
      "projectId": "proj_789012",
      "freelancerId": "freelancer_456789",
      "status": "pending",
      "coverLetter": "I have 5+ years of React experience...",
      "bidAmount": 4800.0,
      "createdAt": "2026-03-26 10:40:00",
      "freelancerName": "john_dev",
      "freelancerEmail": "john@example.com",
      "reliabilityScore": 100.0,
      "averageRating": 4.8,
      "skills": "React,TypeScript,Node.js",
      "hourlyRate": 75.0,
      "totalEarnings": 0.0
    }
  ]
}
```

---

## 7. HIRE FREELANCER (Client)

### Request
```
POST http://localhost:8080/api/hire
Content-Type: application/json
Authorization: Bearer client_123456:client:x9y8z7w6

{
  "applicationId": "app_345678",
  "projectId": "proj_789012",
  "freelancerId": "freelancer_456789"
}
```

### Expected Response (200 OK)
```json
{
  "success": true,
  "message": "Freelancer hired successfully"
}
```

**Changes Made:**
- Application status: `pending` → `accepted`
- All other applications for this project: `pending` → `rejected`
- Project status: `open` → `in_progress`
- Project `assigned_freelancer_id`: updated

---

## 8. GET FREELANCER'S ASSIGNED PROJECTS

### Request
```
GET http://localhost:8080/api/freelancer/projects?freelancer_id=freelancer_456789
Authorization: Bearer freelancer_456789:freelancer:a1b2c3d4
```

### Expected Response (200 OK)
```json
{
  "success": true,
  "data": [
    {
      "projectId": "proj_789012",
      "title": "Build React Dashboard",
      "description": "Create a professional dashboard...",
      "budget": 5000.0,
      "status": "in_progress",
      "assignedFreelancerId": "freelancer_456789",
      "requiredSkills": "React,TypeScript,Node.js",
      "deadline": "2026-04-30",
      "createdAt": "2026-03-26 10:35:00"
    }
  ]
}
```

---

## 9. GET DASHBOARD STATS

### Request (Freelancer)
```
GET http://localhost:8080/api/stats/dashboard/freelancer_456789?role=freelancer
Authorization: Bearer freelancer_456789:freelancer:a1b2c3d4
```

### Expected Response (200 OK)
```json
{
  "success": true,
  "data": {
    "applicationsSubmitted": 1,
    "activeProjects": 1,
    "completedProjects": 0,
    "totalEarnings": 0.0
  }
}
```

### Request (Client)
```
GET http://localhost:8080/api/stats/dashboard/client_123456?role=client
Authorization: Bearer client_123456:client:x9y8z7w6
```

### Expected Response (200 OK)
```json
{
  "success": true,
  "data": {
    "totalProjects": 1,
    "openProjects": 0,
    "applicationsReceived": 1
  }
}
```

---

## 10. ERROR SCENARIOS

### Missing Required Field
```
POST http://localhost:8080/api/auth/register-freelancer
{
  "username": "incomplete",
  "email": "test@example.com"
  // missing password
}
```

**Response (400 Bad Request)**
```json
{
  "success": false,
  "error": "Missing required fields: username, email, password"
}
```

### Duplicate Email
```
POST http://localhost:8080/api/auth/register-client
{
  "username": "another_user",
  "email": "john@example.com",  // Already registered
  "password": "Pass123!"
}
```

**Response (400 Bad Request)**
```json
{
  "success": false,
  "error": "Email already registered"
}
```

### Invalid Credentials
```
POST http://localhost:8080/api/auth/login
{
  "email": "john@example.com",
  "password": "WrongPassword"
}
```

**Response (401 Unauthorized)**
```json
{
  "success": false,
  "error": "Invalid credentials"
}
```

---

## DATABASE PERSISTENCE TEST

1. **Register a user**: `/api/auth/register-freelancer`
2. **Stop backend**: `taskkill /PID 16832 /F` (or Ctrl+C)
3. **Start backend again**: `.\build\FreelancePlatform.exe`
4. **Login same user**: Should succeed and retrieve data from disk

**Database File**: `freelance_market.db` (in backend directory)

---

## COMPLETE END-TO-END FLOW TEST

```
Step 1: Register 5 freelancers
  POST /api/auth/register-freelancer (alice@example.com)
  POST /api/auth/register-freelancer (bob@example.com)
  POST /api/auth/register-freelancer (carol@example.com)
  POST /api/auth/register-freelancer (david@example.com)
  POST /api/auth/register-freelancer (eve@example.com)

Step 2: Register client
  POST /api/auth/register-client (client@example.com)

Step 3: Create project
  POST /api/projects (with clientId from Step 2)

Step 4: All 5 freelancers apply
  POST /api/apply (freelancer=alice, bidAmount=4500)
  POST /api/apply (freelancer=bob, bidAmount=4800)
  POST /api/apply (freelancer=carol, bidAmount=5000)  
  POST /api/apply (freelancer=david, bidAmount=4200)
  POST /api/apply (freelancer=eve, bidAmount=4900)

Step 5: Client views all applications
  GET /api/applications?project_id=proj_xxx
  ✓ Should see 5 applicants

Step 6: Client hires alice
  POST /api/hire (applicationId=app_alice, projectId=proj_xxx, freelancerId=freelancer_alice)

Step 7: Verify other applications rejected
  GET /api/applications?project_id=proj_xxx
  ✓ alice status = "accepted"
  ✓ bob, carol, david, eve status = "rejected"

Step 8: Alice views assigned projects
  GET /api/freelancer/projects?freelancer_id=freelancer_alice
  ✓ Should see the project with status="in_progress"

Step 9: Verify data persistence
  Kill backend and restart
  ✓ All data still exists in freelance_market.db
```

---

## IMPORTANT NOTES

- **Token Format**: `userId:role:signature`
- **Database**: SQLite persistent file `freelance_market.db`
- **All endpoints**: Return JSON with `{"success": true/false, ...}`
- **CORS**: Enabled for all origins
- **Status Codes**:
  - 200: Success
  - 201: Created
  - 400: Bad Request
  - 401: Unauthorized
  - 404: Not Found
  - 500: Server Error
