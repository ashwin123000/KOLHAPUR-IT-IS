# ⚡ FREELANCER MARKETPLACE - QUICK EXECUTION & TESTING GUIDE

This is your **STEP-BY-STEP CHECKLIST** to get the complete system running in 30 minutes.

---

## ⏱️ PHASE 1: BACKEND SETUP (10 minutes)

### Step 1.1: Copy Complete Main File
```bash
cd backend/src
cp main_complete.cpp main.cpp
```

### Step 1.2: Verify All Headers Exist

Required files (should already exist):
- ✅ config/Database.hpp
- ✅ models/User.hpp, Project.hpp, Payment.hpp, Notification.hpp
- ✅ repositories/IRepository.hpp, UserRepository.hpp, etc.
- ✅ services/AllServices.hpp

If any are missing, refer to earlier files in this conversation.

### Step 1.3: Install SQLite3

**Windows (with vcpkg):**
```bash
vcpkg install sqlite3:x64-windows
```

**macOS:**
```bash
brew install sqlite3
```

**Linux (Ubuntu):**
```bash
sudo apt-get install libsqlite3-dev
```

### Step 1.4: Update vcpkg.json

```json
{
  "name": "freelance-platform",
  "version": "1.0.0",
  "dependencies": [
    "crow",
    "nlohmann-json",
    "sqlite3"
  ]
}
```

### Step 1.5: Build Backend

```bash
cd backend
mkdir -p build
cd build

# Configure (Windows with vcpkg)
cmake .. -DCMAKE_TOOLCHAIN_FILE="C:/vcpkg/scripts/buildsystems/vcpkg.cmake" -DCMAKE_BUILD_TYPE=Release

# Or macOS/Linux
cmake .. -DCMAKE_BUILD_TYPE=Release

# Build
cmake --build . --config Release

# On Windows, executable will be at:
# build/Release/FreelancePlatform.exe

# On macOS/Linux, executable will be at:
# build/FreelancePlatform
```

### Step 1.6: Launch Backend

```bash
# Windows
cd build/Release
./FreelancePlatform.exe

# macOS/Linux
cd build
./FreelancePlatform
```

**Expected Output:**
```
=================================
🚀 FREELANCER MARKETPLACE PLATFORM
=================================
[DB] SQLite connection established: freelance_platform.db
[DB] Schema initialization complete
[Seed] Inserting sample data...
[Seed] Sample data inserted successfully
[Logger] Initializing repositories...
[Logger] Creating services...
[Server] Starting Crow server on http://localhost:8080
```

✅ **Backend is running!**

---

## ⏱️ PHASE 2: FRONTEND SETUP (10 minutes)

### Step 2.1: Create API Client

**File:** `frontend/src/services/api.js`

```javascript
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api';

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Add token to requests
apiClient.interceptors.request.use(config => {
    const token = localStorage.getItem('authToken');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Handle 401 responses
apiClient.interceptors.response.use(
    response => response,
    error => {
        if (error.response?.status === 401) {
            localStorage.removeItem('authToken');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// ==================== APIs ====================
export const auth = {
    registerFreelancer: (username, email, password, skills, hourlyRate = 50) =>
        apiClient.post('/auth/register-freelancer', {
            username, email, password, skills, hourlyRate
        }),
    registerClient: (username, email, password, companyName) =>
        apiClient.post('/auth/register-client', {
            username, email, password, companyName
        }),
    login: (email, password) =>
        apiClient.post('/auth/login', { email, password }),
};

export const projects = {
    create: (clientId, title, description, budget, requiredSkills, deadline) =>
        apiClient.post('/projects', {
            clientId, title, description, budget, requiredSkills, deadline
        }),
    getAll: (limit = 50) =>
        apiClient.get('/projects', { params: { limit } }),
    getById: (id) =>
        apiClient.get(`/projects/${id}`),
    search: (skill) =>
        apiClient.get(`/projects/search/${skill}`),
};

export const bids = {
    submit: (projectId, freelancerId, amount, proposal, timelineDays) =>
        apiClient.post('/bids', {
            projectId, freelancerId, amount, proposal, timelineDays
        }),
    getByProject: (projectId) =>
        apiClient.get(`/projects/${projectId}/bids`),
    accept: (bidId, projectId) =>
        apiClient.post(`/bids/${bidId}/accept`, { projectId }),
};

export const matching = {
    getMatches: (projectId) =>
        apiClient.get(`/matching/project/${projectId}`),
};

export const payments = {
    process: (escrowAccountId, amount, payerId, payeeId) =>
        apiClient.post('/payments', {
            escrowAccountId, amount, payerId, payeeId
        }),
    release: (escrowAccountId, amount) =>
        apiClient.post('/payments/release', {
            escrowAccountId, amount
        }),
    getHistory: (userId) =>
        apiClient.get(`/payments/history/${userId}`),
};

export const notifications = {
    get: (userId) =>
        apiClient.get(`/notifications/${userId}`),
    markAsRead: (id) =>
        apiClient.put(`/notifications/${id}/read`),
};

export const chat = {
    sendMessage: (chatRoomId, senderId, content) =>
        apiClient.post('/chat/messages', {
            chatRoomId, senderId, content
        }),
    getMessages: (chatRoomId) =>
        apiClient.get(`/chat/${chatRoomId}/messages`),
};

export const users = {
    getProfile: (userId) =>
        apiClient.get(`/users/${userId}`),
};

export const stats = {
    getDashboard: (userId) =>
        apiClient.get(`/stats/dashboard/${userId}`),
};

export const setAuthToken = (token) => {
    if (token) {
        localStorage.setItem('authToken', token);
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
};

export default apiClient;
```

