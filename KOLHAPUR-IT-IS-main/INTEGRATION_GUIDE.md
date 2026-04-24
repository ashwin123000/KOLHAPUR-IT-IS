# Freelancer Marketplace - Integration Guide

This guide explains how to connect the React frontend to the C++ backend.

## 1. Backend Setup

### Prerequisites
- C++17 or higher
- Crow framework (header-only)
- nlohmann/json
- SQLite or MySQL

### Build Instructions

```bash
# Navigate to backend directory
cd backend

# Create build directory
mkdir build
cd build

# Configure with CMake
cmake ..

# Build the project
cmake --build . --config Release

# Run the server
./FreelancePlatform
```

Server will start on: `http://localhost:8080`

---

## 2. Frontend Setup & Proxy Configuration

### Update Vite Config

Edit `frontend/vite.config.js`:

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [tailwindcss(), react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/api'),
      }
    }
  }
})
```

### Install Frontend Dependencies

```bash
cd frontend
npm install
npm run dev
```

Frontend will run on: `http://localhost:5173`

---

## 3. API Service Integration

### Create `frontend/src/services/api.js`

```javascript
// API Service Base Configuration
const API_BASE_URL = import.meta.env.DEV 
  ? 'http://localhost:8080/api' 
  : 'https://api.freelanceplatform.com/api';

// Store JWT token
let authToken = localStorage.getItem('authToken');

export const setAuthToken = (token) => {
  authToken = token;
  localStorage.setItem('authToken', token);
};

export const getAuthToken = () => authToken;

export const clearAuthToken = () => {
  authToken = null;
  localStorage.removeItem('authToken');
};

// Helper function to make API calls
const apiCall = async (endpoint, options = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    clearAuthToken();
    window.location.href = '/login';
  }

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'API Error');
  }

  return data;
};

// ==================== AUTH APIS ====================

export const auth = {
  registerFreelancer: (userData) =>
    apiCall('/auth/register-freelancer', {
      method: 'POST',
      body: JSON.stringify(userData),
    }),

  registerClient: (userData) =>
    apiCall('/auth/register-client', {
      method: 'POST',
      body: JSON.stringify(userData),
    }),

  login: (email, password) =>
    apiCall('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  logout: () => {
    clearAuthToken();
  },
};

// ==================== PROJECT APIS ====================

export const projects = {
  getAll: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.minBudget) params.append('minBudget', filters.minBudget);
    if (filters.maxBudget) params.append('maxBudget', filters.maxBudget);
    if (filters.skill) params.append('skill', filters.skill);
    
    return apiCall(`/projects?${params.toString()}`);
  },

  getById: (projectId) =>
    apiCall(`/projects/${projectId}`),

  create: (projectData) =>
    apiCall('/projects', {
      method: 'POST',
      body: JSON.stringify(projectData),
    }),

  update: (projectId, updates) =>
    apiCall(`/projects/${projectId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    }),

  start: (projectId, bidId) =>
    apiCall(`/projects/${projectId}/start`, {
      method: 'POST',
      body: JSON.stringify({ bidId }),
    }),

  complete: (projectId) =>
    apiCall(`/projects/${projectId}/complete`, {
      method: 'POST',
    }),
};

// ==================== BID APIS ====================

