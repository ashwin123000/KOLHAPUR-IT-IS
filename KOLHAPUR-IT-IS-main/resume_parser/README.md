# 🚀 Resume Parser API - Complete System

Production-ready FastAPI application for parsing resumes and enriching them with GitHub data.

## 🎯 Features

### ✅ Core Features
- **GitHub Integration**: Fetch user profiles, repositories, and skills
- **Resume Parsing**: Parse and store resume data from n8n
- **Data Enrichment**: Match resume skills with GitHub projects
- **Skill Analysis**: Semantic similarity-based skill matching
- **Activity Tracking**: GitHub activity scoring
- **Quality Assessment**: Repository quality scoring

### ✅ Advanced Features
- **Rate Limiting**: GitHub API rate limit handling (60/hour unauthenticated)
- **Caching**: 1-hour TTL cache for GitHub API calls
- **Pagination**: Full pagination support for all list endpoints
- **Error Handling**: Comprehensive error responses
- **Async Support**: Async/await for non-blocking operations
- **Background Tasks**: Background processing for long operations
- **Logging**: Complete request/response logging
- **CORS Support**: Cross-origin requests for n8n and frontend

## 📋 Requirements

- Python 3.9+
- pip or conda
- GitHub API (optional token for higher rate limits)

## 🚀 Quick Start

### 1. Setup Environment

```bash
# Navigate to project
cd resume_parser

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate
```

### 2. Install Dependencies

```bash
pip install -r requirements.txt
```

### 3. Configure Environment

Edit `.env` file:

```env
# Optional: Add GitHub token for higher rate limits
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Database (default is SQLite)
DATABASE_URL=sqlite:///./resumes.db

# Server
HOST=0.0.0.0
PORT=8000
DEBUG=true
```

To generate GitHub token:
1. Go to https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Select scopes: `public_repo`, `read:user`
4. Copy token and add to `.env`

### 4. Start Server

```bash
# With hot reload (development)
uvicorn main:app --reload

# Production
uvicorn main:app --host 0.0.0.0 --port 8000
```

Server will start at: **http://localhost:8000**

### 5. Access API Documentation

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 📡 API Endpoints

### Health Check

```http
GET /api/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2026-04-20T10:30:00",
  "service": "Resume Parser API"
}
```

### Candidate Management

#### Register Candidate from GitHub
```http
POST /api/candidates/register
Content-Type: application/json

{
  "github_username": "ashwin123000",
  "email": "optional@email.com",
  "phone": "+1234567890"
}
```

**Response** (201):
```json
{
  "id": 1,
  "github_username": "ashwin123000",
  "name": "Ashwin Kumar",
  "email": "ashwin@example.com",
  "github_followers": 150,
  "github_activity_score": 0.85,
  "github_repos": ["repo1", "repo2"],
  "github_last_synced": "2026-04-20T10:30:00",
  "created_at": "2026-04-20T10:30:00",
  "updated_at": "2026-04-20T10:30:00"
}
```

**Error Cases:**
- 400: Invalid GitHub username format
- 404: GitHub user not found
- 409: Candidate already registered
- 429: GitHub API rate limit exceeded

#### Get All Candidates
```http
GET /api/candidates?page=1&limit=10
```

#### Get Single Candidate
```http
GET /api/candidates/{candidate_id}
```

#### Update Candidate
```http
PUT /api/candidates/{candidate_id}
Content-Type: application/json

{
  "name": "Updated Name",
  "email": "newemail@example.com",
  "phone": "+1234567890",
  "city": "San Francisco",
  "state": "CA",
  "bio": "Full-stack developer"
}
```

#### Delete Candidate
```http
DELETE /api/candidates/{candidate_id}
```

### Resume Management

#### Upload Parsed Resume (from n8n)
```http
POST /api/resume/parsed
Content-Type: application/json

{
  "candidate_id": 1,
  "source": "n8n",
  "resume_data": {
    "name": "Ashwin Kumar",
    "email": "ashwin@example.com",
    "phone": "+1234567890",
    "city": "San Francisco",
    "state": "CA",
    "summary": "Full-stack developer with 5+ years experience",
    "skills": ["Python", "JavaScript", "React", "Docker"],
    "education": [
      {
        "school": "University Name",
        "degree": "B.Tech",
        "field": "Computer Science",
        "start_date": "2015",
        "end_date": "2019"
      }
    ],
    "experience": [
      {
        "title": "Senior Developer",
        "company": "Tech Company",
        "start_date": "2021",
        "end_date": "Present",
        "description": "Led team of 5 developers",
        "skills_used": ["Python", "Docker"]
      }
    ],
    "projects": [
      {
        "name": "Project Name",
        "description": "Project description",
        "url": "https://github.com/...",
        "technologies": ["Python", "React"]
      }
    ],
    "certifications": [
      {
        "name": "AWS Solutions Architect",
        "issuer": "Amazon",
        "issue_date": "2023-06",
        "credential_url": "https://aws.amazon.com/..."
      }
    ]
  }
}
```

