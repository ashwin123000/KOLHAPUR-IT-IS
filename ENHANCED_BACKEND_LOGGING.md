"""
Enhanced Backend Starter Code
====================================

Add this to the TOP of your fastapi_backend/main.py (before any imports)
to enable request/response logging for ALL endpoints.

This code hooks into FastAPI's middleware to log every request and response,
making debugging much easier.

"""

# ============================================================================
# ADD THIS SECTION BEFORE app = FastAPI() IN YOUR main.py
# ============================================================================

import time
import json
from fastapi import Request
from fastapi.responses import Response

# Create a logging middleware
async def log_requests(request: Request, call_next):
    """
    Middleware to log all incoming requests and outgoing responses.
    This helps debug API call failures.
    """
    start_time = time.time()
    
    # Log the request
    logger.info(f"\n{'='*70}")
    logger.info(f"📨 REQUEST: {request.method} {request.url.path}")
    logger.info(f"   Query: {dict(request.query_params)}" if request.query_params else "")
    
    # Try to log request body for POST/PUT
    if request.method in ["POST", "PUT", "PATCH"]:
        try:
            body = await request.body()
            if body:
                try:
                    logger.info(f"   Body: {body.decode('utf-8')[:500]}")
                except:
                    logger.info(f"   Body: [binary data]")
        except:
            pass
    
    # Call the actual endpoint
    response = await call_next(request)
    
    # Log the response
    process_time = time.time() - start_time
    logger.info(f"✓ RESPONSE: {response.status_code} (took {process_time:.2f}s)")
    logger.info(f"{'='*70}\n")
    
    # Add timing header
    response.headers["X-Process-Time"] = str(process_time)
    return response


# ============================================================================
# Add this line AFTER creating your FastAPI app instance:
# ============================================================================

# app = FastAPI()
# >>> ADD THIS LINE BELOW <<<
# app.add_middleware(fastapi.middleware.base.BaseHTTPMiddleware, dispatch=log_requests)

# But BEFORE the CORS middleware! So it should look like:
"""
app = FastAPI()
app.add_middleware(
    BaseHTTPMiddleware,
    dispatch=log_requests
)
app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[...],
    ...
)
"""

# ============================================================================
# VERIFY CORS SETUP
# ============================================================================

# Your CORS setup should look like this (currently in main.py around line 40):

"""
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3173",
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
"""

# If you see CORS errors in browser console, add "*" to allow_origins:
"""
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins (dev only!)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
"""

# ============================================================================
# ENHANCED ENDPOINT LOGGING EXAMPLES
# ============================================================================

# For each endpoint, add logging like this:

@app.post("/api/auth/upload-resume")
async def upload_resume(file: UploadFile = File(...)):
    logger.info(f"📄 [UPLOAD_RESUME] File: {file.filename}, Size: {len(await file.read())} bytes")
    await file.seek(0)  # Reset file pointer
    
    # ... rest of function ...
    
    logger.info(f"✅ [UPLOAD_RESUME] Success: parsed {len(parsed.get('skills', []))} skills")
    return {"success": True, "parsed": parsed}


@app.get("/api/auth/check-aadhaar")
async def check_aadhaar(aadhaar: str = Query(...)):
    logger.info(f"🔍 [CHECK_AADHAAR] Checking: {aadhaar[-4:].rjust(12, '*')}")  # Masked
    
    aadhaar_lookup = hashlib.sha256(aadhaar.encode()).hexdigest()
    # ... check DB ...
    
    logger.info(f"✅ [CHECK_AADHAAR] Available: {not exists}")
    return {"available": not exists}


@app.post("/api/auth/register-v2")
async def register_freelancer_v2(data: FreelancerRegisterV2):
    logger.info(f"📝 [REGISTER_V2] Email: {data.email}, Aadhaar: {data.aadhaar[-4:].rjust(12, '*')}")
    
    # ... validation ...
    
    try:
        # ... insert into DB ...
        logger.info(f"✅ [REGISTER_V2] Success: Created user {user_id}")
        return {"success": True, "data": {"userId": user_id}}
    except Exception as e:
        logger.error(f"❌ [REGISTER_V2] Failed: {str(e)}")
        raise


# ============================================================================
# TESTING ENDPOINT (Add to main.py)
# ============================================================================

@app.get("/api/test/status")
async def test_status():
    """Quick health check with detailed info"""
    import sys
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "backend": "FastAPI",
        "database": "SQLite",
        "cors_enabled": True,
        "logging_enabled": True,
        "python_version": sys.version,
    }


@app.get("/api/test/cors")
async def test_cors():
    """Test CORS headers are present"""
    return {
        "message": "If you can read this, CORS is working!",
        "test": "Try making a request from http://localhost:5173"
    }


# ============================================================================
# ERROR HANDLING ENHANCEMENT
# ============================================================================

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    """Log all uncaught exceptions"""
    logger.error(f"❌ UNCAUGHT EXCEPTION: {type(exc).__name__}: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error. Check logs."}
    )

