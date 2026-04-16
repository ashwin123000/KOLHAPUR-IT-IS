import axios from 'axios';

// ─── Base Client ──────────────────────────────────────────
// No baseURL: requests use relative paths so Vite's dev proxy
// forwards /api/* to the backend — no CORS headers needed.
const api = axios.create({
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
});

// ─── TOKEN INTERCEPTOR ────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ─── RESPONSE INTERCEPTOR ─────────────────────────────────
api.interceptors.response.use(
  (res) => res,
  (err) => {
    console.error("API Error:", err.response?.data || err.message);

    if (err.response?.status === 401) {
      localStorage.clear();
      window.location.href = '/';
    }
    return Promise.reject(err);
  }
);

// ─── AUTH ─────────────────────────────────────────────────
export const authAPI = {
  login: (email, password) =>
    api.post('/api/auth/login', { email, password }),

  registerFreelancer: (data) =>
    api.post('/api/auth/register-freelancer', data),

  registerClient: (data) =>
    api.post('/api/auth/register-client', data),
};

// ─── PROJECTS ─────────────────────────────────────────────
export const projectsAPI = {
  getAll: () => api.get('/api/projects'),

  create: (data) => api.post('/api/projects/secure', data), // 🔐

  getForClient: (clientId) =>
    api.get(`/api/projects/client/${clientId}`),

  getForFreelancer: (userId) =>
    api.get(`/api/projects/freelancer/${userId}`),

  submitWork: (projectId, freelancerId) =>
    api.post('/api/projects/submit', { projectId, freelancerId }),

  verify: (projectId, verify) =>
    api.post(`/api/projects/${projectId}/verify`, { verify }),
};

// ─── APPLICATIONS ─────────────────────────────────────────
export const applyAPI = {
  apply: (data) => api.post('/api/apply/secure', data), 
  getApplications: (projectId) => api.get(`/api/applications/${projectId}`),
  hire: (data) => api.post('/api/hire/secure', data), 
  // ✅ ADD THIS LINE:
  updateBid: (appId, bidAmount) => api.put(`/api/applications/${appId}/update-bid`, { bidAmount }),
};

// ─── RATINGS ──────────────────────────────────────────────
export const ratingsAPI = {
  create: (data) => api.post('/api/ratings/secure', data), // 🔐
};


// ─── INVOICES ─────────────────────────────────────────────
export const invoicesAPI = {
  getForUser: (userId) => api.get(`/api/invoices/${userId}`),
};

// ─── MESSAGES ─────────────────────────────────────────────
export const messagesAPI = {
  getByProject: (projectId) =>
    api.get(`/api/messages/${projectId}`),

  getByUser: (userId) =>
    api.get(`/api/messages/user/${userId}`),

  send: (data) => api.post('/api/messages', data),
};

// ─── NOTIFICATIONS ────────────────────────────────────────
export const notificationsAPI = {
  getForUser: (userId) =>
    api.get(`/api/notifications/${userId}`),

  send: (data) => api.post('/api/notifications', data),

  markRead: (notifId) =>
    api.put(`/api/notifications/${notifId}/read`),
};

// ─── TALENT ───────────────────────────────────────────────
export const talentAPI = {
  getFreelancers: () => api.get('/api/freelancers'),
};

// ─── STATS ────────────────────────────────────────────────
export const statsAPI = {
  getFreelancerStats: (userId) =>
    api.get(`/api/stats/${userId}/freelancer`),

  getClientStats: (userId) =>
    api.get(`/api/stats/${userId}/client`),
};


// ─── PAYMENTS ─────────────────────────────────────────────
export const paymentsAPI = {
  getForUser: (userId) => api.get(`/api/payments/${userId}`),
  // ✅ Changed to send a JSON body instead of a URL parameter
  release: (projectId) => api.post(`/api/payments/release`, { projectId }), 
};

export default api;



