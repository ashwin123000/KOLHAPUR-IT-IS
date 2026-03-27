import axios from 'axios';

// ─── Base Client ────────────────────────────────────────────
const api = axios.create({
  baseURL: '/api',  // Vite proxy forwards /api/* → http://localhost:8080/api/*
});

// Attach JWT on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-logout on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.clear();
      window.location.href = '/';
    }
    return Promise.reject(err);
  }
);

// ─── Auth ──────────────────────────────────────────────────
export const authAPI = {
  loginFreelancer: (email, password) =>
    api.post('/auth/login', { email, password, role: 'freelancer' }),

  loginClient: (email, password) =>
    api.post('/auth/login', { email, password, role: 'client' }),

  registerFreelancer: (data) =>
    api.post('/auth/register-freelancer', data),

  registerClient: (data) =>
    api.post('/auth/register-client', data),
};

// ─── Projects ──────────────────────────────────────────────
export const projectsAPI = {
  getAll: () => api.get('/projects'),
  getForClient: (clientId) => api.get(`/projects/client/${clientId}`),
  create: (data) => api.post('/projects', data),
};

// ─── Applications (Apply + Hire) ───────────────────────────
export const applyAPI = {
  apply: (data) => api.post('/apply', data),
  getApplications: (projectId) => api.get(`/applications/${projectId}`),
  hire: (data) => api.post('/hire', data),
  getFreelancerProjects: (freelancerId) => api.get(`/projects/freelancer/${freelancerId}`),
};

// ─── Stats ─────────────────────────────────────────────────
export const statsAPI = {
  getDashboard: (userId, role = 'freelancer') =>
    api.get(`/stats/${userId}/${role}`),
};

export const paymentsAPI = {
  getForUser: (userId) => api.get(`/payments/history/${userId}`),
  release: (escrowAccountId, amount) =>
    api.post('/payments/release', { escrowAccountId, amount }),
};

export const bidsAPI = {
  submit: (data) => applyAPI.apply(data),
};

export default api;