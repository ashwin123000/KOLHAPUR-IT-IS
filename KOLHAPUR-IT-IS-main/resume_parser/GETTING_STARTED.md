# 🚀 Resume Parser - Getting Started Guide

## ⚡ 5-Minute Quick Start

### Windows
```batch
cd resume_parser
START_SERVER.bat
```

### macOS/Linux
```bash
cd resume_parser
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python run.py
```

**Server starts at**: http://localhost:8000

---

## 📋 Complete Setup

### Step 1: Install Python Dependencies

```bash
cd resume_parser
pip install -r requirements.txt
```

**Required packages** (automatically installed):
- fastapi - Web framework
- uvicorn - ASGI server
- sqlalchemy - Database ORM
- pydantic - Data validation
- pygithub - GitHub API client
- aiohttp - Async HTTP
- python-dotenv - Environment config

### Step 2: Configure Environment (Optional)

Edit `.env` file to add GitHub token (recommended for production):

```env
# Get token from: https://github.com/settings/tokens
GITHUB_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Other settings
DATABASE_URL=sqlite:///./resumes.db
HOST=0.0.0.0
PORT=8000
DEBUG=true
```

### Step 3: Start Server

**Option A: Using startup script (Windows)**
```batch
START_SERVER.bat
```

**Option B: Manual startup**
```bash
python run.py
```

**Option C: Direct uvicorn**
```bash
uvicorn main:app --reload
```

**Option D: Production**
```bash
pip install gunicorn
gunicorn -w 4 main:app
```

### Step 4: Access API

- **Interactive Docs**: http://localhost:8000/docs
- **Alternative Docs**: http://localhost:8000/redoc
- **Health Check**: http://localhost:8000/api/health

---

## 🧪 Testing the System

### In Your Browser

1. Go to: http://localhost:8000/docs
2. Click on "POST /api/candidates/register"
3. Click "Try it out"
4. Enter GitHub username: `torvalds`
5. Click "Execute"

### From Command Line

```bash
# Test health
curl http://localhost:8000/api/health

# Register candidate
curl -X POST http://localhost:8000/api/candidates/register \
  -H "Content-Type: application/json" \
  -d '{"github_username": "torvalds"}'

# Upload resume
curl -X POST http://localhost:8000/api/resume/parsed \
  -H "Content-Type: application/json" \
  -d '{
    "candidate_id": 1,
    "source": "manual",
    "resume_data": {
      "name": "Test",
      "skills": ["C", "Python"]
    }
  }'
```

### Automated Testing

```bash
# Full test suite
python test_api.py
```

This runs 10 comprehensive tests covering all functionality.

---

## 🏗️ Project Structure

```
resume_parser/
├── main.py                  # FastAPI application
├── models.py                # SQLAlchemy database models
├── schemas.py               # Pydantic request/response schemas
├── database.py              # Database configuration
├── run.py                   # Startup script
├── test_api.py              # Test suite
├── START_SERVER.bat         # Windows batch startup
│
├── services/
│   ├── github_service.py    # GitHub API integration
│   └── resume_service.py    # Resume enrichment logic
│
├── requirements.txt         # Python dependencies
├── .env                     # Configuration (create/edit)
├── resumes.db              # Database (auto-created)
│
├── README.md               # Full API documentation
├── ARCHITECTURE.md         # System architecture
└── GETTING_STARTED.md      # This file
```

---

## 🔧 Configuration Options

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `GITHUB_TOKEN` | - | GitHub API token (optional) |
| `DATABASE_URL` | `sqlite:///./resumes.db` | Database URL |
| `HOST` | `0.0.0.0` | Server host |
| `PORT` | `8000` | Server port |
| `DEBUG` | `true` | Debug mode |
| `LOG_LEVEL` | `INFO` | Logging level |

### GitHub Rate Limits

- **Without Token**: 60 requests/hour
- **With Token**: 5000 requests/hour

To get a token:
1. Go to: https://github.com/settings/tokens
2. Click "Generate new token (classic)"
3. Select: `public_repo`, `read:user`
4. Copy token to `.env` file

---

## 📊 Database

### Automatic Initialization

Database tables are automatically created on first run.

### Database File

Located at: `resume_parser/resumes.db`

### Reset Database

```bash
# In Python:
from database import reset_db
reset_db()

# Or: Simply delete resumes.db
# (will be recreated on restart)
```

---

## 🔌 API Quick Reference

### Register Candidate
```http
POST /api/candidates/register
{ "github_username": "torvalds" }
```

### Get GitHub Profile
```http
GET /api/candidates/{id}/github
```

