# 🎯 ARCHITECT-X: PHASE-BY-PHASE EXECUTION GUIDE

**Status:** Ready for Development | **Total Effort:** ~16 weeks | **Team Size:** 3-4 senior engineers

---

## 📋 QUICK REFERENCE: THE 12 CRITICAL FIXES

| # | Fix | Category | Impact | Priority |
|---|-----|----------|--------|----------|
| 1 | Trust-Weight Collision | Matching | Resume padding prevented | 🔴 CRITICAL |
| 2 | Aadhaar Dual-Hash | Security | O(1) uniqueness check + secure storage | 🔴 CRITICAL |
| 3 | Embedding Versioning | Data | Future-proof vector DB migrations | 🟠 HIGH |
| 4 | LLM Determinism Control | AI Safety | Hallucination detection + JSON validation | 🔴 CRITICAL |
| 5 | Retry + Backoff System | Resilience | Auto-recovery from LLM timeouts | 🔴 CRITICAL |
| 6 | Match Score Normalization | Scoring | Prevents weight sum > 1.0 exploits | 🟠 HIGH |
| 7 | Anti-Gaming Detection | Security | Detects resume padding + activity gaming | 🟠 HIGH |
| 8 | Celery Queue Isolation | Performance | LLM tasks get priority over analytics | 🟠 HIGH |
| 9 | Cost Control + Token Limits | Finance | Prevents $10k+ monthly surprises | 🔴 CRITICAL |
| 10 | Cold Start Optimization | UX | Pre-warm Redis; reduce latency 5s→500ms | 🟠 HIGH |
| 11 | Chatbot Context Window | AI | Smart priority stacking; no token waste | 🟠 HIGH |
| 12 | JWT + Session Hardening | Security | 15-min access token, refresh rotation | 🟠 HIGH |

---

## 🏗️ IMPLEMENTATION FLOW (Dependency Graph)

```
Phase 1: Foundation
├─ aiosqlite schema (with Aadhaar dual-hash) ← BLOCKS Phase 2,3
├─ JWT system ← BLOCKS Auth endpoints
└─ Redis Stack setup ← BLOCKS Phase 4

Phase 2: LLM Safety (Parallel to Phase 1 backend work)
├─ Pydantic V2 validation schemas ← BLOCKS Phase 5
├─ Retry + backoff system ← BLOCKS Phase 5
├─ System prompts + determinism control ← BLOCKS Phase 5
└─ Cost control + token limits ← BLOCKS Phase 5

Phase 3: Resume Parsing (Week 4-5)
├─ NER model training (LayoutLM) ← Can start after Phase 1 DB ready
├─ GitHub scraper + trust scoring
├─ Embedding versioning (Redis)
└─ n8n workflow setup

Phase 4: Matching Engine (Week 6-7)
├─ Verified Match Score formula ← Uses Phase 2 output
├─ Cross-Encoder re-ranking
├─ Semantic caching + cold start optimization
└─ Skill normalization

Phase 5: Chatbot + LangGraph (Week 8-10)
├─ LangGraph nodes ← REQUIRES Phase 2 LLM safety
├─ Mock interview agent
├─ Roadmap generator
└─ Context window optimization

Phase 6: Frontend (Week 11-12)
├─ React components
├─ Real-time streaming
└─ Error boundaries

Phase 7: HR Features (Week 13-14)
├─ Company dashboard
├─ Lookalike search
└─ Blind rank mode

Phase 8: Deploy + Compliance (Week 15-16)
├─ DPDP audit logging
├─ Data erasure endpoint
├─ Docker + Kubernetes
└─ Load testing
```

---

## 🚀 PHASE 1: FOUNDATION (WEEK 1-2)

### 1.1 Database Schema (With Aadhaar Dual-Hash)

**Files to Create:**
- `backend/models.py` (SQLAlchemy ORM)
- `backend/database.py` (Connection pooling)
- `backend/migrations/001_init_schema.sql`

**Key Implementation:**
```python
# models.py
class User(Base):
    __tablename__ = "users"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(unique=True, index=True)
    
    # AADHAAR DUAL-HASH (CRITICAL)
    aadhaar_lookup: Mapped[str] = mapped_column(unique=True, index=True)
    aadhaar_secure_hash: Mapped[str]
    aadhaar_salt: Mapped[bytes]
    
    # JWT
    access_token_jti: Mapped[Optional[str]]  # For blacklisting
    refresh_token_jti: Mapped[Optional[str]]
```