#### Get All Resumes
```http
GET /api/resumes?page=1&limit=10
```

#### Get Single Resume
```http
GET /api/resumes/{resume_id}
```

#### Update Resume
```http
PUT /api/resumes/{resume_id}
Content-Type: application/json
```

#### Delete Resume
```http
DELETE /api/resumes/{resume_id}
```

### GitHub Integration

#### Sync GitHub Data
```http
POST /api/candidates/{candidate_id}/sync-github
```

Response: Updated candidate with latest GitHub data

#### Get GitHub Profile
```http
GET /api/candidates/{candidate_id}/github
```

Response:
```json
{
  "username": "ashwin123000",
  "name": "Ashwin Kumar",
  "followers": 150,
  "public_repos": 25,
  "profile_url": "https://github.com/ashwin123000",
  "repositories": [
    {
      "name": "project-name",
      "url": "https://github.com/ashwin123000/project-name",
      "description": "Description",
      "primary_language": "Python",
      "stars": 50,
      "topics": ["ai", "ml"]
    }
  ],
  "activity_score": 0.85,
  "last_synced": "2026-04-20T10:30:00"
}
```

#### Get GitHub Skills
```http
GET /api/candidates/{candidate_id}/github-skills
```

Response:
```json
{
  "languages": {
    "Python": 15,
    "JavaScript": 10,
    "Java": 5
  },
  "topics": ["api", "database", "web"],
  "inferred_skills": ["REST API", "Docker", "CI/CD"],
  "activity_level": "high",
  "quality_score": 0.85
}
```

### Resume Enrichment & Analysis

#### Enrich Resume with GitHub Data
```http
POST /api/resumes/{resume_id}/enrich
```

Response:
```json
{
  "resume_id": 1,
  "candidate_id": 1,
  "original_skills": ["Python", "JavaScript"],
  "enriched_skills": [
    {
      "name": "Python",
      "resume_confidence": 0.7,
      "github_confidence": 0.95,
      "final_confidence": 0.825,
      "match_type": "verified"
    }
  ],
  "github_projects_added": [
    {
      "name": "repo-name",
      "description": "Repo description",
      "url": "https://github.com/...",
      "technologies": ["Python", "API"],
      "source": "github",
      "stars": 50,
      "quality_score": 0.8
    }
  ],
  "overall_match_score": 0.85,
  "missing_skills_from_github": ["Rust"],
  "recommendations": [
    "Strong background in Python (15 projects)",
    "Add more frontend projects"
  ]
}
```

#### Get Resume Analysis
```http
GET /api/resumes/{resume_id}/analysis
```

Response:
```json
{
  "resume_id": 1,
  "candidate_name": "Ashwin Kumar",
  "total_skills": 10,
  "verified_skills": 8,
  "unverified_skills": 2,
  "github_projects_count": 25,
  "overall_score": 0.87,
  "strengths": ["Strong in Python", "Experienced with Docker"],
  "gaps": ["Mobile development"],
  "recommendations": [
    "Highlight your most starred projects",
    "Add certifications to profile"
  ],
  "activity_level": "high"
}
```

## 🧪 Testing

### Manual Testing with cURL

#### Register a Candidate
```bash
curl -X POST http://localhost:8000/api/candidates/register \
  -H "Content-Type: application/json" \
  -d '{
    "github_username": "torvalds",
    "email": "linus@kernel.org"
  }'
```

#### Upload Resume
```bash
curl -X POST http://localhost:8000/api/resume/parsed \
  -H "Content-Type: application/json" \
  -d '{
    "candidate_id": 1,
    "source": "n8n",
    "resume_data": {
      "name": "Linus Torvalds",
      "email": "linus@kernel.org",
      "skills": ["C", "Python", "Linux"]
    }
  }'
```

#### Enrich Resume
```bash
curl -X POST http://localhost:8000/api/resumes/1/enrich
```

#### Get Analysis
```bash
curl -X GET http://localhost:8000/api/resumes/1/analysis
```

### Python Testing

```python
import requests

BASE_URL = "http://localhost:8000"

# Register candidate
response = requests.post(
    f"{BASE_URL}/api/candidates/register",
    json={"github_username": "torvalds"}
)
print(response.json())

# Get candidate
candidate_id = response.json()["id"]
response = requests.get(f"{BASE_URL}/api/candidates/{candidate_id}")
print(response.json())
```

