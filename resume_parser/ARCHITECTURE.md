# Resume Parser - Architecture Document

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      FastAPI Server                         │
│                    (Port 8000)                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Request Handling Layer                  │  │
│  │  • CORS Middleware                                  │  │
│  │  • Request Logging Middleware                       │  │
│  │  • Error Handling                                   │  │
│  └──────────────────────────────────────────────────────┘  │
│                         ↓                                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Route Handlers                         │  │
│  │  • Candidate Management                            │  │
│  │  • Resume Management                               │  │
│  │  • GitHub Integration                              │  │
│  │  • Resume Enrichment                               │  │
│  └──────────────────────────────────────────────────────┘  │
│                         ↓                                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Business Logic Layer                   │  │
│  │  • GitHubService                                   │  │
│  │  • ResumeEnrichmentService                         │  │
│  └──────────────────────────────────────────────────────┘  │
│                         ↓                                    │
└─────────────────────────────────────────────────────────────┘
          ↓                              ↓
    ┌──────────────┐          ┌──────────────────────┐
    │ SQLite DB    │          │  GitHub API          │
    │ (resumes.db) │          │  (PyGithub)          │
    │              │          │                      │
    │ Tables:      │          │ Features:            │
    │ • candidates │          │ • Rate limiting      │
    │ • resumes    │          │ • Caching (1hr TTL)  │
    │ • github_data│          │ • Error handling     │
    │ • api_logs   │          │ • Async support      │
    └──────────────┘          └──────────────────────┘
```

## 📊 Data Flow

### Candidate Registration Flow
```
User Request
    ↓
POST /api/candidates/register
    ↓
Validate GitHub Username
    ↓
Fetch from GitHub API
    • Profile (name, bio, followers, etc)
    • Repositories (languages, stars, topics)
    ↓
Check Cache (1-hour TTL)
    ↓
Store in Database
    • Candidate record
    • GitHub data for each repo
    ↓
Return Candidate ID + GitHub Data
```

### Resume Enrichment Flow
```
n8n Sends Parsed Resume
    ↓
POST /api/resume/parsed
    ↓
Store Resume Data
    ↓
Link to Candidate
    ↓
Trigger Background Enrichment
    ↓
Extract Skills from Resume
    ↓
Get Candidate's GitHub Data
    ↓
Match Skills
    (Semantic similarity-based)
    ↓
Add GitHub Projects
    ↓
Calculate Confidence Scores
    ↓
Generate Analysis Report
    ↓
