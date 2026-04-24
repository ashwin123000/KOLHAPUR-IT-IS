# 🎯 ARCHITECT-X: DECISION MATRIX & COMMON PITFALLS

**Quick Reference for Developers During Implementation**

---

## 🚦 CRITICAL DECISION POINTS (When You're Unsure)

### Decision 1: "Should I cache this LLM response?"

| Scenario | Answer | Reason |
|----------|--------|--------|
| "What skills are trending?" | YES (24h TTL) | Identical query → identical answer |
| "Analyze my resume against Job X" | NO | User-specific; changes over time |
| "Get top 5 skill gaps" | YES (1h TTL) | User doesn't change skills hourly |
| "Mock interview Q3 feedback" | NO | User's answer is unique |

**Rule:** Cache if semantically identical queries have identical answers.

---

### Decision 2: "Does this need LLM or can I use rules?"

| Use Case | LLM? | Alternative |
|----------|------|-------------|
| Extract skills from resume | Maybe | NER model first (cheaper, deterministic) |
| Rank 50 jobs for user | No | Cross-Encoder (faster, cheaper) |
| Generate 30-day roadmap | YES | Too creative for rules |
| Score cultural fit | YES | Too subjective |
| Detect resume padding | YES | NLP analysis + rules combo |
| Extract job requirements | No | Regex + heuristics |

**Rule:** Use LLM only for creative/subjective tasks. Use ML models for ranking. Use rules/heuristics for extraction.

---

### Decision 3: "Where should I store this data?"

| Data | Store In | Reason | TTL |
|------|----------|--------|-----|
| User profile | aiosqlite | Persistent, queryable | Never |
| User skills | aiosqlite | Part of identity | Never |
| Job embeddings | Redis | Fast vector search | 30 days |
| Chat history | aiosqlite | Audit trail required | 90 days |
| Cached LLM response | Redis | Fast retrieval | 24 hours |
| Match score | aiosqlite | Historical tracking | Never |
| Skill velocity trends | aiosqlite | Analytics | Forever |
| GitHub profile (cached) | Redis | Fast lookup | 1 hour |
| Mock interview session | Redis | Fast resume | 48 hours |
| User preferences | Redis | Low-latency access | 30 days |

**Rule:** aiosqlite = permanent truth. Redis = temporary cache.

---

### Decision 4: "Should this be sync or async?"

| Operation | Sync? | Why |
|-----------|-------|-----|
| Validate JWT token | SYNC | Must be fast (every request) |
| Fetch job from DB | SYNC | < 10ms, no need to async |
| Call OpenAI API | ASYNC | 500ms-2s latency; block would be bad |
| Embed text (OpenAI) | ASYNC | 200ms latency; parallelizable |
| GitHub API call | ASYNC | 500ms+ latency; often batch calls |
| Train NER model | ASYNC | Hours; background task |
| Calculate skill trends | ASYNC | Expensive SQL; batch job |
| Hash Aadhaar | SYNC | < 1ms crypto operation |

**Rule:** Anything > 10ms should be async.

---

### Decision 5: "Should I use a queue for this?"

| Task | Queue? | Why | Queue Type |
|------|--------|-----|------------|
| Generate LLM match analysis | NO | Block user; show loading state | — |
| Score GitHub profile | NO | 500ms acceptable within response | — |
| Calculate 50-job batch matches | YES | Bulk operation; user doesn't wait | llm_tasks |
| Generate 30-day roadmap | MAYBE | If > 3 seconds, queue | llm_tasks |
| Train NER on new data | YES | Hours of work | analytics_tasks |
| Calculate skill velocity | YES | Batch job (nightly) | analytics_tasks |
| Send notification email | YES | Not critical path | analytics_tasks |
| Generate Aadhaar lookup hash | NO | < 1ms | — |
| Embed 10k jobs at startup | YES | Background warmup | embedding_tasks |

**Rule:** Queue only if task takes > 3s OR is bulk/batch.

---

### Decision 6: "What error should I return?"

| Scenario | HTTP Status | Response |
|----------|-------------|----------|
| Invalid Aadhaar format | 400 | `{"error": "Invalid Aadhaar format"}` |
| Aadhaar already registered | 409 | `{"error": "Aadhaar already registered"}` |
| User not found | 404 | `{"error": "User not found"}` |
| JWT token expired | 401 | `{"error": "Token expired"}` |
| Daily token limit reached | 429 | `{"error": "Daily limit reached", "reset_at": "..."}` |
| OpenAI API down | 503 | `{"error": "Service unavailable. Retry later."}` |
| Invalid input (Pydantic) | 422 | `{"error": "Validation failed", "details": {...}}` |
| GitHub API rate limit | 429 | `{"error": "GitHub rate limit. Retry in 60s"}` |
| LLM returned invalid JSON | 500 | `{"error": "Processing error. Try again."}` (+ log internally) |