**Tests:**
- [ ] Aadhaar uniqueness enforced (duplicate registration fails)
- [ ] Aadhaar never logged in audit_logs
- [ ] Dual-hash verification works
- [ ] Database initialization is idempotent

### 1.2 JWT System

**Files to Create:**
- `backend/auth/jwt_handler.py`
- `backend/auth/token_blacklist.py`

**Key Endpoints:**
```python
POST /api/auth/register        # Create account (Aadhaar double-hashed)
POST /api/auth/login           # Generate access + refresh tokens
POST /api/auth/refresh         # Rotate refresh token
POST /api/auth/logout          # Blacklist current token
GET  /api/auth/verify-token    # Check token validity
```

**Tests:**
- [ ] Access token expires in 15 minutes
- [ ] Refresh token expires in 7 days
- [ ] Logout adds token to blacklist
- [ ] Blacklisted token rejected

### 1.3 Redis Stack Setup

**Infrastructure:**
```bash
docker run -d \
  --name redis-stack \
  -p 6379:6379 \
  -p 8001:8001 \
  redis/redis-stack:latest
```

**Tests:**
- [ ] Redis connection working
- [ ] RediSearch module loaded
- [ ] Vector DB ready
- [ ] TTL expiry working

### 1.4 Kaggle Dataset Ingestion

**Files to Create:**
- `backend/ingestion/kaggle_loader.py`
- `backend/ingestion/skill_trends_calculator.py`

**Steps:**
1. Download 2 datasets (AI Job Market + Resume Dataset)
2. Parse CSV files
3. Ingest 50k jobs into Redis + SQLite
4. Calculate initial skill_trends

**Tests:**
- [ ] 50k jobs loaded into Redis
- [ ] Skill trends calculated
- [ ] O*NET mappings loaded
- [ ] Redis search index created

---

## 🔐 PHASE 2: LLM SAFETY (WEEK 3)

### 2.1 Pydantic V2 Validation Schemas

**Files to Create:**
- `backend/schemas/llm_output_schema.py`
- `backend/schemas/job_schema.py`
- `backend/schemas/resume_schema.py`

**Critical Schemas:**
```python
class MatchEvidenceTuple(BaseModel):
    user_chunk: str
    job_requirement: str
    overlap_reason: str
    confidence: float
    
class LLMMatchResponse(BaseModel):
    match_score: float
    evidence: list[MatchEvidenceTuple]
    reasoning: str
    
    @field_validator("evidence")
    def validate_evidence(cls, v):
        if len(v) == 0:
            raise ValueError("At least 1 evidence tuple required")
        return v
```

**Tests:**
- [ ] Invalid JSON rejected
- [ ] Missing evidence fields rejected
- [ ] Confidence > 1.0 rejected
- [ ] Hallucinated fields ignored

### 2.2 Retry + Backoff System

**Files to Create:**
- `backend/utils/retry_handler.py`
- `backend/utils/error_handlers.py`

**Key Code:**
```python
async def retry_with_backoff(func, max_retries=3):
    for attempt in range(max_retries):
        try:
            return await func()
        except Exception as e:
            if attempt == max_retries - 1:
                logger.error(f"Failed after {max_retries} retries")
                return None
            
            backoff = 2 ** attempt + random.uniform(0, 1)
            await asyncio.sleep(backoff)
```

**Tests:**
- [ ] Retries on 500 error
- [ ] Backoff increases exponentially
- [ ] Jitter prevents thundering herd
- [ ] Max retries respected

### 2.3 LLM Determinism Control

**Files to Create:**
- `backend/llm/validation_layer.py`
- `backend/llm/system_prompts.py`

**Key Implementation:**
```python
async def call_llm_validated(prompt, schema):
    # 1. Call LLM
    response = await openai.ChatCompletion.acreate(...)
    
    # 2. Validate output
    validated = schema(**response)
    
    # 3. If invalid, retry with stricter prompt
    # 4. If still fails after 3 retries, return None
```

**Tests:**
- [ ] Hallucinated fields caught
- [ ] JSON parsing errors retried
- [ ] System prompts followed
- [ ] Response stored only after validation

### 2.4 Cost Control + Token Limits

**Files to Create:**
- `backend/billing/cost_tracker.py`
- `backend/billing/token_limiter.py`

**Key Implementation:**
```python
async def check_token_limit(user_id):
    usage = await db.fetch_token_usage(user_id, today)
    limit = TIER_LIMITS[user.tier]
    
    if usage > limit:
        raise TokenLimitExceeded(
            f"Daily limit exceeded: {usage}/{limit}"
        )
```

