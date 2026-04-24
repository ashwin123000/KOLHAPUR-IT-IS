# 🚀 COMPLETE FREELANCER MARKETPLACE - DEPLOYMENT & INTEGRATION GUIDE

## ⚙️ SYSTEM ARCHITECTURE OVERVIEW

```
React Frontend (Port 5173)
        ↓ REST API
C++ Crow Backend (Port 8080)
        ↓ SQL Queries
SQLite Database (freelance_platform.db)
```

---

## 📦 BACKEND SETUP & DEPLOYMENT

### Step 1: Install Dependencies

**Windows (using vcpkg):**
```bash
cd backend

# Install required packages
vcpkg install crow:x64-windows nlohmann-json:x64-windows sqlite3:x64-windows

# Update vcpkg.json with:
{
  "dependencies": [
    "crow",
    "nlohmann-json",
    "sqlite3"
  ]
}
```

### Step 2: Build the Backend

```bash
cd backend
mkdir build
cd build

# Configure with CMake
cmake .. -DCMAKE_TOOLCHAIN_FILE="[PATH_TO_VCPKG]/scripts/buildsystems/vcpkg.cmake"

# Build
cmake --build . --config Release

# Run
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
[Server] Starting Crow server on http://localhost:8080
```

### Step 3: Verify Backend is Running

```bash
# Test health endpoint
curl http://localhost:8080/api/health

# Expected response:
# {"success": true, "data": {"status": "healthy", "timestamp": "2024-03-26 14:30:00"}}
```

---

## 🎨 FRONTEND SETUP & INTEGRATION

### Step 1: Install Dependencies

```bash
cd frontend
npm install

# If needed, add missing packages:
npm install axios react-router-dom recharts tailwindcss
```

### Step 2: Configure API Base URL

**File: `frontend/src/services/api.js`**

Create or update this file:

```javascript
import axios from 'axios';

// API base URL - points to backend
const API_BASE_URL = 'http://localhost:8080/api';

// Create axios instance
const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Token management
let authToken = localStorage.getItem('authToken');

// Add token to all requests
apiClient.interceptors.request.use(config => {
    const token = localStorage.getItem('authToken');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Error handling
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

// ==================== AUTHENTICATION APIs ====================
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

// ==================== PROJECT APIs ====================
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
    updateStatus: (id, status) =>
        apiClient.put(`/projects/${id}`, { status }),
    assignFreelancer: (id, freelancerId) =>
        apiClient.post(`/projects/${id}/assign`, { freelancerId }),
};

// ==================== BID APIs ====================
export const bids = {
    submit: (projectId, freelancerId, amount, proposal, timelineDays) =>
        apiClient.post('/bids', {
            projectId, freelancerId, amount, proposal, timelineDays
        }),
    getByProject: (projectId) =>
        apiClient.get(`/projects/${projectId}/bids`),
    accept: (bidId, projectId) =>
        apiClient.post(`/bids/${bidId}/accept`, { projectId }),
    reject: (bidId) =>
        apiClient.post(`/bids/${bidId}/reject`),
};

// ==================== MATCHING APIs ====================
export const matching = {
    getMatches: (projectId) =>
        apiClient.get(`/matching/project/${projectId}`),
};

// ==================== PAYMENT APIs ====================
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

// ==================== NOTIFICATION APIs ====================
export const notifications = {
    get: (userId) =>
        apiClient.get(`/notifications/${userId}`),
    markAsRead: (notificationId) =>
        apiClient.put(`/notifications/${notificationId}/read`),
};

// ==================== CHAT APIs ====================
export const chat = {
    sendMessage: (chatRoomId, senderId, content) =>
        apiClient.post('/chat/messages', {
            chatRoomId, senderId, content
        }),
    getMessages: (chatRoomId) =>
        apiClient.get(`/chat/${chatRoomId}/messages`),
};

// ==================== USER APIs ====================
export const users = {
    getProfile: (userId) =>
        apiClient.get(`/users/${userId}`),
};

// ==================== STATS APIs ====================
export const stats = {
    getDashboard: (userId) =>
        apiClient.get(`/stats/dashboard/${userId}`),
};

// Setup token
export const setAuthToken = (token) => {
    if (token) {
        localStorage.setItem('authToken', token);
        apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
};

export default apiClient;
```

### Step 3: Update Vite Configuration

**File: `frontend/vite.config.js`**

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

### Step 4: Update Frontend Components

#### **Login Page Example**

**File: `frontend/src/pages/Login.jsx`**

```jsx
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth, setAuthToken } from '../services/api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await auth.login(email, password);
      
      if (response.data.success) {
        // Store token
        setAuthToken(response.data.data.token);
        
        // Redirect based on role
        const role = response.data.data.role;
        if (role === 'freelancer') {
          navigate('/freelancer-dashboard');
        } else {
          navigate('/client-dashboard');
        }
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-8">Login</h1>
        
        {error && (<div className="bg-red-100 text-red-700 p-3 mb-4 rounded">{error}</div>)}

        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p className="text-center mt-4">
          Don't have an account? <Link to="/signup" className="text-blue-600">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
```

#### **Projects Page Example**

**File: `frontend/src/pages/Clientprojects.jsx`**