**Rule:** Never expose internal errors to user. Log internally; return safe message.

---

### Decision 7: "When should I update the trust_score?"

| Action | Update? | Delta |
|--------|---------|-------|
| User registers | NO | Start at 0.0 |
| User adds GitHub URL | YES | +0.3 (if valid profile) |
| GitHub profile verified (public) | YES | +0.4 |
| GitHub profile verified (commits) | YES | +0.2 |
| User adds LinkedIn URL | YES | +0.1 |
| Resume padding detected | YES | -0.2 |
| Activity gaming detected | YES | -0.15 |
| Successful interview completed | YES | +0.05 |
| Failed background check | YES | -0.5 |

**Rule:** Only UPDATE trust_score when external proof changes. Never AUTO-UPDATE on schedule.

---

### Decision 8: "Should I recompute this or cache it?"

| Computation | Cache? | TTL | Trigger |
|-------------|--------|-----|---------|
| Verified match score for user-job pair | YES | 7 days | Invalidate if user skills change |
| Job embeddings | YES | 30 days | Invalidate if job description changes |
| User skill summary | YES | 1 day | Invalidate on manual update |
| Skill velocity trends | NO | — | Recompute nightly (always fresh) |
| Cultural fit analysis | YES | 3 days | Invalidate if company_vibe changes |
| GitHub profile summary | YES | 1 hour | Invalidate on manual sync |
| Mock interview score | NO | — | Always fresh (real-time grading) |

**Rule:** Cache if: (1) Expensive to compute + (2) Doesn't need constant freshness.

---

## ⚠️ COMMON PITFALLS & HOW TO AVOID THEM

### Pitfall 1: "I hardcoded the trust_score multiplier"

❌ WRONG:
```python
verified_score = raw_score * 0.8  # Magic number!
```

✅ RIGHT:
```python
TRUST_MULTIPLIER_BASE = 0.7
TRUST_MULTIPLIER_VARIANCE = 0.3

verified_score = raw_score * (TRUST_MULTIPLIER_BASE + TRUST_MULTIPLIER_VARIANCE * trust_score)
```

**Rule:** All hyperparameters go in `config.py`, not code.

---

### Pitfall 2: "I'm storing Aadhaar in audit logs"

❌ WRONG:
```python
logger.info(f"Registered user: {aadhaar}")  # GDPR VIOLATION!
```

✅ RIGHT:
```python
logger.info(f"Action: aadhaar_verified")  # Just the action name
await db.insert_audit_log(
    user_id=user_id,
    action="aadhaar_verified",
    details={"status": "success"}
    # NO aadhaar value!
)
```

**Rule:** Audit logs only store event NAMES and IDs, never sensitive values.

---

### Pitfall 3: "My LLM call has no fallback"

❌ WRONG:
```python
response = await openai.ChatCompletion.acreate(...)
return response["choices"][0]["message"]["content"]
```

✅ RIGHT:
```python
response = await retry_with_backoff(
    openai.ChatCompletion.acreate,
    max_retries=3,
    ...
)

if response is None:
    # Fallback to cache or placeholder
    cached = await get_cached_response(user_id, job_id)
    if cached:
        return cached
    else:
        return {"status": "processing", "message": "Try again in 30s"}
```

**Rule:** Every LLM call must have retry logic + fallback.

---

### Pitfall 4: "I'm not normalizing skill weights"

❌ WRONG:
```python
required_skills = [
    {"skill": "Python", "weight": 1.0},
    {"skill": "Go", "weight": 1.0},  # Sum = 2.0!
]
```

✅ RIGHT:
```python
total_weight = sum(s["weight"] for s in required_skills)
for skill in required_skills:
    skill["normalized_weight"] = skill["weight"] / total_weight

# Now: Python = 0.5, Go = 0.5 (sum = 1.0)
```

**Rule:** Validate weight sum == 1.0 in Pydantic validator.

---

### Pitfall 5: "I have no timeout on LLM calls"

❌ WRONG:
```python
response = await openai.ChatCompletion.acreate(
    model="gpt-4o-mini",
    messages=[...]
)  # Could hang forever!
```

✅ RIGHT:
```python
try:
    response = await asyncio.wait_for(
        openai.ChatCompletion.acreate(...),
        timeout=30.0  # seconds
    )
except asyncio.TimeoutError:
    logger.error("LLM call timed out")
    return None
```