**Tests:**
- [ ] Free tier limited to 50k tokens/day
- [ ] Premium tier limited to 500k tokens/day
- [ ] Limits reset at midnight UTC
- [ ] Cost estimates accurate

---

## 📝 PHASE 3: RESUME PARSING (WEEK 4-5)

### 3.1 NER Model Training

**Files to Create:**
- `ml/ner_training.py`
- `ml/ner_model.py` (Inference)

**Steps:**
1. Load resume_dataset.csv
2. Tokenize using HuggingFace Transformers
3. Fine-tune LayoutLM on BIO tags (SKILL, COMPANY, etc.)
4. Evaluate on held-out test set
5. Save model to disk + upload to HuggingFace Hub

**Tests:**
- [ ] F1 score > 0.88 on test set
- [ ] Entity extraction deterministic
- [ ] Confidence scores calibrated

### 3.2 GitHub Scraper + Trust Scoring

**Files to Create:**
- `backend/services/github_service.py`
- `backend/services/trust_calculator.py`

**Key Code:**
```python
async def get_github_profile(username: str):
    # 1. Check Redis cache (1h TTL)
    # 2. If miss, fetch via GitHub API
    # 3. Extract: repos, languages, commits, PRs
    # 4. Calculate trust_score = f(followers, repos, activity)
    # 5. Store back in Redis
```

**Tests:**
- [ ] GitHub rate limit respected (60/hour without token)
- [ ] Cache hits reduce API calls 95%
- [ ] Trust score 0.0-1.0
- [ ] Detects commit farming (recent spike)

### 3.3 Embedding Versioning

**Files to Create:**
- `backend/embeddings/embedding_manager.py`

**Key Implementation:**
```python
async def embed_with_version(text: str, version="v1"):
    # 1. Add version prefix to cache key
    # 2. Only compare same-version embeddings
    # 3. Support migrations via batch recompute
```

**Tests:**
- [ ] Version tracked in database
- [ ] Different versions don't mix in searches
- [ ] Migration path works

### 3.4 n8n Workflow Setup

**Files to Create:**
- `n8n/workflows/resume_ingestion.json`

**Nodes:**
1. Webhook (trigger on file upload)
2. File type detection
3. PDF parser (if PDF) or OCR (if image)
4. NER model inference
5. Confidence gate (ask user if < 85%)
6. GitHub scraper (if URL provided)
7. FastAPI call (/api/resume/parsed)

**Tests:**
- [ ] PDF uploads parse correctly
- [ ] OCR handles images
- [ ] Confidence < 85% triggers clarification
- [ ] Output JSON schema valid

---

## 🎯 PHASE 4: MATCHING ENGINE (WEEK 6-7)

### 4.1 Verified Match Score Formula

**Files to Create:**
- `backend/matching/verified_match_calculator.py`

**Key Code:**
```python
def calculate_verified_match(raw_score: float, trust_score: float) -> float:
    return raw_score * (0.7 + 0.3 * trust_score)

# Example:
# 95 match + 0.20 trust → 72.2 verified (drops significantly!)
# 95 match + 0.90 trust → 92.15 verified (strong)
```

**Tests:**
- [ ] Formula applied to all matches
- [ ] Trust score acts as multiplier
- [ ] Unverified candidates ranked lower

### 4.2 Cross-Encoder Re-Ranking

**Files to Create:**
- `backend/matching/cross_encoder.py`

**Key Implementation:**
```python
# Use pre-trained: cross-encoder/ms-marco-MiniLM-L-6-v2
model = CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')

# For each user-job pair:
similarity_scores = model.predict([[resume_text, job_text]])
```

**Tests:**
- [ ] Re-ranking improves top-10 quality
- [ ] Latency < 100ms per pair

### 4.3 Semantic Caching + Cold Start

**Files to Create:**
- `backend/cache/semantic_cache.py`
- `backend/cache/warmup.py`

**Key Implementation:**
```python
async def warmup_redis():
    # Load top 500 jobs
    # Generate embeddings
    # Store in Redis with 30-day TTL
    # Reduces first-user latency 5s → 500ms
```

**Tests:**
- [ ] Warmup completes in < 5 minutes
- [ ] Cache hits on first query
- [ ] Latency reduced significantly

### 4.4 Skill Normalization

**Files to Create:**
- `backend/matching/skill_normalizer.py`

**Key Code:**
```python
class JobSkillSchema(BaseModel):
    required_skills: list[JobSkill]
    
    @field_validator("required_skills")
    def normalize_weights(cls, skills):
        total = sum(s.weight for s in skills)
        for s in skills:
            s.normalized_weight = s.weight / total
        return skills
```