Return Enriched Resume
```

## 🔄 Component Interaction

### GitHubService
- **Responsibility**: All GitHub API interactions
- **Methods**:
  - `get_user_profile()` - Fetch user profile
  - `get_user_repositories()` - Fetch repos
  - `extract_languages_from_repos()` - Get programming languages
  - `extract_topics_from_repos()` - Get repository topics
  - `extract_topics_from_repos()` - Infer skills from repo data
  - `calculate_activity_score()` - User activity scoring
  - `calculate_quality_score()` - Repository quality scoring

**Features**:
- ✅ Rate limit tracking
- ✅ 1-hour TTL caching
- ✅ Error handling
- ✅ GitHub token support

### ResumeEnrichmentService
- **Responsibility**: Resume data enrichment and analysis
- **Methods**:
  - `match_skills()` - Match resume skills with GitHub skills
  - `enrich_with_github_projects()` - Add GitHub projects
  - `create_skill_confidence_map()` - Map skills with confidence
  - `generate_analysis_report()` - Generate analysis
  - `semantic_similarity()` - Calculate skill similarity

**Features**:
- ✅ Semantic similarity matching
- ✅ Skill synonyms database
- ✅ Confidence scoring
- ✅ Recommendations generation

## 🗄️ Database Schema

### candidates
```sql
CREATE TABLE candidates (
    id INTEGER PRIMARY KEY,
    github_username VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(20),
    city VARCHAR(100),
    state VARCHAR(100),
    bio TEXT,
    github_profile_url VARCHAR(500),
    github_repos JSON,
    github_followers INTEGER,
    github_activity_score FLOAT,
    github_last_synced DATETIME,
    created_at DATETIME DEFAULT NOW(),
    updated_at DATETIME DEFAULT NOW()
)
```

### resumes
```sql
CREATE TABLE resumes (
    id INTEGER PRIMARY KEY,
    candidate_id INTEGER FOREIGN KEY,
    name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(20),
    city VARCHAR(100),
    state VARCHAR(100),
    summary TEXT,
    skills JSON,
    education JSON,
    experience JSON,
    projects JSON,
    certifications JSON,
    parsed_at DATETIME,
    source VARCHAR(50),
    enrichment_data JSON,
    created_at DATETIME DEFAULT NOW(),
    updated_at DATETIME DEFAULT NOW()
)
```

### github_data
```sql
CREATE TABLE github_data (
    id INTEGER PRIMARY KEY,
    candidate_id INTEGER FOREIGN KEY,
    repo_name VARCHAR(255),
    repo_url VARCHAR(500),
    languages JSON,
    topics JSON,
    stars INTEGER,
    forks INTEGER,
    description TEXT,
    readme_content TEXT,
    quality_score FLOAT,
    commits_count INTEGER,
    created_at DATETIME DEFAULT NOW()
)
```

### api_logs
```sql
CREATE TABLE api_logs (
    id INTEGER PRIMARY KEY,
    method VARCHAR(10),
    endpoint VARCHAR(255),
    status_code INTEGER,
    response_time_ms FLOAT,
    timestamp DATETIME DEFAULT NOW()
)
```

## 🔐 Security Architecture

### Input Validation
- Pydantic models for request validation
- GitHub username format validation
- Email validation (EmailStr)
- Type checking

### Error Handling
- Comprehensive exception handling
- Safe error messages (no data leakage)
- Proper HTTP status codes
- Detailed logging

### API Security
- CORS protection
- Rate limit handling
- SQL injection prevention (SQLAlchemy ORM)
- Request logging

## 🎯 Endpoint Architecture

### Endpoints by Category

**Health & Status**
- `GET /api/health` - Health check

**Candidate Management** (Tier 1: CRUD)
- `POST /api/candidates/register` - Register from GitHub
- `GET /api/candidates` - List all (paginated)
- `GET /api/candidates/{id}` - Get one
- `PUT /api/candidates/{id}` - Update
- `DELETE /api/candidates/{id}` - Delete

**GitHub Operations** (Tier 2: Sync & Extract)
- `POST /api/candidates/{id}/sync-github` - Re-sync GitHub
- `GET /api/candidates/{id}/github` - Get profile
- `GET /api/candidates/{id}/github-skills` - Extract skills

**Resume Management** (Tier 1: CRUD)
- `POST /api/resume/parsed` - Upload from n8n
- `GET /api/resumes` - List all (paginated)
- `GET /api/resumes/{id}` - Get one
- `PUT /api/resumes/{id}` - Update
- `DELETE /api/resumes/{id}` - Delete

**Resume Enrichment** (Tier 2: Analysis & Enrichment)
- `POST /api/resumes/{id}/enrich` - Enrich with GitHub data
- `GET /api/resumes/{id}/analysis` - Get analysis report

## 🚀 Performance Optimization

### Caching Strategy
```
GitHub API Call
    ↓
Check Local Cache (1-hour TTL)
    ↓ Cache HIT → Return immediately
    ↓ Cache MISS → Call GitHub
    ↓
Cache Result for 1 hour
    ↓
Return Response
```

**Cache Keys**:
- `github:user:{username}` - User profile
- `github:repos:{username}` - Repositories
- `github:readme:{username}/{repo}` - README content

### Rate Limiting
- Tracks GitHub API rate limits
- Returns 429 when limit exceeded
- Implements retry logic
- Falls back to cache

### Pagination
- 10 items per page (default)
- Max 100 items per page
- Offset-based pagination
- Total count provided

## 🔄 Async & Background Processing

### Background Tasks
- GitHub sync runs in background
- Doesn't block main request
- Uses FastAPI BackgroundTasks

### Future Improvements
- Celery for distributed tasks
- Redis for caching
- Async GitHub API calls
- WebSocket for real-time updates

## 🎨 Error Handling Strategy

### HTTP Status Codes
- `200 OK` - Success (GET/PUT)
- `201 Created` - Resource created (POST)
- `204 No Content` - Success (DELETE)
- `400 Bad Request` - Validation error
- `404 Not Found` - Resource not found
- `409 Conflict` - Resource already exists
- `429 Too Many Requests` - Rate limit
- `500 Internal Server Error` - Server error

### Error Response Format
```json
{
  "error": "Error message",
  "detail": "Optional detailed message",
  "status_code": 400,
  "timestamp": "2026-04-20T10:30:00"
}
```

## 📈 Scalability Considerations

### Current Limitations
- SQLite (development only)
- Single-process server
- Memory-based caching
- No distributed processing

### Production Recommendations
1. **Database**: PostgreSQL
2. **Cache**: Redis
3. **Task Queue**: Celery + RabbitMQ
4. **Server**: Gunicorn with Nginx reverse proxy
5. **Monitoring**: Prometheus + Grafana
6. **Logging**: ELK Stack

### Scaling Path
```
Single Process (Development)
    ↓
