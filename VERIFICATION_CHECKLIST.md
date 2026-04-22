# 🎯 Complete Verification Checklist

## ✅ Pre-Flight Checks

- [ ] **Backend running**: `python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000`
- [ ] **Frontend running**: `npm run dev` (should be on port 5173 or 3173)
- [ ] **Database exists**: `fastapi_backend/freelance_market.db`
- [ ] **No errors in backend logs**: Check for Python tracebacks

---

## 🧪 Phase 1: Backend Health (Test in PowerShell)

### Test 1.1: Health Check Endpoint
```powershell
# Test if backend is running at all
Invoke-RestMethod -Uri http://localhost:8000/api/health -Method GET | ConvertTo-Json
```
**Expected**: Returns `{ "status": "healthy", "timestamp": "..." }`  
**If fails**: Backend not running or wrong port

### Test 1.2: CORS Test Endpoint
```powershell
Invoke-RestMethod -Uri http://localhost:8000/api/test/cors -Method GET | ConvertTo-Json
```
**Expected**: Returns `{ "message": "If you can read this, CORS is working!" }`  
**If fails**: Check CORS middleware in main.py

### Test 1.3: Test Status (Detailed)
```powershell
Invoke-RestMethod -Uri http://localhost:8000/api/test/status -Method GET | ConvertTo-Json
```
**Expected**: Shows database, Python version, logging status  
**If fails**: Backend missing this endpoint (update needed)

---

## 🧪 Phase 2: Auth Endpoints (Test in PowerShell)

### Test 2.1: Register Freelancer
```powershell
$body = @{
    username = "testuser123"
    email = "test@example.com"
    password = "SecurePass123!@#"
    full_name = "Test User"
    city = "New York"
    state = "NY"
    college = "Test University"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri http://localhost:8000/api/auth/register-freelancer `
  -Method POST `
  -Body $body `
  -ContentType "application/json"

