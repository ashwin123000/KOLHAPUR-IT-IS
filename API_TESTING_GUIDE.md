# API Testing Guide — AI Hiring OS Phases 2-5

## Quick Start

### 1. Start the Backend
```bash
cd backend
uvicorn main_new:app --reload --host 0.0.0.0 --port 8000
```

### 2. Access Swagger UI
Open browser: **http://localhost:8000/api/docs**

---

## Complete Testing Workflow

### Phase 1: Authentication

#### 1. Register User
```
POST /api/v1/auth/register
{
  "email": "candidate@test.com",
  "password": "SecurePass123!",
  "full_name": "John Developer",
  "role": "candidate"
}
```
**Response**: `{ "id": "uuid", "email": "...", "access_token": "..." }`

#### 2. Login
```
POST /api/v1/auth/login
{
  "email": "candidate@test.com",
  "password": "SecurePass123!"
}
```
**Response**: `{ "access_token": "...", "refresh_token": "...", "expires_in": 900 }`

#### 3. Get Current User
```
GET /api/v1/auth/me
Header: Authorization: Bearer {access_token}
```
**Response**: `{ "id": "...", "email": "...", "full_name": "...", "role": "..." }`

---

### Phase 2: Resume Parsing

#### 1. Upload Resume
```
POST /api/v1/resumes/upload
Header: Authorization: Bearer {access_token}
Body: multipart/form-data
  file: resume.pdf (Max 10MB)
```
**Response**:
```json
{
  "id": "resume_uuid",
  "status": "pending",
  "message": "Resume uploaded successfully. Processing in background..."
}
```

#### 2. Check Parsing Status
```
GET /api/v1/resumes/{resume_id}/status
Header: Authorization: Bearer {access_token}
```
**Response** (while processing):
```json
{
  "id": "resume_uuid",
  "status": "processing",
  "error": null
}
```

**Response** (when complete):
```json
{
  "id": "resume_uuid",
  "status": "done",
  "error": null
}
```

#### 3. Get Parsed Resume Details
```
GET /api/v1/resumes/{resume_id}
Header: Authorization: Bearer {access_token}
```
**Response**:
```json
{
  "id": "resume_uuid",
  "name": "John Developer",
  "email": "john@example.com",
  "phone": "+1-555-0123",
  "location": "San Francisco, CA",
  "summary": "5+ years in full-stack development...",
  "skills": ["Python", "JavaScript", "React", "PostgreSQL"],
  "experience": [
    {
      "title": "Senior Developer",
      "company": "Tech Corp",
      "location": "San Francisco, CA",
      "start_date": "2022-01",
      "end_date": "Present",
      "description": "Led development of..."
    }
  ],
  "education": [
    {
      "degree": "Bachelor of Science",
      "field": "Computer Science",
      "institution": "State University",
      "graduation_date": "2018"
    }
  ]
}
```

---

### Phase 3: Job Management & Applications

#### 1. Create Job (Recruiter Only)
```
POST /api/v1/jobs
Header: Authorization: Bearer {recruiter_token}
{
  "title": "Senior Python Developer",
  "company": "TechCorp",
  "description": "We're hiring for our platform team...",
  "requirements": ["Python", "PostgreSQL", "AWS"],
  "location": "San Francisco, CA",
  "job_type": "full-time",
  "work_mode": "hybrid",
  "salary_min": 150000,
  "salary_max": 200000,
  "has_vm_test": true,
  "vm_test_duration_minutes": 60
}
```
**Response**: `{ "id": "job_uuid", "status": "active", "created_at": "..." }`

#### 2. List Jobs
```
GET /api/v1/jobs
```
**Response**:
```json
{
  "jobs": [
    {
      "id": "job_uuid",
      "title": "Senior Python Developer",
      "company": "TechCorp",
      "location": "San Francisco, CA",
      "salary_range": "$150k - $200k",
      "status": "active"
    }
  ],
  "total": 1
}
```

#### 3. Apply to Job
```
POST /api/v1/applications
Header: Authorization: Bearer {candidate_token}
{
  "job_id": "job_uuid",
  "resume_id": "resume_uuid",
  "cover_letter": "I'm very interested in this position..."
}
```
**Response**:
```json
{
  "id": "app_uuid",
  "status": "applied",
  "match_score": 85.5,
  "matched_skills": ["Python", "PostgreSQL"],
  "missing_skills": ["AWS"],
  "match_insights": "Your Python and database skills are excellent. Consider gaining AWS experience.",
  "created_at": "2026-04-23T10:30:00Z"
}
```

#### 4. Get My Applications
```
GET /api/v1/applications/my-applications
Header: Authorization: Bearer {candidate_token}
```
**Response**:
```json
{
  "applications": [
    {
      "id": "app_uuid",
      "job_id": "job_uuid",
      "job_title": "Senior Python Developer",
      "company": "TechCorp",
      "status": "applied",
      "match_score": 85.5,
      "created_at": "2026-04-23T10:30:00Z"
    }
  ],
  "total": 1
}
```

---

### Phase 4: Chatbot

