/**
 * ENHANCED API Client with Comprehensive Logging
 * 
 * Replace your frontend/src/services/api.js with this version
 * to get detailed console logs for every API call and error.
 */

import axios from 'axios';

// ─── Configuration ────────────────────────────────────────
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';
const DEBUG_MODE = true; // Set to false in production

// ─── Logging Utility ──────────────────────────────────────
const log = {
  request: (method, url, data = null) => {
    if (DEBUG_MODE) {
      console.group(`🚀 [API REQUEST] ${method} ${url}`);
      if (data && method !== 'GET') {
        console.log('Payload:', data);
      }
      console.log('Timestamp:', new Date().toISOString());
      console.groupEnd();
    }
  },
  response: (method, url, status, data) => {
    if (DEBUG_MODE) {
      console.group(`✅ [API RESPONSE] ${method} ${url} - ${status}`);
      console.log('Data:', data);
      console.log('Timestamp:', new Date().toISOString());
      console.groupEnd();
    }
  },
  error: (method, url, status, message, data = null) => {
    console.group(`❌ [API ERROR] ${method} ${url} - ${status || 'No Status'}`);
    console.error('Message:', message);
    if (data) {
      console.error('Response:', data);
    }
    console.log('Timestamp:', new Date().toISOString());
    console.groupEnd();
  }
};

// ─── Base Client ──────────────────────────────────────────
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000, // Increased timeout for large file uploads
});

// ─── REQUEST INTERCEPTOR ──────────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  
  log.request(config.method.toUpperCase(), config.url, config.data);
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    if (DEBUG_MODE) {
      console.log('🔐 [AUTH] Token attached:', token.substring(0, 20) + '...');
    }
  }
  
  return config;
});

// ─── RESPONSE INTERCEPTOR ─────────────────────────────────
api.interceptors.response.use(
  (res) => {
    log.response(
      res.config.method.toUpperCase(),
      res.config.url,
      res.status,
      res.data
    );
    return res;
  },
  (err) => {
    const config = err.config;
    const status = err.response?.status;
    const data = err.response?.data;
    
    // Log the error
    log.error(
      config?.method?.toUpperCase() || 'UNKNOWN',
      config?.url || 'unknown-url',
      status || err.code,
      err.message,
      data
    );

    // Handle specific errors
    if (status === 401) {
      console.warn('🔑 [401] Unauthorized - Clearing auth and redirecting to login');
      localStorage.clear();
      window.location.href = '/';
    }

    if (status === 403) {
      console.warn('🚫 [403] Forbidden - Access denied');
    }

    if (status === 404) {
      console.error('🔍 [404] Endpoint not found. Check URL and backend routes.');
    }

    if (status === 500) {
      console.error('💥 [500] Server error. Check backend logs with: tail -f /logs or logs/');
    }

    if (!status && err.code === 'ECONNREFUSED') {
      console.error('📡 [CONN_ERROR] Cannot connect to backend. Is it running on', API_BASE_URL, '?');
    }

    return Promise.reject(err);
  }
);

// ─── HEALTH CHECK ────────────────────────────────────────
export const healthAPI = {
  check: async () => {
    try {
      console.log('🏥 [HEALTH] Checking backend health...');
      const res = await api.get('/api/test/status');
      console.log('✅ [HEALTH] Backend is healthy:', res.data);
      return res.data;
    } catch (err) {
      console.error('❌ [HEALTH] Backend is DOWN or unreachable');
      return null;
    }
  },
};

// ─── AUTH ─────────────────────────────────────────────────
export const authAPI = {
  login: (email, password) => {
    console.log('🔐 [LOGIN] Attempting login for:', email);
    return api.post('/api/auth/login', { email, password });
  },

  loginV2: (email, password) => {
    console.log('🔐 [LOGIN_V2] Attempting V2 login for:', email);
    return api.post('/api/auth/login-v2', { email, password });
  },

  registerFreelancer: (data) => {
    console.log('📝 [REGISTER] Registering freelancer:', data.email);
    return api.post('/api/auth/register-freelancer', data);
  },

  registerClient: (data) => {
    console.log('📝 [REGISTER] Registering client:', data.email);
    return api.post('/api/auth/register-client', data);
  },

  /**
   * Upload resume as PDF
   * Returns: { file_url, parsed: { full_name, email, skills, confidence, ... } }
   */
  uploadResume: (file) => {
    console.log('📄 [UPLOAD_RESUME] Starting upload for:', file.name);
    const form = new FormData();
    form.append('file', file);
    
    return api.post('/api/auth/upload-resume', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000, // 60s for PDF parsing
      onUploadProgress: (progressEvent) => {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        console.log(`📤 [UPLOAD_PROGRESS] ${percentCompleted}%`);
      }
    });
  },

  /**
   * Check if Aadhaar is available (12 digits)
   * Returns: { available: bool, message: string }
   */
  checkAadhaar: (aadhaar) => {
    const masked = aadhaar.slice(-4).padStart(12, '*');
    console.log(`🔍 [CHECK_AADHAAR] Checking availability for: ${masked}`);
    return api.get(`/api/auth/check-aadhaar?aadhaar=${aadhaar}`);
  },

  /**
   * V2 Registration - Full freelancer registration with all fields
   * Required fields: email, full_name, password, aadhaar, city, state, college
   */
  registerV2: (data) => {
    console.log('📝 [REGISTER_V2] Registering with email:', data.email);
    console.log('   Aadhaar masked:', data.aadhaar.slice(-4).padStart(12, '*'));
    console.log('   Skills:', data.skills);
    return api.post('/api/auth/register-v2', data);
  },
};