### Upload Resume
```http
POST /api/resume/parsed
{
  "candidate_id": 1,
  "resume_data": { ... }
}
```

### Enrich Resume
```http
POST /api/resumes/{id}/enrich
```

### Get Analysis
```http
GET /api/resumes/{id}/analysis
```

---

## 🐛 Troubleshooting

### "Cannot connect to server"
```
✅ Make sure server is running
✅ Check if port 8000 is available
✅ Try: http://localhost:8000/api/health
```

### "Module not found"
```
✅ Reinstall dependencies: pip install -r requirements.txt
✅ Activate virtual environment
```

### "GitHub rate limit exceeded"
```
✅ Add GitHub token to .env
✅ Wait 1 hour for limit reset
✅ Or use cache (1-hour TTL)
```

### "Port 8000 already in use"
```
✅ Change PORT in .env
✅ Or kill process: lsof -i :8000 (macOS/Linux)
✅ Or: netstat -ano | findstr :8000 (Windows)
```

### "Database is locked"
```
✅ Delete resumes.db
✅ Restart server (new database created)
```

---

## 🚀 Integration Examples

### With n8n

1. Create n8n workflow
2. Parse resume document
3. Extract structured data
4. Call endpoint:
   ```
   POST http://your-server:8000/api/resume/parsed
   Body: {
     "candidate_id": 1,
     "resume_data": {{ parsed_data }},
     "source": "n8n"
   }
   ```

### With Frontend

```javascript
// Register candidate
const response = await fetch('http://localhost:8000/api/candidates/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ github_username: 'torvalds' })
});

// Get candidate data
const candidate = await response.json();

// Get GitHub profile
const github = await fetch(`http://localhost:8000/api/candidates/${candidate.id}/github`);
const profile = await github.json();
```

---

## 📈 What's Working

✅ **GitHub Integration**
- Fetch user profiles
- Get repositories
- Extract languages
- Calculate activity scores

✅ **Resume Parsing**
- Accept parsed resume data
- Store structured data
- Link to candidates
- Persist across restarts

✅ **Data Enrichment**
- Match skills semantically
- Add GitHub projects
- Calculate confidence scores
- Generate recommendations

✅ **Analysis**
- Generate reports
- Identify strengths
- Find skill gaps
- Rate overall match

✅ **API Features**
- CORS support
- Pagination (10-100 items)
- Error handling
- Request logging
- Rate limiting

---

## 🎯 Common Tasks

### Task: Find a Candidate

```bash
GET /api/candidates?page=1&limit=10
# Returns paginated list of candidates
```

### Task: See GitHub Skills

```bash
GET /api/candidates/1/github-skills
# Returns languages, topics, inferred skills
```

### Task: Get Full Analysis

```bash
GET /api/resumes/1/analysis
# Returns comprehensive analysis report
```

### Task: Update Candidate Info

```bash
PUT /api/candidates/1
{ "name": "New Name", "email": "new@example.com" }
```

---

## 📚 Documentation

- **API Docs**: http://localhost:8000/docs (interactive)
- **README.md**: Full API reference
- **ARCHITECTURE.md**: System design
- **This file**: Quick start guide

---

## 🎯 Next Steps

1. **Try it out**: Start server and visit http://localhost:8000/docs
2. **Read the docs**: See README.md for full API reference
3. **Run tests**: Execute `python test_api.py`
4. **Integrate**: Connect with n8n or your frontend
5. **Deploy**: Use Docker or Gunicorn for production

---

## 📞 Support

### Check These First
1. API Docs: http://localhost:8000/docs
2. README.md (full documentation)
3. ARCHITECTURE.md (system design)
4. Troubleshooting section above

### Common Issues
- **Connection refused**: Server not running
- **Rate limit**: Add GitHub token
- **Module errors**: Run `pip install -r requirements.txt`
- **Database locked**: Delete `resumes.db`

---

## ✨ Key Features

🚀 **Fast** - < 500ms response time for most requests
🔒 **Secure** - Input validation, error sanitization
📊 **Smart** - Semantic skill matching, AI-style recommendations
🔄 **Reliable** - Comprehensive error handling
📈 **Scalable** - Pagination, caching, background tasks
🎯 **Complete** - Full GitHub integration with enrichment

---

## 🎉 You're All Set!

Your Resume Parser API is ready to use.

**Start**: `python run.py` (or `START_SERVER.bat` on Windows)
**Access**: http://localhost:8000/docs
**Test**: `python test_api.py`

Enjoy! 🚀

---

**Version**: 1.0.0
**Date**: April 20, 2026
**Status**: ✅ Production Ready