## 🔧 Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| GITHUB_TOKEN | - | GitHub API token (optional) |
| DATABASE_URL | sqlite:///./resumes.db | Database connection string |
| HOST | 0.0.0.0 | Server host |
| PORT | 8000 | Server port |
| DEBUG | true | Debug mode |
| LOG_LEVEL | INFO | Logging level |

### GitHub Rate Limits

- **Unauthenticated**: 60 requests/hour
- **Authenticated**: 5000 requests/hour

The service implements:
- ✅ Automatic rate limit checking
- ✅ 1-hour TTL caching to reduce API calls
- ✅ Rate limit error responses (429)

## 📊 Database Schema

### Tables

#### `candidates`
- `id`: Primary key
- `github_username`: Unique GitHub username
- `name`, `email`, `phone`: Contact info
- `city`, `state`, `bio`: Profile info
- `github_profile_url`: Profile URL
- `github_repos`: JSON list of repo names
- `github_followers`: Follower count
- `github_activity_score`: Activity score (0-1)
- `github_last_synced`: Last sync timestamp

#### `resumes`
- `id`: Primary key
- `candidate_id`: FK to candidates
- `name`, `email`, `phone`: Resume contact
- `city`, `state`: Location
- `summary`: Professional summary
- `skills`: JSON list of skills with confidence
- `education`: JSON list of education entries
- `experience`: JSON list of work experience
- `projects`: JSON list of projects
- `certifications`: JSON list of certifications
- `source`: "n8n" or "manual"
- `enrichment_data`: JSON enrichment metadata
- `parsed_at`: When resume was parsed
- `created_at`, `updated_at`: Timestamps

#### `github_data`
- `id`: Primary key
- `candidate_id`: FK to candidates
- `repo_name`: Repository name
- `repo_url`: Repository URL
- `languages`: JSON list of languages
- `topics`: JSON list of topics
- `stars`, `forks`: Star and fork counts
- `description`: Repo description
- `quality_score`: Quality score (0-1)
- `commits_count`: Total commits
- `created_at`: Insertion time

#### `api_logs`
- `id`: Primary key
- `method`: HTTP method (GET, POST, etc)
- `endpoint`: API endpoint path
- `status_code`: HTTP status code
- `response_time_ms`: Response time in milliseconds
- `timestamp`: Request timestamp

## 🔒 Security Features

- ✅ Input validation with Pydantic
- ✅ Rate limit handling
- ✅ Error message sanitization
- ✅ CORS protection
- ✅ SQL injection prevention (SQLAlchemy ORM)
- ✅ Request logging

## 🚀 Production Deployment

### Docker Deployment

```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Using Gunicorn

```bash
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:8000 main:app
```

### Environment Setup for Production

```env
ENVIRONMENT=production
DEBUG=false
GITHUB_TOKEN=ghp_xxxxxxxxxxxxx
DATABASE_URL=postgresql://user:password@localhost/resumedb
LOG_LEVEL=WARNING
```

## 📚 Documentation

- **API Docs**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

## 🆘 Troubleshooting

### Issue: GitHub Rate Limit Exceeded

**Solution**: Add GitHub token to `.env` file for 5000 req/hour limit

### Issue: Database Lock

**Solution**: Delete `resumes.db` and restart server

### Issue: Module Not Found

**Solution**: Reinstall dependencies:
```bash
pip install --upgrade -r requirements.txt
```

### Issue: Port 8000 Already in Use

**Solution**: Use different port:
```bash
uvicorn main:app --port 8001
```

## 🎯 Best Practices

1. **Always use GitHub token in production**
2. **Enable HTTPS for production**
3. **Use PostgreSQL instead of SQLite for production**
4. **Set `DEBUG=false` in production**
5. **Use Gunicorn with multiple workers**
6. **Set up monitoring and alerting**
7. **Regular database backups**

## 📈 Performance

- API response time: ~200-500ms
- GitHub API call caching: 1-hour TTL
- Pagination: Up to 100 items per page
- Concurrent requests: Limited by server resources

## 🤝 Integration with n8n

### n8n Workflow Configuration

1. **Trigger**: When resume file is uploaded
2. **Parse Resume**: Extract data structure
3. **Call API**: `POST /api/resume/parsed`
4. **Input Mapping**:
   ```
   candidate_id: {{1}} (from workflow context)
   resume_data: {{parsed_data}}
   source: "n8n"
   ```

## 📝 License

MIT License - See LICENSE file

## 🙋 Support

For issues or questions:
1. Check API documentation: http://localhost:8000/docs
2. Review error logs
3. Check GitHub issues
4. Review troubleshooting section above

---

**Status**: ✅ Production-Ready
**Version**: 1.0.0
**Last Updated**: April 20, 2026