// ─── PROJECTS ─────────────────────────────────────────────
export const projectsAPI = {
  getAll: () => {
    console.log('📋 [PROJECTS] Fetching all projects...');
    return api.get('/api/projects');
  },

  create: (data) => {
    console.log('➕ [PROJECT_CREATE] Creating project:', data.title);
    return api.post('/api/projects/secure', data);
  },

  getForClient: (clientId) => {
    console.log(`📋 [PROJECTS_CLIENT] Fetching projects for client: ${clientId}`);
    return api.get(`/api/projects/client/${clientId}`);
  },

  getForFreelancer: (userId) => {
    console.log(`📋 [PROJECTS_FREELANCER] Fetching projects for freelancer: ${userId}`);
    return api.get(`/api/projects/freelancer/${userId}`);
  },

  submitWork: (projectId, freelancerId) => {
    console.log(`✉️ [SUBMIT_WORK] Submitting work for project: ${projectId}`);
    return api.post('/api/projects/submit', { projectId, freelancerId });
  },

  verify: (projectId, verify) => {
    console.log(`✔️ [VERIFY_WORK] Verifying work (status: ${verify}) for project: ${projectId}`);
    return api.post(`/api/projects/${projectId}/verify`, { verify });
  },
};

// ─── APPLICATIONS ────────────────────────────────────────
export const applyAPI = {
  apply: (data) => {
    console.log(`📩 [APPLY] Applying to project: ${data.projectId}`);
    return api.post('/api/apply/secure', data);
  },

  getApplications: (projectId) => {
    console.log(`📩 [APPLICATIONS] Getting applications for project: ${projectId}`);
    return api.get(`/api/applications/${projectId}`);
  },

  hire: (data) => {
    console.log(`✅ [HIRE] Hiring freelancer for project: ${data.projectId}`);
    return api.post('/api/hire/secure', data);
  },
};

// ─── STATS ────────────────────────────────────────────────
export const statsAPI = {
  getClientStats: (userId) => {
    console.log(`📊 [STATS_CLIENT] Fetching stats for client: ${userId}`);
    return api.get(`/api/stats/${userId}/client`);
  },

  getFreelancerStats: (userId) => {
    console.log(`📊 [STATS_FREELANCER] Fetching stats for freelancer: ${userId}`);
    return api.get(`/api/stats/${userId}/freelancer`);
  },
};

// ─── RATINGS ──────────────────────────────────────────────
export const ratingsAPI = {
  create: (data) => {
    console.log(`⭐ [RATING] Creating rating for freelancer: ${data.freelancerId}`);
    return api.post('/api/ratings/secure', data);
  },
};

// ─── PAYMENTS ─────────────────────────────────────────────
export const paymentsAPI = {
  getPayments: (userId) => {
    console.log(`💰 [PAYMENTS] Fetching payments for user: ${userId}`);
    return api.get(`/api/payments/${userId}`);
  },

  getInvoices: (userId) => {
    console.log(`📄 [INVOICES] Fetching invoices for freelancer: ${userId}`);
    return api.get(`/api/invoices/${userId}`);
  },
};

// ─── MESSAGES ─────────────────────────────────────────────
export const messagesAPI = {
  getMessages: (projectId) => {
    console.log(`💬 [MESSAGES] Fetching messages for project: ${projectId}`);
    return api.get(`/api/messages/${projectId}`);
  },

  sendMessage: (data) => {
    console.log(`💬 [SEND_MESSAGE] Sending message in project: ${data.projectId}`);
    return api.post('/api/messages', data);
  },
};

// ─── INTELLIGENCE ENGINE ──────────────────────────────────
export const intelAPI = {
  analyzeJob: (jobData) => {
    console.log('🧠 [JOB_ANALYSIS] Analyzing job:', jobData.title);
    return api.post('/api/intelligence/analyze-job', jobData);
  },

  getCandidateMatches: (jobId) => {
    console.log(`🧠 [CANDIDATE_MATCH] Getting matches for job: ${jobId}`);
    return api.get(`/api/intelligence/matches/${jobId}`);
  },
};

export default api;