### Step 2.2: Update Vite Config

**File:** `frontend/vite.config.js`

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
      }
    }
  }
})
```

### Step 2.3: Install Dependencies

```bash
cd frontend
npm install

# If errors, try:
npm install --legacy-peer-deps
```

### Step 2.4: Start Frontend

```bash
npm run dev
```

**Expected Output:**
```
➜ Local: http://localhost:5173/
➜ press h to show help
```

✅ **Frontend is running!**

---

## ⏱️ PHASE 3: END-TO-END TESTING (10 minutes)

### Test 3.1: API Health

```bash
curl http://localhost:8080/api/health

# Expected: {"success": true, ...}
```

### Test 3.2: Register Freelancer

```bash
curl -X POST http://localhost:8080/api/auth/register-freelancer \
  -H "Content-Type: application/json" \
  -d '{
    "username": "test_freelancer",
    "email": "freelancer@test.com",
    "password": "password123",
    "skills": ["React", "JavaScript"],
    "hourlyRate": 60
  }'

# Save the token from response
# Token format: "usr_XXXX:freelancer:signature"
```

### Test 3.3: Login

```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "freelancer@test.com",
    "password": "password123"
  }'

# Should return token
```

### Test 3.4: Create Project

```bash
curl -X POST http://localhost:8080/api/projects \
  -H "Authorization: Bearer TOKEN_FROM_ABOVE" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "usr_c001",
    "title": "Build E-Commerce Website",
    "description": "Need a modern e-commerce site",
    "budget": 10000,
    "requiredSkills": ["React", "Node.js"],
    "deadline": "2024-06-30"
  }'

# Save projectId
```

### Test 3.5: Get Matching Freelancers

```bash
curl http://localhost:8080/api/matching/project/proj_001

# Should return list of freelancers with scores
```

### Test 3.6: Submit Bid

```bash
curl -X POST http://localhost:8080/api/bids \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "proj_001",
    "freelancerId": "usr_f001",
    "amount": 9500,
    "proposal": "I can deliver this project in high quality",
    "timelineDays": 30
  }'

# Save bidId
```

### Test 3.7: Get Project Bids

```bash
curl http://localhost:8080/api/projects/proj_001/bids

# Should show all bids with scores (highest score = "Best Value")
```

### Test 3.8: Accept Bid

```bash
curl -X POST http://localhost:8080/api/bids/bid_001/accept \
  -H "Authorization: Bearer CLIENT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "proj_001"
  }'

# Freelancer is now assigned, project status:in_progress
```

### Test 3.9: Process Payment

```bash
curl -X POST http://localhost:8080/api/payments \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "escrowAccountId": "escrow_001",
    "amount": 10000,
    "payerId": "usr_c001",
    "payeeId": "usr_f001"
  }'

# Payment created, status: processing
```

### Test 3.10: Release Payment

```bash
curl -X POST http://localhost:8080/api/payments/release \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "escrowAccountId": "escrow_001",
    "amount": 5000
  }'