**Tests:**
- [ ] Weights sum to 1.0
- [ ] At least one high-priority skill (>= 0.7)
- [ ] Normalized weights stored in DB

---

## 🧠 PHASE 5: CHATBOT + LANGGRAPH (WEEK 8-10)

### 5.1 LangGraph State Definition

**Files to Create:**
- `backend/agentic/state.py`
- `backend/agentic/graph.py`

**Key Code:**
```python
class AgentState(TypedDict):
    user_id: str
    job_id: Optional[int]
    resume_context: dict
    jd_context: dict
    match_score: float
    messages: Annotated[List, "add_messages"]
    agent_decision: str  # "analyze", "simulate", "roadmap", "pitch"
```

### 5.2 LangGraph Nodes

**Files to Create:**
- `backend/agentic/nodes/*.py`

**Nodes:**
1. IntentClassifier (detect what user wants)
2. Ingestor (structure data from JD + resume)
3. RAG_Retriever (fetch context from Redis)
4. Matcher (calculate score + evidence)
5. GapAnalyzer (identify missing skills)
6. TrendAnalyzer (predict market trends)
7. CulturalFitAnalyzer (vibe check)
8. Ghostwriter (draft content)
9. MockInterviewAgent (simulate interview)
10. RoadmapGenerator (30-day learning plan)
11. ResponseGenerator (compile response)

**Tests:**
- [ ] Each node produces expected output
- [ ] Graph routes correctly based on intent
- [ ] State properly threaded through nodes

### 5.3 Mock Interview Agent

**Files to Create:**
- `backend/agentic/mock_interview.py`

**Key Features:**
- Generate 5 questions (3 technical, 2 behavioral)
- Evaluate answers on rubric (0-100 scale)
- Real-time feedback
- Resume from Redis if user reconnects

**Tests:**
- [ ] Questions generated correctly
- [ ] Scoring accurate
- [ ] Session persisted in Redis

### 5.4 Roadmap Generator

**Files to Create:**
- `backend/agentic/roadmap.py`

**Key Features:**
- Identify high-priority skills
- 4-week structure (Week 1: fundamentals, etc.)
- Suggest resources (Kaggle, GitHub, courses)
- Prioritize by market velocity

**Tests:**
- [ ] 4-week structure generated
- [ ] Resources relevant to skill
- [ ] Market trends incorporated

---

## 🎨 PHASE 6: FRONTEND (WEEK 11-12)

### 6.1 React Components

**Files to Create:**
- `frontend/src/components/GlobalAIChatbot.jsx`
- `frontend/src/components/JobCard.jsx`
- `frontend/src/components/SkillPill.jsx`
- `frontend/src/components/MockInterviewCard.jsx`
- `frontend/src/components/RoadmapTimeline.jsx`

**Key Features:**
- Streaming responses (word-by-word)
- Real-time evaluation bars
- Error boundaries per component
- Mobile responsive

**Tests:**
- [ ] Components render without errors
- [ ] Streaming works smoothly
- [ ] Error boundaries catch exceptions

### 6.2 Pages

**Files to Create:**
- `frontend/src/pages/Discover.jsx` (Job discovery)
- `frontend/src/pages/JobDetail.jsx` (Deep analysis)
- `frontend/src/pages/Profile.jsx` (User profile)
- `frontend/src/pages/Dashboard.jsx` (HR dashboard)

**Tests:**
- [ ] Pages load data correctly
- [ ] Infinite scroll works
- [ ] Filters functional

---

## 👥 PHASE 7: HR FEATURES (WEEK 13-14)

### 7.1 Company Dashboard

**Features:**
- Job postings with analysis status
- Candidate applications ranked by verified match
- Lookalike search (find hidden talent)
- Blind rank toggle (mask names)

**Tests:**
- [ ] Candidates ranked by verified match score
- [ ] Blind rank hides sensitive info
- [ ] Lookalike search finds similar candidates

### 7.2 Lookalike Search

**Implementation:**
```python
async def find_lookalikes(top_performer_id: int):
    # 1. Fetch top performer's embedding
    # 2. Query Redis: similarity > 0.75
    # 3. Re-rank with Cross-Encoder
    # 4. Return top 10
```

**Tests:**
- [ ] Returns candidates with similar profiles
- [ ] Re-ranking improves quality
- [ ] Latency acceptable

---

## 🔐 PHASE 8: COMPLIANCE + DEPLOY (WEEK 15-16)

### 8.1 DPDP Audit Logging