**Rule:** All I/O operations must have timeouts.

---

### Pitfall 6: "My context window is huge"

❌ WRONG:
```python
# Including entire 10-message history + full job desc + full resume
context = f"{all_messages}\n{job_description}\n{resume_full}"
# 15,000 tokens! Wastes money + hits rate limits
```

✅ RIGHT:
```python
# Use priority stacking
context_parts = [
    (1, f"Viewing job: {job.title}"),  # Priority 1
    (2, f"Last message: {messages[-1]}"),  # Priority 2
    (3, f"Your skills: {', '.join(skills[:5])}"),  # Priority 3
]

# Keep total < 2000 tokens
total_tokens = sum(len(tokenize(p[1])) for p in context_parts)
```

**Rule:** Context window is a precious resource. Guard it fiercely.

---

### Pitfall 7: "I'm not validating LLM output"

❌ WRONG:
```python
response = await llm_chain.arun(input=prompt)
return response  # Could have hallucinations!
```

✅ RIGHT:
```python
response = await llm_chain.arun(input=prompt)

try:
    validated = LLMMatchResponse(**json.loads(response))
    return validated
except ValidationError as e:
    logger.error(f"LLM output invalid: {e}")
    # Retry with stricter prompt
    return await retry_with_stricter_prompt(prompt)
```

**Rule:** EVERY LLM output must be validated before storage.

---

### Pitfall 8: "I'm embedding everything"

❌ WRONG:
```python
# Embedding full 5000-word job description
embedding = await embed(full_job_description)
# Cost: $0.0003 per embedding × 50,000 jobs = $15/month
# But we only need key sections!
```

✅ RIGHT:
```python
# Embed only title + key skills + company vibe
key_sections = f"{job.title} {' '.join([s['skill'] for s in job.required_skills])} {job.company_vibe}"
embedding = await embed(key_sections)
# Cost: 90% cheaper!
```

**Rule:** Embed strategically. Only critical fields.

---

### Pitfall 9: "My queries are unindexed"

❌ WRONG:
```sql
SELECT * FROM job_matches WHERE verified_match_score > 80
-- Full table scan on 100k rows! 5s latency
```

✅ RIGHT:
```sql
CREATE INDEX idx_matches_verified_score ON job_matches(verified_match_score DESC);

-- Now: ~50ms with index
```

**Rule:** Index columns used in WHERE/JOIN/ORDER BY.

---

### Pitfall 10: "I forgot about timezone issues"

❌ WRONG:
```python
datetime.now()  # Local time! Will break when deployed globally
```

✅ RIGHT:
```python
from datetime import datetime, timezone
datetime.now(timezone.utc)  # Always UTC
```

**Rule:** Store timestamps in UTC. Convert to user timezone on display.

---

## 🛡️ SECURITY CHECKLIST (Avoid These)

- [ ] Never log passwords or Aadhaar
- [ ] Never return internal error messages to users
- [ ] Never trust client-provided user_id (use JWT)
- [ ] Always hash passwords (use bcrypt, never SHA256)
- [ ] Always validate Pydantic models (don't trust JSON)
- [ ] Always check JWT before accessing resources
- [ ] Always use HTTPS in production
- [ ] Always sanitize user input (prevent injection)
- [ ] Always rate-limit public endpoints
- [ ] Always audit sensitive operations

---

## 📊 PERFORMANCE CHECKLIST

- [ ] All database queries < 50ms (indexed)
- [ ] All LLM calls have timeout (30s)
- [ ] All external API calls cached (Redis)
- [ ] All responses < 5MB
- [ ] All endpoints handle 1000 concurrent users
- [ ] All embeddings batched (not one-by-one)
- [ ] All Redis keys have TTL
- [ ] All async operations use proper pooling
- [ ] All errors handled gracefully (no 500s)
- [ ] All logs structured (JSON format)

---

## 🧪 TESTING CHECKLIST

- [ ] Unit tests for all validators (Pydantic)
- [ ] Unit tests for all formulas (trust score, match score)
- [ ] Integration tests for database operations
- [ ] Integration tests for LLM+validation flow
- [ ] Integration tests for GitHub scraper
- [ ] Mock tests for all external APIs
- [ ] Load tests (1000 concurrent users)
- [ ] Chaos tests (API down, DB down, Redis down)
- [ ] Security tests (SQL injection, XSS)
- [ ] Performance tests (p95 < 2s for 90% of endpoints)

---

**Print this. Tape to monitor. Reference constantly during development.**