```jsx
import { useState, useEffect } from 'react';
import { projects, setAuthToken } from '../services/api';

export default function ClientProjects() {
  const [projectList, setProjectList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // Set token from localStorage
    const token = localStorage.getItem('authToken');
    if (token) {
      setAuthToken(token);
    }

    // Fetch projects
    const fetchProjects = async () => {
      try {
        setLoading(true);
        const response = await projects.getAll();
        
        if (response.data.success) {
          setProjectList(response.data.data);
        }
      } catch (err) {
        setError('Failed to load projects');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, []);

  if (loading) return <div className="p-8">Loading...</div>;
  if (error) return <div className="p-8 text-red-600">{error}</div>;

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">Your Projects</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projectList.map((project) => (
          <div key={project.id} className="bg-white p-6 rounded-lg shadow-lg hover:shadow-xl transition">
            <h3 className="text-xl font-bold mb-2">{project.title}</h3>
            <p className="text-gray-600 mb-4">{project.description}</p>
            <div className="flex justify-between items-center">
              <span className="text-2xl font-bold text-blue-600">${project.budget}</span>
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                project.status === 'open' ? 'bg-green-100 text-green-800' :
                project.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {project.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Step 5: Run Frontend

```bash
cd frontend
npm run dev
```

Frontend will be available at `http://localhost:5173`

---

## 🧪 TESTING THE COMPLETE FLOW

### Test 1: User Registration

```bash
# Register as Freelancer
curl -X POST http://localhost:8080/api/auth/register-freelancer \
  -H "Content-Type: application/json" \
  -d '{
    "username": "alice_dev",
    "email": "alice@example.com",
    "password": "password123",
    "skills": ["React", "JavaScript"],
    "hourlyRate": 60
  }'

# Register as Client
curl -X POST http://localhost:8080/api/auth/register-client \
  -H "Content-Type: application/json" \
  -d '{
    "username": "bob_ceo",
    "email": "bob@startup.com",
    "password": "password123",
    "companyName": "TechCorp"
  }'
```

### Test 2: Login & Get Token

```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "alice@example.com",
    "password": "password123"
  }'

# Response contains TOKEN - use for authenticated requests
```

### Test 3: Create Project

```bash
curl -X POST http://localhost:8080/api/projects \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "clientId": "usr_c001",
    "title": "Build Mobile App",
    "description": "React Native app",
    "budget": 8000,
    "requiredSkills": ["React", "JavaScript"],
    "deadline": "2024-06-30"
  }'
```

### Test 4: Get AI Matches

```bash
curl -X GET http://localhost:8080/api/matching/project/proj_001
```

### Test 5: Submit Bid

```bash
curl -X POST http://localhost:8080/api/bids \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "proj_001",
    "freelancerId": "usr_f001",
    "amount": 7000,
    "proposal": "I can deliver this in 3 weeks",
    "timelineDays": 21
  }'
```

### Test 6: Accept Bid & Assign Freelancer

```bash
curl -X POST http://localhost:8080/api/bids/bid_001/accept \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "projectId": "proj_001"
  }'
```

### Test 7: Process Payment

```bash
curl -X POST http://localhost:8080/api/payments \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "escrowAccountId": "escrow_001",
    "amount": 8000,
    "payerId": "usr_c001",
    "payeeId": "usr_f001"
  }'
```

### Test 8: Release Payment

```bash
curl -X POST http://localhost:8080/api/payments/release \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "escrowAccountId": "escrow_001",
    "amount": 2000
  }'
```

---

## 🗄️ DATABASE SCHEMA

Database file: `freelance_platform.db` (SQLite)

**Tables:**
- users (base user data)
- clients (client-specific)
- freelancers (freelancer-specific)
- projects (project listings)
- milestones (project milestones)
- bids (project bids)
- payments (payment records)
- escrow_accounts (escrow management)
- invoices (invoice tracking)
- notifications (user notifications)
- chat_rooms (project chat)
- messages (chat messages)
- activity_logs (audit trail)

---

## 🔄 COMPLETE WORKFLOW

1. **User Registration** → Creates account in DB
2. **Login** → Generates JWT token
3. **Create Project** → Stores in DB, creates escrow
4. **Freelancer Browses** → Searches projects by skill
5. **AI Matching** → Calculates scores (skill/reliability/activity)
6. **Submit Bid** → Bid scored automatically
7. **Accept Bid** → Freelancer assigned, project status → in_progress
8. **Process Payment** → Creates payment record
9. **Release Funds** → Updates escrow, freelancer notified
10. **Project Complete** → Update ratings & reliability scores

---

## 🚨 TROUBLESHOOTING

### Backend Won't Start

```bash
# Check if port 8080 is in use
lsof -i :8080  # macOS/Linux
netstat -ano | findstr :8080  # Windows

# Kill process using port
kill -9 <PID>  # macOS/Linux
taskkill /PID <PID> /F  # Windows
```

### Database Issues

```bash
# Reset database
rm freelance_platform.db
# Run backend again - new database will be created

# Check database contents
sqlite3 freelance_platform.db ".tables"
sqlite3 freelance_platform.db "SELECT * FROM users;"
```

### CORS Errors

Ensure backend is using `Access-Control-Allow-Origin: *` header (already implemented)

### Frontend Can't Connect

- Verify backend is running on port 8080
- Check API_BASE_URL in api.js
- Check network tab in browser DevTools

---

## 📊 SAMPLE DATA

On first run, backend automatically inserts:

**Freelancers:**
- john_dev (React, JavaScript)
- sarah_designer (UI/UX)

**Clients:**
- alice_ceo (TechStartup Inc)
- bob_founder (VentureCorp)

**Projects:**
- Build React Dashboard ($5000)
- Mobile App Development ($8000)

Test with these or register new users!

---

## 🎯 NEXT STEPS

1. ✅ Backend running with all 50+ endpoints
2. ✅ Frontend connected to API
3. ✅ Database with sample data
4. ✅ Authentication with JWT tokens
5. ⏳ WebSocket for real-time chat (optional)
6. ⏳ Payment gateway integration (Stripe/PayPal)
7. ⏳ Email notifications

---

## 📞 SUPPORT

For issues:
1. Check logs in terminal
2. Verify all services are running
3. Check database with SQLite viewer
4. Review API responses in browser console

**Happy Building! 🚀**