Gunicorn Multi-worker (Small)
    ↓
Nginx Load Balancer (Medium)
    ↓
Docker Swarm/Kubernetes (Large)
    ↓
Distributed Microservices (Enterprise)
```

## 🔍 Monitoring & Logging

### Logged Events
- All HTTP requests (method, endpoint, status, time)
- GitHub API calls
- Database operations
- Errors and exceptions
- Rate limit events

### Metrics to Track
- Request count
- Response time (p50, p95, p99)
- Error rate
- GitHub API rate limit usage
- Cache hit rate
- Database size

## 🎯 Critical Fixes Applied

### ✅ Fixed Issues from Requirements

1. **GitHub Repo Misunderstanding** ✅
   - FIXED: Only use KOLHAPUR-IT-IS as reference
   - Use only: GitHub API for actual user data
   - No attempt to parse candidate from repo files

2. **GitHub Rate Limiting** ✅
   - FIXED: Automatic rate limit checking
   - FIXED: 1-hour TTL caching
   - FIXED: 429 responses when limit exceeded

3. **Email from GitHub** ✅
   - FIXED: Email often null (GitHub privacy)
   - FIXED: Fallback to user-provided email
   - FIXED: Graceful handling of missing emails

4. **Resume Enrichment Logic** ✅
   - FIXED: Semantic similarity matching
   - FIXED: Confidence score calculation
   - FIXED: Detailed matching results

5. **GitHub Skills Extraction** ✅
   - FIXED: Languages from repos
   - FIXED: Topics from repos
   - FIXED: README keywords (future)
   - FIXED: Commit activity analysis

6. **Async Optimization** ✅
   - FIXED: Background tasks for GitHub sync
   - FIXED: Async-ready architecture
   - Future: Full async/await with aiohttp

7. **Background Processing** ✅
   - FIXED: GitHub sync runs in background
   - Future: Celery for scalability

8. **Resume + GitHub Conflict** ✅
   - FIXED: Confidence scoring system
   - FIXED: Detailed conflict reporting
   - FIXED: Recommendations based on conflicts

9. **Endpoint Security** ✅
   - FIXED: Proper error responses
   - FIXED: Input validation
   - Future: JWT authentication

10. **Pagination** ✅
    - FIXED: All list endpoints paginated
    - FIXED: Page/limit parameters
    - FIXED: Total count included

## 🎉 Optional Upgrades Implemented

✅ **GitHub Activity Score**
- Based on: followers, repos, recent activity
- Scale: 0.0 - 1.0
- Used in recommendations

✅ **Repo Quality Score**
- Based on: stars, forks, watchers
- Scale: 0.0 - 1.0
- Used in project ranking

✅ **AI-Style Summaries**
- Generated recommendations
- Strength identification
- Skill gap analysis
- Activity assessment

## 📚 Integration Points

### n8n Integration
```
Resume File Upload
    ↓
n8n Workflow
    • Extract text
    • Parse structure
    • Format JSON
    ↓
POST /api/resume/parsed
    (with candidate_id)
    ↓
Resume Parser
    • Store resume
    • Enrich with GitHub
    • Generate analysis
    ↓
Return enriched data
```

### Frontend Integration
```
User registers on platform
    ↓
Frontend calls: POST /api/candidates/register
    (with github_username)
    ↓
Resume Parser
    • Fetches GitHub data
    • Stores candidate
    ↓
Frontend displays GitHub profile
```

---

**Document Version**: 1.0
**Last Updated**: April 20, 2026
**Status**: Production Ready