$response | ConvertTo-Json
```
**Expected**: Returns `{ "success": true, "data": { "userId": "freelancer_..." } }`  
**If fails**: Check database, email duplication, or validation errors

### Test 2.2: Login
```powershell
$body = @{
    email = "test@example.com"
    password = "SecurePass123!@#"
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri http://localhost:8000/api/auth/login `
  -Method POST `
  -Body $body `
  -ContentType "application/json"

$response | ConvertTo-Json
```
**Expected**: Returns `{ "success": true, "data": { "token": "...", "userId": "...", "role": "freelancer" } }`  
**If fails**: Check credentials or password hashing

### Test 2.3: Check Aadhaar
```powershell
# Test 1: Aadhaar that doesn't exist
$response = Invoke-RestMethod -Uri "http://localhost:8000/api/auth/check-aadhaar?aadhaar=123456789012" `
  -Method GET

$response | ConvertTo-Json
```
**Expected**: Returns `{ "available": true, "message": "Aadhaar is available." }`

```powershell
# Test 2: Create a user with Aadhaar, then check it
# First register with Aadhaar
$body = @{
    username = "aadhaaruser"
    email = "aadhaar@example.com"
    password = "Pass123!@#"
    full_name = "Aadhaar Test"
    city = "Bangalore"
    state = "KA"
    college = "College"
    aadhaar = "999888777666"
} | ConvertTo-Json

Invoke-RestMethod -Uri http://localhost:8000/api/auth/register-freelancer `
  -Method POST `
  -Body $body `
  -ContentType "application/json"

# Now check that Aadhaar
$response = Invoke-RestMethod -Uri "http://localhost:8000/api/auth/check-aadhaar?aadhaar=999888777666" `
  -Method GET

$response | ConvertTo-Json
```
**Expected**: Returns `{ "available": false, "message": "This Aadhaar is already linked..." }`

---

## 🧪 Phase 3: Frontend-Backend Connection (Browser DevTools)

### Test 3.1: Open Browser Console
1. Open http://localhost:5173 (or 3173) in Chrome
2. Press `F12` to open DevTools
3. Click **Console** tab
4. Look for logs like:
   ```
   🚀 [API REQUEST] GET /api/health
   ✅ [API RESPONSE] GET /api/health - 200
   ```

### Test 3.2: Check Network Tab
1. Click **Network** tab
2. Reload page (`Ctrl+R`)
3. Look for API calls to `/api/...`
4. Click each one and check:
   - **Status**: Should be 200 (not 404, 500, or CORS error)
   - **Response**: Should have valid JSON
   - **Headers**: Should show `Access-Control-Allow-Origin: *` (or your domain)

**CORS Error Example**:
```
Access to XMLHttpRequest at 'http://localhost:8000/api/auth/login' 
from origin 'http://localhost:5173' has been blocked by CORS policy
```
**Fix**: Ensure CORS middleware in main.py includes all frontend ports

### Test 3.3: Login Flow
1. Navigate to `http://localhost:5173/login-freelancer`
2. Open Console tab
3. Enter credentials: `test@example.com` / `SecurePass123!@#`
4. Click Login
5. Watch Console for:
   ```
   🚀 [API REQUEST] POST /api/auth/login
   📨 Payload: { email: "test@example.com", password: "..." }
   ✅ [API RESPONSE] POST /api/auth/login - 200
   Response: { success: true, data: { token: "...", userId: "..." } }
   ```

**If CORS Error appears**:
```
❌ [API ERROR] POST /api/auth/login - 0 (No Status)
Message: Network Error
```
→ Backend not responding or CORS issue

### Test 3.4: Registration Flow
1. Navigate to `http://localhost:5173/signup-freelancer`
2. Open Console tab
3. Upload a PDF resume
4. Watch for:
   ```
   📄 [UPLOAD_RESUME] Starting upload for: resume.pdf
   📤 [UPLOAD_PROGRESS] 100%
   ✅ [API RESPONSE] POST /api/auth/upload-resume - 200
   Parsed: { full_name: "...", email: "...", skills: [...], confidence: 85 }
   ```

**If upload fails**:
```
❌ [API ERROR] POST /api/auth/upload-resume - 413
Message: File too large. Max 10MB.
```
→ Reduce PDF size or check max file size in backend

### Test 3.5: Aadhaar Check
1. In registration form, enter Aadhaar: `123456789012`
2. Wait 600ms
3. Watch Console for:
   ```
   🔍 [CHECK_AADHAAR] Checking availability for: ****6789012
   ✅ [API RESPONSE] GET /api/auth/check-aadhaar - 200
   Response: { available: true, message: "..." }
   ```

**UI should show**: Green checkmark "Available" next to Aadhaar field

---

## 🧪 Phase 4: Full Registration Flow

### Step 1: Resume Upload
- [ ] Upload PDF file
- [ ] See prefilled data (name, email, skills)
- [ ] Confidence score shown (e.g., 85%)
- [ ] No errors in Console

### Step 2: Verify Data
- [ ] All fields populated correctly
- [ ] AI-filled fields have green border + "Auto-filled" badge
- [ ] Can edit any field
- [ ] Skills shown in list

### Step 3: Enter Aadhaar
- [ ] Aadhaar field accepts only 12 digits
- [ ] Masked display shows: `**** **** 1234`
- [ ] After 600ms delay, shows "Available" or "Already taken"
- [ ] Green/red indicator changes

### Step 4: Complete Registration
- [ ] All required fields filled
- [ ] Password strength shows "Strong" (green)
- [ ] "Create Account" button enabled
- [ ] Click button
- [ ] Wait for success toast: "🎉 Account created!"
- [ ] Redirects to login page

### Step 5: Verify in Database
```powershell
# Check if user was created
$response = Invoke-RestMethod -Uri "http://localhost:8000/api/auth/login" `
  -Method POST `
  -Body (@{ email = "yournewemail@example.com"; password = "yourpassword" } | ConvertTo-Json) `
  -ContentType "application/json"

$response | ConvertTo-Json
```
**Expected**: Returns valid token and userId

---

## 🧪 Phase 5: Dashboard Data Flow

### Test 5.1: Freelancer Dashboard
1. Login as freelancer
2. Navigate to `/freelancer-dashboard`
3. Check Console for:
   ```
   📊 [STATS_FREELANCER] Fetching stats for freelancer: freelancer_abc123
   ✅ [API RESPONSE] GET /api/stats/freelancer_abc123/freelancer - 200
   ```
4. Dashboard should show:
   - [ ] Total Projects (number, not 0 or placeholder)
   - [ ] Completed Projects (number)
   - [ ] Active Projects (number)
   - [ ] Total Earnings (currency)
   - [ ] Average Rating (stars)
   - [ ] Reliability Score (percentage)

**If showing zeros**:
- Check Network tab → do API calls fail?
- Check Console → any `[API ERROR]` messages?
- Backend might not have any project data for this user

### Test 5.2: Client Dashboard  
1. Login as client
2. Navigate to `/`
3. Click "Dashboard" or navigate to `/client-dashboard`
4. Check Console for stats fetch
5. Should show:
   - [ ] Total Projects (number)
   - [ ] Open Projects
   - [ ] Active Projects
   - [ ] Completed Projects
   - [ ] Total Spent (currency)

---

## 🧪 Phase 6: Data Integrity Tests

### Test 6.1: Aadhaar Hashing
```powershell
# After registering with Aadhaar, verify it's hashed (not stored plain)
# Check in SQLite
sqlite3 fastapi_backend/freelance_market.db

# In SQLite prompt:
SELECT id, email, aadhaar_lookup, aadhaar_secure_hash FROM users WHERE email = 'test@example.com';
```
**Expected**: 
- `aadhaar_lookup`: 64-char hex string (SHA256)
- `aadhaar_secure_hash`: 64-char hex string (salted SHA256)
- **NOT**: Plain Aadhaar like "123456789012"

### Test 6.2: Password Hashing
```powershell
# Verify password is bcrypt-hashed (not plain)
sqlite3 fastapi_backend/freelance_market.db

# In SQLite prompt:
SELECT id, email, password FROM users WHERE email = 'test@example.com';
```
**Expected**: Password starts with `$2b$` (bcrypt) or `$2a$`  
**NOT**: Plain text or simple MD5

---

## 🚨 Troubleshooting

### Issue: "Failed to fetch" in Console
**Cause**: Backend not running or wrong port  
**Fix**: 
```powershell
# Start backend on correct port
cd fastapi_backend
python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Issue: CORS Error in Console
**Cause**: Frontend origin not in CORS allow_origins list  
**Fix**: Update lines 40-48 in `fastapi_backend/main.py`:
```python
allow_origins=[
    "http://localhost:3173",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    # Add any other ports you're using
]
```

### Issue: Aadhaar check returns "available" even when registered
**Cause**: Database not persisting or hash mismatch  
**Fix**:
```powershell
# Verify database file exists
Test-Path fastapi_backend/freelance_market.db

# Check if user table has the columns
sqlite3 fastapi_backend/freelance_market.db
SELECT sql FROM sqlite_master WHERE name = 'users';
# Should show aadhaar_lookup and aadhaar_secure_hash columns
```

### Issue: Resume upload fails with "Could not extract text"
**Cause**: PDF is scanned image, not text-based  
**Fix**: Use a proper PDF with selectable text (e.g., from Google Docs export)

### Issue: Dummy data still showing
**Cause**: API calls failing silently with fallback values  
**Fix**:
1. Open Console (`F12`)
2. Look for red `[API ERROR]` messages
3. Check Network tab to see actual HTTP errors
4. Verify backend is running and logs show requests

---

## ✨ Success Criteria

You'll know everything is working when:

✅ Console shows blue `[API REQUEST]` and green `[API RESPONSE]` logs  
✅ All Network tab calls show status 200  
✅ Registration completes and redirects to login  
✅ Login works and shows dashboard with real data  
✅ Aadhaar field shows "Available" / "Already taken" correctly  
✅ Dashboard shows actual project/earning data (not zeros)  
✅ Resume upload parses and prefills form  
✅ All state updates cause UI re-render with real data  

If any of these aren't working → follow the traceback in the error logs!

---

## 📞 Quick Reference

| Action | Command |
|--------|---------|
| Start Backend | `cd fastapi_backend && python -m uvicorn main:app --reload` |
| Start Frontend | `cd frontend && npm run dev` |
| View Backend Logs | Keep terminal running (watch for `INFO:` messages) |
| View Frontend Logs | `F12` → Console tab in browser |
| Check Network Calls | `F12` → Network tab, reload page |
| Connect to Database | `sqlite3 fastapi_backend/freelance_market.db` |
| Kill Backend Process | `Ctrl+C` in backend terminal |
| Clear Cache | `Ctrl+Shift+Delete` in browser |

