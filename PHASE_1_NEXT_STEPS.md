# Phase 1: Foundation — Immediate Next Steps

## STEP 1: Install PostgreSQL (5 min)
- [ ] Download PostgreSQL for Windows from https://www.postgresql.org/download/windows/
- [ ] Run installer, choose default port 5432
- [ ] Create database and user (SQL commands above)
- [ ] Test connection: `psql -U hiring_user -d hiring_os -h localhost`

## STEP 2: Install psycopg2 (2 min)
Once PostgreSQL is installed:
```bash
cd backend
pip install psycopg2-binary>=2.9.0
```

## STEP 3: Initialize Alembic (3 min)
```bash
cd backend
alembic init alembic
```

## STEP 4: Create Alembic Migration (5 min)
After initializing Alembic, replace `alembic/env.py` with the production version that:
- Imports your SQLAlchemy models
- Auto-detects schema changes
- Runs migrations on startup

## STEP 5: Create .env File (2 min)
```bash
cp .env.example .env
# Edit .env with your PostgreSQL credentials and API keys
```

## STEP 6: Create Auth Endpoints (30 min)
Implement:
- POST /auth/register
- POST /auth/login
- POST /auth/refresh
- POST /auth/logout
- GET /auth/me

## STEP 7: Test Full Auth Flow (10 min)
- Register a new user
- Login with email/password
- Verify JWT tokens work
- Test token refresh

## TIMELINE
- Total for Phase 1 completion: **~1 hour**
- Then Phase 2 (Resume parsing): **2-3 days**
- Then Phase 3 (Job matching): **1-2 days**

## CRITICAL FILES READY FOR USE
All these files are now in place and will work once PostgreSQL is set up:
- ✅ backend/config.py (Pydantic settings)
- ✅ backend/database_new.py (SQLAlchemy)
- ✅ backend/models/*.py (all ORM models)
- ✅ backend/auth/jwt_handler.py
- ✅ backend/auth/dependencies.py

## NEXT PHASE WILL ADD
- Resume PDF parsing (pdfplumber + OCR + Claude)
- Background job queue for async processing
- Resume status polling
- Structured data extraction

## NOTE: DATABASE MIGRATION STRATEGY
After Phase 1, you'll have:
1. Alembic migrations directory
2. Auto-generated migration for initial schema
3. Ability to version control all DB changes
4. Deploy-safe migrations for production

This is MUCH better than hardcoding `Base.metadata.create_all()` — this is production-grade.
