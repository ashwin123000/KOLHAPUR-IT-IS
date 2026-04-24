import axios from 'axios';
import { API_BASE } from '../api/config';

const API_BASE_URL = API_BASE;

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (config.data instanceof FormData && config.headers) {
    delete config.headers['Content-Type'];
    delete config.headers['content-type'];
  }
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
  me: () => api.get('/api/auth/me'),
  sendOtp: (email) => api.post('/api/auth/send-otp', { email }),
  verifyOtp: (email, otp) => api.post('/api/auth/verify-otp', { email, otp }),
  registerFreelancer: (data) => api.post('/api/auth/register-freelancer', data),
  registerClient: (data) => api.post('/api/auth/register-client', data),
  registerV2: (data) => api.post('/api/auth/register-v2', data),
  checkAadhaar: (aadhaar) => api.get('/api/auth/check-aadhaar', { params: { aadhaar } }),
  uploadResume: (file) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/api/auth/upload-resume', form, {
      timeout: 60000,
    });
  },
};

export const seekerAPI = {
  saveProfile: (userId, profileData) => api.post('/api/seeker/profile/save', { userId, profileData }),
  getProfile: (userId) => api.get(`/api/seeker/profile/${userId}`),
  getById: (userId) => api.get(`/api/seeker/${userId}`),
};

export const jobsAPI = {
  getAll: () => api.get('/api/jobs'),
  getById: (id) => api.get(`/api/jobs/${id}`),
  create: (data) => api.post('/api/jobs', data),
  updateGithubSignals: (id, data) => api.patch(`/api/jobs/${id}/github`, data),
  getDecisionTrace: (id) => api.get(`/api/match/${id}/trace`),
  hybridVectorSearch: (data) => api.post('/api/search/hybrid-vector', data),
};

export const hiringOSAPI = {
  autocompleteTitles: (query) => api.get('/api/autocomplete/titles', { params: { q: query } }),
  parseJDpdf: (file) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/api/jd/parse-pdf', form, {
      timeout: 60000,
    });
  },
  compileJD: (data) => api.post('/api/jd/compile', data),
  saveJobPost: (data) => api.post('/api/job-posts', data),
  getJobPost: (jobId) => api.get(`/api/job-posts/${jobId}`),
  getFreelancerProfile: (userId) => api.get('/api/freelancer/profile', { params: { userId } }),
  getAIJobs: (params) => api.get('/api/freelancer/jobs/ai-jobs', { params }),
  getAIJobDetail: (jobId, userId) => api.get(`/api/freelancer/jobs/${jobId}`, { params: { userId } }),
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

export const clientDashboardAPI = {
  getSummary: (clientId) => api.get('/api/client/dashboard/summary', { params: { clientId } }),
  getJobs: (clientId) => api.get('/api/client/dashboard/jobs', { params: { clientId } }),
  getApplications: (jobId, params = {}) => api.get(`/api/client/dashboard/jobs/${jobId}/applications`, { params }),
  getSeeker: (seekerId, jobId) => api.get(`/api/client/dashboard/seeker/${seekerId}`, { params: jobId ? { jobId } : {} }),
  updateApplicationStatus: (applicationId, payload) => api.patch(`/api/client/dashboard/applications/${applicationId}/status`, payload),
};

export const assessmentAPI = {
  createTest: (data) => api.post('/api/test/create', data),
  getTestConfig: (jobId) => api.get(`/api/test/config/${jobId}`),
  getByJob: (jobId) => api.get(`/api/test/job/${jobId}`),
  saveTestConfig: (jobId, config) => api.post('/api/test/create', { ...config, jobId }),
  startSession: (data) => api.post('/api/test/session/start', data),
  startTestSession: async (jobId) => {
    const testResponse = await api.get(`/api/test/job/${jobId}`);
    return api.post('/api/test/session/start', { testId: testResponse.data._id, jobId });
  },
  resumeTestSession: async (jobId) => {
    const testResponse = await api.get(`/api/test/job/${jobId}`);
    return api.post('/api/test/session/start', { testId: testResponse.data._id, jobId });
  },
  runCode: (data) => api.post('/api/test/run', data),
  runSessionCode: (sessionId, payload) => api.post('/api/test/run', { sessionId, ...payload }),
  logViolation: (data) => api.post('/api/test/session/violation', data),
  logProctorEvent: (sessionId, event) => api.post('/api/test/session/violation', { sessionId, ...event }),
  saveSnapshot: (data) => api.post('/api/test/session/snapshot', data),
  uploadSnapshot: async (sessionId, image) => {
    if (typeof image === 'string') {
      return api.post('/api/test/session/snapshot', { sessionId, imageBase64: image });
    }
    return Promise.reject(new Error('uploadSnapshot expects a base64 data URL for the current backend contract.'));
  },
  submitCode: (data) => api.post('/api/test/submit/code', data),
  submitSessionCode: (sessionId, payload) => api.post('/api/test/submit/code', { sessionId, ...payload }),
  submitAnswers: (submissionId, data) => api.patch(`/api/test/submit/answers/${submissionId}`, data),
  submitAnswer: (submissionId, data) => api.patch(`/api/test/submit/answers/${submissionId}`, data),
  finalizeSession: (submissionId, answers) => api.patch(`/api/test/submit/answers/${submissionId}`, answers),
  getSubmissions: (jobId) => api.get(`/api/test/submissions/${jobId}`),
  toggleTest: (testId) => api.patch(`/api/test/${testId}/toggle`),
  getMyAssignments: () => api.get('/api/test/my-assignments'),
  createVmAssessment: (data) => api.post('/api/v1/assessments/create', data),
  getVmAssessmentByJob: (jobId) => api.get(`/api/v1/assessments/job/${jobId}`),
  getPendingVmAssessments: () => api.get('/api/v1/assessments/pending'),
  takeVmAssessment: (assessmentId) => api.get(`/api/v1/assessments/${assessmentId}/take`),
  submitVmAssessment: (assessmentId, data) => api.post(`/api/v1/assessments/${assessmentId}/submit`, data),
  getVmFreelancerResults: (assessmentId) => api.get(`/api/v1/assessments/${assessmentId}/results/freelancer`),
  getVmLeaderboard: (assessmentId) => api.get(`/api/v1/assessments/${assessmentId}/leaderboard`),
  closeVmAssessment: (assessmentId) => api.patch(`/api/v1/assessments/${assessmentId}/close`),
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

export const matchAPI = {
  calculate: (seekerId, jobId) => api.post('/api/match/calculate', { seekerId, jobId }),
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
    });
  },
  postWeightedJob: (data) => api.post('/api/jobs/post', data),
};

export const chatAPI = {
  sendMessage: (message, path, history = [], userId = '', context = {}) =>
    api.post('/api/chat', { message, path, history, user_id: userId, context }),
};

export default api;