**Files to Create:**
- `backend/compliance/audit_logger.py`

**Rules:**
- Never log Aadhaar value
- Only log action names ("aadhaar_verified", etc.)
- Store timestamp, IP, user ID
- 2-year retention

**Tests:**
- [ ] Audit logs created correctly
- [ ] Aadhaar never appears in logs
- [ ] Audit trail queryable

### 8.2 Data Erasure Endpoint

**Files to Create:**
- `backend/compliance/erasure.py`

**Implementation:**
```python
async def delete_user_account(user_id: int):
    async with db.begin():
        # Atomic transaction
        await db.delete_user(user_id)
        await db.delete_resumes(user_id)
        await redis.delete_user_data(user_id)
        await db.log_erasure(user_id)
```

**Tests:**
- [ ] All user data deleted atomically
- [ ] Redis cache cleared
- [ ] Audit trail logs erasure
- [ ] No errors on re-delete

### 8.3 Docker + Kubernetes

**Files to Create:**
- `docker-compose.yml`
- `kubernetes/deployment.yaml`
- `kubernetes/service.yaml`

**Deployment:**
```bash
docker-compose up -d
kubectl apply -f kubernetes/deployment.yaml
```

**Tests:**
- [ ] Docker build succeeds
- [ ] All services start
- [ ] Health checks pass

### 8.4 Load Testing

**Tool:** Apache JMeter or Locust

**Scenarios:**
- 100 concurrent users searching jobs
- 50 users uploading resumes
- 20 LLM inference calls
- Monitor: response time, error rate, resource usage

**Target:** 
- p95 latency < 2s for /api/jobs
- p99 latency < 5s for LLM calls
- 0% error rate

---

## 🛠️ DEVELOPMENT TOOLS & SETUP

```bash
# Python dependencies
pip install fastapi uvicorn aiosqlite redis sqlalchemy pydantic-settings
pip install langchain langgraph openai python-dotenv
pip install transformers torch sentence-transformers
pip install celery[amqp] redis httpx

# Node dependencies (Frontend)
npm install react framer-motion axios zustand

# Database tools
brew install sqlite3 redis postgresql

# Redis Stack (Mac/Linux)
docker run -d -p 6379:6379 redis/redis-stack:latest

# n8n
docker run -d -p 5678:5678 n8nio/n8n

# Testing
pip install pytest pytest-asyncio pytest-cov locust

# Code quality
pip install black flake8 mypy ruff
```

---

## 📊 PROGRESS TRACKING TEMPLATE

```markdown
## Week 1: Foundation
- [x] Database schema created
- [x] JWT system implemented
- [x] Redis Stack deployed
- [x] Kaggle datasets ingested
- [ ] 100% test coverage

## Week 2: Foundation (cont.)
- [x] Auth endpoints tested
- [x] Token blacklist working
- [x] Database queries optimized
- [ ] Load testing (100 concurrent users)

## Week 3: LLM Safety
- [x] Pydantic schemas created
- [x] Retry + backoff system working
- [x] Cost tracking functional
- [ ] All LLM calls validated

... (continue for all 8 phases)
```

---

## ⚠️ CRITICAL GO/NO-GO CHECKPOINTS

**Before Phase 3:** 
- [ ] Database schema passes all tests
- [ ] JWT authentication working
- [ ] Redis connectivity confirmed

**Before Phase 5:**
- [ ] All LLM outputs validated (no hallucinations)
- [ ] Cost control system tracking usage
- [ ] Resume parsing working with > 88% F1

**Before Phase 6:**
- [ ] LangGraph graph routing tested
- [ ] Mock interview agent functional
- [ ] Roadmap generation working

**Before Phase 8:**
- [ ] All HR endpoints tested
- [ ] Lookalike search working
- [ ] Blind rank toggle functional

**Before Production:**
- [ ] Load test: 1000 concurrent users OK
- [ ] DPDP audit logging complete
- [ ] Data erasure tested
- [ ] Docker deployment tested
- [ ] SSL/TLS certificates configured

---

## 🚀 LAUNCH CHECKLIST

- [ ] All 8 phases complete
- [ ] 100% test coverage on critical paths
- [ ] Production secrets configured (.env)
- [ ] Database backups configured
- [ ] Monitoring dashboards set up
- [ ] Incident response plan documented
- [ ] Team trained on system architecture
- [ ] Documentation complete + examples
- [ ] Performance benchmarks met
- [ ] Security audit passed

---

**Ready to start building? Begin with Phase 1 (Week 1-2) focusing on the database schema + JWT system.**