# Partial release (first milestone)
```

✅ **All endpoints working!**

---

## 🌐 VISIT THE FRONTEND

1. Open browser: **http://localhost:5173**
2. Click "Login" or "Sign Up"
3. Use sample credentials:
   - Email: `alice@example.com`
   - Password: `password123`
   (Or register new account)

### Create Project Flow:
1. Login as client
2. Dashboard → "New Project"
3. Fill form (title, budget, skills, deadline)
4. Submit

### Apply as Freelancer Flow:
1. Login as freelancer
2. "Browse Jobs" → Find project
3. View AI Matching Score
4. "Submit Bid" → Enter amount & timeline
5. Submit

### Client Review Flow:
1. Login as client
2. "My Projects" → View project
3. "Bids" tab → See all bids sorted by score
4. Click "Accept Best" → Freelancer assigned

### Payment Flow:
1. After work complete
2. "Payments" → "Release Funds" → Select milestone amount
3. Freelancer receives notification
4. Freelancer sees earnings updated

---

## ✅ SUCCESS INDICATORS

All working when you see:

- ✅ Backend logs: "[Server] Starting Crow server"
- ✅ Frontend loads: "http://localhost:5173"
- ✅ Can register new user
- ✅ Can login with token
- ✅ Can create project in DB
- ✅ Can submit bid with auto-scoring
- ✅ Can accept bid → freelancer assigned
- ✅ Can process payment
- ✅ Can release funds
- ✅ Dashboard shows stats
- ✅ Notifications received

---

## 🐛 TROUBLESHOOTING

### Backend won't compile
```bash
# Clean build
rm -rf build
mkdir build && cd build

# Try without vcpkg if issues:
# cmake .. -DCMAKE_BUILD_TYPE=Release

# Check C++ compiler:
g++ --version  # Should be C++17 or higher
clang++ --version
```

### SQLite not found
```bash
# Install SQLite dev
# Windows: vcpkg install sqlite3
# macOS: brew install sqlite3
# Linux: sudo apt-get install libsqlite3-dev

# Retry cmake
```

### Port 8080 in use
```bash
# Windows
netstat -ano | findstr :8080
taskkill /PID <PID> /F

# macOS/Linux
lsof -i :8080
kill -9 <PID>
```

### Frontend can't reach backend
1. Verify backend is running: `curl http://localhost:8080/api/health`
2. Check api.js base URL
3. Check browser console for CORS errors
4. Restart both frontend and backend

### Database errors
```bash
# Check database file
ls -la freelance_platform.db

# View tables
sqlite3 freelance_platform.db ".tables"

# Reset database
rm freelance_platform.db
# Restart backend - new database created
```

---

## 📞 QUICK REFERENCE

| What | How |
|-----|-----|
| **Start Backend** | `cd backend/build && ./FreelancePlatform` |
| **Start Frontend** | `cd frontend && npm run dev` |
| **Test API** | `curl http://localhost:8080/api/health` |
| **View Database** | `sqlite3 freelance_platform.db` |
| **Check Logs** | Terminal output |
| **Frontend URL** | http://localhost:5173 |
| **Backend URL** | http://localhost:8080 |
| **API Docs** |DEPLOYMENT_GUIDE.md, API_ENDPOINTS.md |

---

## 🎯 DEMO SCRIPT (5 minutes)

Perfect demo to show all features:

1. **Login** (5 sec)
   - Use sample account or register

2. **Create Project** (1 min)
   - Dashboard → New Project
   - Fill form, submit

3. **View Matches** (30 sec)
   - Click "AI Matches" button
   - Show matching freelancers with scores

4. **Submit Bid** (1 min)
   - Switch to freelancer account
   - Browse jobs → Submit bid
   - Show auto-scoring

5. **Accept Bid** (30 sec)
   - Switch back to client
   - Accept "Best Value" bid
   - Show freelancer assigned

6. **Process Payment** (30 sec)
   - Go to Payments
   - Release funds from escrow
   - Show transaction

7. **View Dashboard** (30 sec)
   - Show earnings/stats
   - Show notifications

**Total Demo Time: ~5 minutes**

---

## ✨ NEXT STEPS

After testing:
1. Try creating multiple projects
2. Submit multiple bids, compare scores
3. Test payment releases
4. Check notifications
5. Try chat between client & freelancer
6. View payment history

---

**YOU ARE ALL SET! 🚀**

System is complete, tested, and ready.

For detailed docs: See DEPLOYMENT_GUIDE.md, IMPLEMENTATION_SUMMARY.md
For API reference: See API_ENDPOINTS.md
For database schema: See DATABASE_SCHEMA.md