#### 1. Send Message
```
POST /api/v1/chat/message
Header: Authorization: Bearer {access_token}
{
  "message": "What jobs are available for Python developers in San Francisco?",
  "session_id": "optional_session_uuid",
  "job_id": "optional_job_uuid"
}
```
**Response**:
```json
{
  "message_id": "msg_uuid",
  "session_id": "session_uuid",
  "role": "assistant",
  "content": "Based on your profile and the jobs available, I found several Python developer positions in San Francisco. The best matches are...",
  "tool_calls": [
    {
      "tool": "get_live_jobs",
      "status": "executing",
      "result": "..."
    }
  ],
  "created_at": "2026-04-23T10:35:00Z"
}
```

#### 2. Get Conversation History
```
GET /api/v1/chat/history/{session_id}
Header: Authorization: Bearer {access_token}
```
**Response**:
```json
{
  "session_id": "session_uuid",
  "messages": [
    {
      "role": "user",
      "content": "What jobs are available?"
    },
    {
      "role": "assistant",
      "content": "Based on your skills..."
    }
  ],
  "total": 2
}
```

#### 3. List Sessions
```
GET /api/v1/chat/sessions
Header: Authorization: Bearer {access_token}
```
**Response**:
```json
{
  "sessions": [
    {
      "id": "session_uuid",
      "created_at": "2026-04-23T10:30:00Z",
      "last_message_at": "2026-04-23T10:35:00Z",
      "message_count": 2
    }
  ],
  "total": 1
}
```

---

### Phase 5: VM Testing

#### 1. Start Test Session
```
POST /api/v1/vm/sessions/start
Header: Authorization: Bearer {candidate_token}
{
  "application_id": "app_uuid",
  "questions": [
    {
      "id": "q1",
      "title": "Reverse a string",
      "description": "Write a function to reverse a string",
      "test_cases": [
        {
          "input": "hello",
          "expected_output": "olleh"
        }
      ],
      "time_limit_seconds": 600
    }
  ]
}
```
**Response**:
```json
{
  "session_id": "session_uuid",
  "container_id": "docker_container_id",
  "port": 8123,
  "status": "active",
  "expires_at": "2026-04-23T11:35:00Z",
  "created_at": "2026-04-23T10:35:00Z"
}
```

#### 2. Submit Code Solution
```
POST /api/v1/vm/{session_id}/submit
Header: Authorization: Bearer {candidate_token}
{
  "question_id": "q1",
  "code": "def reverse_string(s):\n    return s[::-1]",
  "language": "python"
}
```
**Response**:
```json
{
  "question_id": "q1",
  "passed": true,
  "test_results": [
    {
      "test_case": 0,
      "passed": true,
      "expected": "olleh",
      "actual": "olleh"
    }
  ],
  "execution_time": 0.023,
  "score": 100
}
```

#### 3. Get Anti-Cheat Events
```
GET /api/v1/vm/{session_id}/events
Header: Authorization: Bearer {candidate_token}
```
**Response**:
```json
{
  "events": [
    {
      "type": "tab_switch",
      "timestamp": "2026-04-23T10:35:15Z",
      "description": "User switched tabs"
    },
    {
      "type": "copy_paste",
      "timestamp": "2026-04-23T10:35:45Z",
      "description": "Copy/paste detected"
    }
  ],
  "total_events": 2,
  "violations": ["copy_paste"]
}
```

#### 4. Get Final Score
```
GET /api/v1/vm/{session_id}/score
Header: Authorization: Bearer {candidate_token}
```
**Response**:
```json
{
  "session_id": "session_uuid",
  "overall_score": 92,
  "test_results": {
    "total_questions": 3,
    "passed": 3,
    "failed": 0,
    "average_score": 92
  },
  "anti_cheat": {
    "violations": 2,
    "severity": "low",
    "flagged": false
  },
  "submitted_at": "2026-04-23T11:25:00Z"
}
```

---

## Common Errors & Fixes

### 401 Unauthorized
**Issue**: Missing or invalid authentication token
**Fix**: Include `Authorization: Bearer {access_token}` header

### 404 Not Found
**Issue**: Resource doesn't exist
**Fix**: Check that IDs are correct and the resource has been created

### 409 Conflict
**Issue**: Duplicate resume or already applied to job
**Fix**: Resume: delete old resume first. Application: check if already applied

### 413 Payload Too Large
**Issue**: Resume file exceeds 10MB
**Fix**: Use a smaller PDF file

---

## Database Verification

### Check if resume was parsed correctly
```sql
SELECT id, parse_status, name, skills, created_at 
FROM resume 
WHERE user_id = 'user_uuid' 
ORDER BY created_at DESC;
```

### Check application match scores
```sql
SELECT app.id, j.title, app.match_score, app.status
FROM application app
JOIN job j ON app.job_id = j.id
WHERE app.user_id = 'user_uuid'
ORDER BY app.created_at DESC;
```

### Check chat history
```sql
SELECT id, role, content, created_at
FROM chat_message
WHERE user_id = 'user_uuid'
ORDER BY created_at DESC;
```

---

## Environment Variables Needed

Create `backend/.env`:
```
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/hiring_os

# Authentication
JWT_SECRET=your-secret-key-here
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24

# Claude API
ANTHROPIC_API_KEY=sk-ant-...

# Optional: Job APIs
ADZUNA_API_KEY=...
ADZUNA_API_SECRET=...

# Server
DEBUG=true
LOG_LEVEL=INFO
CORS_ORIGINS=http://localhost:3000,http://localhost:8000
```

---

## Ready to Test!

All endpoints are live and integrated. Start testing at:
**http://localhost:8000/api/docs**