export const bids = {
  submit: (bidData) =>
    apiCall('/bids', {
      method: 'POST',
      body: JSON.stringify(bidData),
    }),

  getForProject: (projectId) =>
    apiCall(`/projects/${projectId}/bids`),

  accept: (bidId) =>
    apiCall(`/bids/${bidId}/accept`, {
      method: 'POST',
    }),

  reject: (bidId, reason = '') =>
    apiCall(`/bids/${bidId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    }),

  getRanking: (projectId) =>
    apiCall(`/projects/${projectId}/bids/ranking`),
};

// ==================== MATCHING APIS ====================

export const matching = {
  getProjectMatches: (projectId, limit = 10) =>
    apiCall(`/matching/project/${projectId}?limit=${limit}`),

  getFreelancerProjects: (freelancerId, limit = 10) =>
    apiCall(`/matching/freelancer/${freelancerId}?limit=${limit}`),

  getSkillGap: (freelancerId, projectId) =>
    apiCall(`/matching/skill-gap/${freelancerId}/${projectId}`),
};

// ==================== PAYMENT APIS ====================

export const payments = {
  initiate: (paymentData) =>
    apiCall('/payments', {
      method: 'POST',
      body: JSON.stringify(paymentData),
    }),

  getHistory: (filters = {}) => {
    const params = new URLSearchParams(filters);
    return apiCall(`/payments?${params.toString()}`);
  },

  getDetails: (paymentId) =>
    apiCall(`/payments/${paymentId}`),

  createEscrow: (escrowData) =>
    apiCall('/escrow', {
      method: 'POST',
      body: JSON.stringify(escrowData),
    }),

  releaseEscrow: (escrowId, amount) =>
    apiCall(`/escrow/${escrowId}/release`, {
      method: 'POST',
      body: JSON.stringify({ amount }),
    }),
};

// ==================== NOTIFICATION APIS ====================

export const notifications = {
  getAll: (userId, limit = 50) =>
    apiCall(`/notifications?userId=${userId}&limit=${limit}`),

  markAsRead: (notificationId) =>
    apiCall(`/notifications/${notificationId}/read`, {
      method: 'PUT',
    }),

  markAllAsRead: (userId) =>
    apiCall(`/notifications/mark-all-read?userId=${userId}`, {
      method: 'PUT',
    }),
};

// ==================== CHAT APIS ====================

export const chat = {
  getMessages: (chatRoomId, limit = 100) =>
    apiCall(`/chat/${chatRoomId}/messages?limit=${limit}`),

  sendMessage: (chatRoomId, content) =>
    apiCall('/chat/messages', {
      method: 'POST',
      body: JSON.stringify({ chatRoomId, content }),
    }),

  getActiveUsers: (chatRoomId) =>
    apiCall(`/chat/${chatRoomId}/active-users`),
};

// ==================== STATS/ANALYTICS ====================

export const stats = {
  getDashboard: (userId) =>
    apiCall(`/stats/dashboard/${userId}`),

  getFreelancerAnalytics: (freelancerId) =>
    apiCall(`/analytics/freelancer/${freelancerId}`),
};

export default {
  auth,
  projects,
  bids,
  matching,
  payments,
  notifications,
  chat,
  stats,
};
```

---

## 4. Connect Frontend Pages

### Example: Login Page

Edit `frontend/src/pages/Login.jsx`:

```javascript
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, setAuthToken } from '../services/api';

export default function Login({ role = 'freelancer' }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await auth.login(email, password);

      if (response.token) {
        setAuthToken(response.token);
        
        // Store user info
        localStorage.setItem('user', JSON.stringify(response.user));
        
        // Redirect based on role
        if (response.user.role === 'CLIENT') {
          navigate('/client-dashboard');
        } else {
          navigate('/freelancer-dashboard');
        }
      }
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow">
        <h2 className="text-2xl font-bold mb-6">
          {role === 'client' ? 'Client Login' : 'Freelancer Login'}
        </h2>
        
        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded mb-4">
            {error}
          </div>
        )}

        <input
          type="email"
          placeholder="Email"
          className="w-full p-2 border mb-4 rounded"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          className="w-full p-2 border mb-4 rounded"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </div>
    </div>
  );
}
```

### Example: Projects List Page

Edit `frontend/src/pages/Clientprojects.jsx`:

```javascript
import React, { useState, useEffect } from 'react';
import { projects } from '../services/api';

export default function ClientProjects() {
  const [projectsList, setProjectsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await projects.getAll({ status: 'open' });
      setProjectsList(response.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-center py-8">Loading...</div>;
  if (error) return <div className="text-red-600 p-4">{error}</div>;

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-6">Projects</h1>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {projectsList.map((project) => (
          <div key={project.id} className="border p-4 rounded-lg shadow hover:shadow-lg">
            <h3 className="text-xl font-bold">{project.title}</h3>
            <p className="text-gray-600 mb-2">{project.description}</p>
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold text-green-600">${project.budget}</span>
              <span className="text-sm bg-blue-100 text-blue-800 p-2 rounded">
                {project.status}
              </span>
            </div>
            <button className="w-full mt-4 bg-blue-600 text-white p-2 rounded hover:bg-blue-700">
              View Details
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 5. Error Handling Best Practices

```javascript
// Create error constants
export const ERROR_CODES = {
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  INSUFFICIENT_FUNDS: 'INSUFFICIENT_FUNDS',
  BID_ALREADY_EXISTS: 'BID_ALREADY_EXISTS',
};

// Global error handler
export const handleError = (error) => {
  if (error.status === 401) {
    // Redirect to login
    const event = new Event('unauthorized');
    window.dispatchEvent(event);
  } else if (error.status === 403) {
    // Show permission denied
    console.error('Permission denied');
  } else if (error.status === 404) {
    // Show not found
    console.error('Resource not found');
  } else if (error.status >= 500) {
    // Server error
    console.error('Server error');
  }
};
```

---

## 6. Real-Time Features (WebSocket)

For real-time notifications and chat, consider adding WebSocket support:

```javascript
// frontend/src/services/websocket.js
let ws = null;

export const connectWebSocket = (userId) => {
  ws = new WebSocket(`ws://localhost:8080/ws?userId=${userId}`);

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    
    if (data.type === 'notification') {
      // Dispatch to notification store
      window.dispatchEvent(new CustomEvent('notification', { detail: data }));
    } else if (data.type === 'message') {
      // Dispatch to chat store
      window.dispatchEvent(new CustomEvent('message', { detail: data }));
    }
  };

  ws.onerror = (error) => {
    console.error('WebSocket error:', error);
  };
};

export const sendWebSocketMessage = (data) => {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
};

export const disconnectWebSocket = () => {
  if (ws) {
    ws.close();
  }
};
```

---

## 7. Environment Variables

Create `.env.local` in frontend:

```
VITE_API_URL=http://localhost:8080/api
VITE_WS_URL=ws://localhost:8080/ws
VITE_ENV=development
```

---

## 8. Testing the Integration

### Test Auth Flow

```javascript
// Test Login
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

// Should return
{
  "success": true,
  "token": "eyJhbGc...",
  "user": {...}
}
```

### Test Project Creation

```javascript
curl -X POST http://localhost:8080/api/projects \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title":"Sample Project",
    "description":"Test",
    "budget":5000,
    "requiredSkills":["JavaScript","React"]
  }'
```

---

## 9. Deployment Checklist

- [ ] Build frontend: `npm run build`
- [ ] Build backend: `cmake --build . --Release`
- [ ] Run database migrations
- [ ] Configure CORS properly
- [ ] Set up SSL/TLS certificates
- [ ] Configure environment variables
- [ ] Set up database backups
- [ ] Configure logging
- [ ] Set up monitoring
- [ ] Test all endpoints
- [ ] Performance testing
- [ ] Security testing

---

## 10. Common Issues & Solutions

### CORS Errors

**Problem**: `Access to XMLHttpRequest blocked by CORS policy`

**Solution**: Add CORS middleware to backend:

```cpp
CROW_ROUTE(app, "/<path>").methods("OPTIONS"_method)
([](){ 
  auto res = crow::response(200);
  res.set_header("Access-Control-Allow-Origin", "*");
  res.set_header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.set_header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  return res;
});
```

### 401 Unauthorized

**Problem**: `Invalid token`

**Solution**: Ensure token is:
1. Sent in Authorization header
2. Not expired
3. Properly formatted

### Database Connection Errors

**Problem**: `Cannot connect to database`

**Solution**: Verify:
1. Database file/server is running
2. Connection string is correct
3. Permissions are set properly

