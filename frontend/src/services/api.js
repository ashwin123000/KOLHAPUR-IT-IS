import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error)
);

export const healthAPI = {
  check: () => api.get('/api/health'),
};

export const authAPI = {
  login: (email, password) => api.post('/api/auth/login', { email, password }),
  loginV2: (email, password) => api.post('/api/auth/login', { email, password }),
  registerFreelancer: (data) => api.post('/api/auth/register-freelancer', data),
  registerClient: (data) => api.post('/api/auth/register-client', data),
  registerV2: (data) => api.post('/api/auth/register-v2', data),
  checkAadhaar: (aadhaar) => api.get('/api/auth/check-aadhaar', { params: { aadhaar } }),
  uploadResume: (file) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/api/auth/upload-resume', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    });
  },
};

export const jobsAPI = {
  getAll: () => api.get('/api/jobs'),
  getById: (id) => api.get(`/api/jobs/${id}`),
  create: (data) => api.post('/api/jobs', data),
  updateGithubSignals: (id, data) => api.patch(`/api/jobs/${id}/github`, data),
  getDecisionTrace: (id) => api.get(`/api/match/${id}/trace`),
  hybridVectorSearch: (data) => api.post('/api/search/hybrid-vector', data),
};

export const syncAPI = {
  missed: (lastSeenTimestamp, userId = '') =>
    api.get('/api/sync/missed', {
      params: { last_seen_timestamp: lastSeenTimestamp, user_id: userId },
    }),
};

export const projectsAPI = {
  getAll: () => api.get('/api/projects'),
  create: (data) => api.post('/api/projects', data),
  getForClient: (clientId) => api.get(`/api/projects/client/${clientId}`),
  getForFreelancer: (userId) => api.get(`/api/projects/freelancer/${userId}`),
  submitWork: (projectId, freelancerId) => api.post('/api/projects/submit', { projectId, freelancerId }),
  verify: (projectId, verify) => api.post(`/api/projects/${projectId}/verify`, { verify }),
};

export const applyAPI = {
  apply: (data) => api.post('/api/apply/secure', data),
  getApplications: (projectId) => api.get(`/api/applications/${projectId}`),
  hire: (data) => api.post('/api/hire/secure', data),
  updateBid: (appId, bidAmount) => api.put(`/api/applications/${appId}/update-bid`, { bidAmount }),
  getFreelancerApplications: (freelancerId) => api.get(`/api/applications/freelancer/${freelancerId}`),
};

export const ratingsAPI = {
  create: (data) => api.post('/api/ratings/secure', data),
};

export const invoicesAPI = {
  getForUser: (userId) => api.get(`/api/invoices/${userId}`),
};

export const messagesAPI = {
  getByProject: (projectId) => api.get(`/api/messages/${projectId}`),
  getByUser: (userId) => api.get(`/api/messages/user/${userId}`),
  send: (data) => api.post('/api/messages', data),
};

export const notificationsAPI = {
  getForUser: (userId) => api.get(`/api/notifications/${userId}`),
  send: (data) => api.post('/api/notifications', data),
  markRead: (notifId) => api.put(`/api/notifications/${notifId}/read`),
};

export const talentAPI = {
  getFreelancers: () => api.get('/api/freelancers'),
};

export const statsAPI = {
  getFreelancerStats: (userId) => api.get(`/api/stats/${userId}/freelancer`),
  getClientStats: (userId) => api.get(`/api/stats/${userId}/client`),
};

export const paymentsAPI = {
  getForUser: (userId) => api.get(`/api/payments/${userId}`),
  release: (projectId) => api.post('/api/payments/release', { projectId }),
};

export const rolesAPI = {
  generate: (data) => api.post('/api/jobs', data),
  poll: (role, location, domain) =>
    api.get('/api/jobs', { params: { role, location, domain } }),
  match: (data) => api.post('/api/roles/match', data),
};

export const intelAPI = {
  getPulse: () => api.get('/api/intelligence/pulse'),
};

export const intelligenceAPI = {
  vibeMatch: (data) => api.post('/api/intelligence/vibe-match', data),
  matchWeighted: (data) => api.post('/api/intelligence/match-weighted', data),
  getCertifications: (userId) => api.get(`/api/certifications/${userId}`),
  verifyCertification: (userId, skill, file) => {
    const form = new FormData();
    form.append('file', file);
    return api.post(`/api/certifications/verify/${userId}?skill=${encodeURIComponent(skill)}`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  postWeightedJob: (data) => api.post('/api/jobs/post', data),
};

export const chatAPI = {
  sendMessage: (message, path, history = [], userId = '', context = {}) =>
    api.post('/api/chat', { message, path, history, user_id: userId, context }),
};

export default api;
