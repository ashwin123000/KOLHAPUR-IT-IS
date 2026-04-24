# Full-Stack Debug & Fix Guide

## 🔍 Current Issues Identified

### Backend Status
✅ **CORS is already enabled** (lines 40-48 in `fastapi_backend/main.py`)
✅ **Endpoints exist**:
- `/api/health` - Health check
- `/api/auth/upload-resume` - Resume upload and parsing
- `/api/auth/check-aadhaar` - Aadhaar availability check
- `/api/auth/register-v2` - V2 registration
- `/api/auth/login-v2` - V2 login with full_name return
- All project/application/ratings/payments endpoints

### Frontend Status  
✅ **Vite proxy is configured** (vite.config.js forwards `/api/*` to `http://localhost:8000`)
✅ **API client has correct methods** (frontend/src/services/api.js)
⚠️ **Potential Issue**: API calls might fail silently if backend isn't running

### Known Issues
1. **Dummy data fallbacks**: If API fails, components show zero/empty values
2. **Missing error logging**: No console.logs to see what's failing
3. **No API health check on startup**: Frontend doesn't verify backend is alive
4. **Missing Aadhaar test endpoint**: Only check-availability exists, no full test flow

---

## 🚀 What We're Fixing

### 1. **Enhanced Backend Logging**
   - All endpoints will log requests with timestamps
   - Error responses will be logged
   - CORS issues will be visible

### 2. **Enhanced Frontend Logging**
   - All API calls logged with request/response
   - Network errors captured
   - Failed state vs no-data state differentiated

### 3. **Aadhaar Full Test Flow**
   - Create test endpoint: `POST /api/test/aadhaar-flow`
   - Tests: upload → check → register

### 4. **Verification Checklist**
   - Step-by-step test procedures
   - Network inspection guide
   - Data flow validation

---

## 📊 Data Flow (What Should Happen)

```
User Registers
    ↓
Frontend Form State Updated
    ↓
Upload Resume (multipart/form-data POST)
    ↓
Backend parses PDF, returns parsed data
    ↓
Frontend displays prefilled data with AI badge
    ↓
User enters Aadhaar (12 digits)
    ↓
Debounced Frontend check (600ms)
    ↓
GET /api/auth/check-aadhaar?aadhaar=123456789012
    ↓
Backend checks if hash exists in DB
    ↓
Returns { available: true/false }
    ↓
Frontend shows green/red indicator
    ↓
User clicks Register
    ↓
POST /api/auth/register-v2 with full form
    ↓
Backend validates, hashes, inserts in transaction
    ↓
Returns { userId }
    ↓
Frontend shows success toast, redirects
```

---

## 🔧 Fixed Files

See the companion files:
- `ENHANCED_BACKEND_MAIN.py` - Backend with logging
- `ENHANCED_API_CLIENT.js` - Frontend API client with error handling
- `TEST_ENDPOINTS.md` - How to test each endpoint
- `VERIFICATION_CHECKLIST.md` - Step-by-step verification

---

## ⚡ Quick Start to Debug

### Terminal 1: Start Backend
```powershell
cd fastapi_backend
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
**Watch for**: `INFO: Application startup complete`

### Terminal 2: Start Frontend
```powershell
cd frontend
npm run dev
```
**Watch for**: `VITE v... ready in XXXms` and proxy logs like `[proxy →] POST /api/auth/login`

### Terminal 3: Test
```powershell
# Test health check
Invoke-RestMethod -Uri http://localhost:8000/api/health -Method GET
# Should return: { "status": "healthy", "timestamp": "..." }
```

### Browser: Open http://localhost:5173 or http://localhost:3173
**Watch the browser console** for API logs and errors.

---

## 🎯 Common Issues & Fixes

| Issue | Symptom | Fix |
|-------|---------|-----|
| Backend not running | API calls timeout or fail with "Failed to fetch" | Run `uvicorn main:app --reload --host 0.0.0.0 --port 8000` |
| Wrong port | API returns 404 or Vite proxy logs errors | Ensure FastAPI on 8000, Frontend on 5173/3173 |
| CORS still blocked | Browser console: "Access-Control-Allow-Origin" | Verify lines 40-48 in main.py are present |
| Aadhaar not storing | Registration succeeds but Aadhaar not saved | Check SQL table has `aadhaar_lookup` and `aadhaar_secure_hash` columns |
| Resume parsing fails | "Could not extract text" error | Ensure PDF is text-based (not image-only scan) |
| Dummy data still showing | Stats show 0, no projects | Open browser DevTools → Network tab → check if API requests fail |

---

## 📋 Verification Steps (See VERIFICATION_CHECKLIST.md for Details)

1. ✅ Backend health check
2. ✅ CORS enabled verification
3. ✅ Login endpoint works
4. ✅ Registration endpoint works
5. ✅ Aadhaar check works
6. ✅ Resume upload works
7. ✅ Frontend state updates with real data
8. ✅ Full registration flow end-to-end

---

## 📚 File Structure

```
fastapi_backend/
  main.py               ← Backend (has CORS, endpoints)
  
frontend/
  vite.config.js        ← Proxy configuration
  src/
    services/
      api.js           ← API client methods
    pages/
      RegistrationFlow.jsx
      FreelancerDashboard.jsx
      ClientDashboard.jsx
```

---

## ✨ Key Takeaways

- **CORS IS enabled** but might be failing silently
- **All endpoints exist** but need verification they work
- **Logging is critical** for debugging the actual error
- **Test each API call independently** before full flow
- **Browser DevTools Network tab** is your best friend

