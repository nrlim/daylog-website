import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

// Add request interceptor to include token and Redmine credentials in headers
api.interceptors.request.use(
  (config) => {
    let token = null;
    let redmineCreds = null;
    
    // Try localStorage first (more reliable in production)
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      try {
        token = localStorage.getItem('token');
        redmineCreds = localStorage.getItem('redmine_creds');
      } catch (err) {
        console.error('[API] Error reading localStorage:', err);
      }
    }
    
    // Fallback to cookie if localStorage is empty
    if (!token && typeof document !== 'undefined') {
      try {
        const allCookies = document.cookie;
        const cookieToken = allCookies
          .split('; ')
          .find(row => row.startsWith('token='))
          ?.split('=')[1];
        if (cookieToken) {
          token = cookieToken;
        }
        
        // Also try to get redmine_creds from cookies as fallback
        if (!redmineCreds) {
          const cookieCreds = allCookies
            .split('; ')
            .find(row => row.startsWith('redmine_creds='))
            ?.split('=')[1];
          if (cookieCreds) {
            redmineCreds = cookieCreds;
          }
        }
      } catch (err) {
        console.error('[API] Error reading cookies:', err);
      }
    }
    
    // Add token to Authorization header (except for login/register)
    const publicEndpoints = ['/auth/login', '/auth/register'];
    const isPublicEndpoint = publicEndpoints.some(endpoint => config.url?.includes(endpoint));
    
    if (token && !isPublicEndpoint) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add Redmine credentials as custom header (but NOT on login/register endpoints)
    if (redmineCreds && !isPublicEndpoint) {
      config.headers['X-Redmine-Credentials'] = redmineCreds;
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor to log responses and handle 401s
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Log CORS and referrer policy errors
    if (error.message?.includes('strict-origin-when-cross-origin') || 
        error.message?.includes('CORS') ||
        error.response?.status === 0) {
      console.error('[API CORS Error]', {
        message: error.message,
        url: error.config?.url,
        origin: typeof window !== 'undefined' ? window.location.origin : 'unknown',
        method: error.config?.method,
      });
    }
    
    if (error.response?.status === 401) {
      const url = error.config?.url || '';
      
      // Check if we have a token
      const hasToken = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      
      // Only clear token if we have one AND it's not a public endpoint
      const publicEndpoints = ['/auth/login', '/auth/register'];
      const isPublicEndpoint = publicEndpoints.some(ep => url.includes(ep));
      
      if (hasToken && !isPublicEndpoint) {
        // Only clear on /auth/me to avoid clearing valid tokens on other 401s
        if (url.includes('/auth/me')) {
          if (typeof localStorage !== 'undefined') {
            localStorage.removeItem('token');
          }
        }
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (data: { username: string; password: string; email?: string }) =>
    api.post('/auth/register', data),
  login: (data: { username: string; password: string }) =>
    api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
};

// User API
export const userAPI = {
  getUsers: () => api.get('/users'),
  getUserById: (id: string) => api.get(`/users/${id}`),
  updateUser: (id: string, data: { username?: string; email?: string; role?: string }) =>
    api.put(`/users/${id}`, data),
  deleteUser: (id: string) => api.delete(`/users/${id}`),
  changeUserRole: (id: string, role: string) =>
    api.patch(`/users/${id}/role`, { role }),
  getUsersByRole: (role: string) => api.get(`/users/role/${role}`),
};

// Team API
export const teamAPI = {
  getTeams: () => api.get('/teams'),
  getTeamById: (id: string) => api.get(`/teams/${id}`),
  createTeam: (data: { name: string; description?: string }) =>
    api.post('/teams', data),
  updateTeam: (id: string, data: { name: string; description?: string }) =>
    api.put(`/teams/${id}`, data),
  deleteTeam: (id: string) => api.delete(`/teams/${id}`),
  addMember: (teamId: string, userId: string) =>
    api.post(`/teams/${teamId}/members`, { userId }),
  removeMember: (teamId: string, memberId: string) =>
    api.delete(`/teams/${teamId}/members/${memberId}`),
  setWfhLimit: (teamId: string, wfhLimitPerMonth: number) =>
    api.put(`/teams/${teamId}/wfh-limit`, { wfhLimitPerMonth }),
  getWfhUsage: (teamId: string) =>
    api.get(`/teams/${teamId}/wfh-usage`),
  setTeamMemberLead: (teamId: string, memberId: string, isLead: boolean) =>
    api.patch(`/teams/${teamId}/members/${memberId}/lead`, { isLead }),
};

// Activity API
export const activityAPI = {
  getActivities: (params?: { userId?: string; startDate?: string; endDate?: string }) =>
    api.get('/activities', { params }),
  getActivityById: (id: string) => api.get(`/activities/${id}`),
  getTeamMembersActivities: (teamId: string, params?: { startDate?: string; endDate?: string; date?: string }) =>
    api.get(`/activities/team/${teamId}`, { params }),
  createActivity: (data: { date: string; time?: string; subject: string; description: string; status: string; isWfh?: boolean; teamId?: string; project?: string }) =>
    api.post('/activities', data),
  updateActivity: (id: string, data: { subject?: string; description?: string; status?: string; blockedReason?: string }) =>
    api.put(`/activities/${id}`, data),
  deleteActivity: (id: string) => api.delete(`/activities/${id}`),
};

// Poker API
export const pokerAPI = {
  getSessions: (teamId?: string) =>
    api.get('/poker', { params: teamId ? { teamId } : undefined }),
  getSessionById: (id: string) => api.get(`/poker/anonymous/${id}`),
  createSession: (data: { teamId: string; storyName: string; description?: string }) =>
    api.post('/poker', data),
  vote: (sessionId: string, points: number) =>
    api.post(`/poker/anonymous/${sessionId}`, { points }),
  revealVotes: (sessionId: string) => api.put(`/poker/anonymous/${sessionId}/reveal`),
  completeSession: (sessionId: string, finalPoints: number) =>
    api.post(`/poker/anonymous/${sessionId}/complete`, { finalPoints }),
};

// Reporting API
export const reportingAPI = {
  getTeamActivityReport: (teamId: string, params?: { startDate?: string; endDate?: string; userId?: string }) =>
    api.get(`/reports/team/${teamId}/activity`, { params }),
  getWfhReport: (teamId: string, params?: { month?: number; year?: number }) =>
    api.get(`/reports/team/${teamId}/wfh`, { params }),
  getProductivityReport: (teamId: string, params?: { startDate?: string; endDate?: string }) =>
    api.get(`/reports/team/${teamId}/productivity`, { params }),
  getSystemReport: (params?: { startDate?: string; endDate?: string }) =>
    api.get('/reports/system', { params }),
};

// Debug helper to check token and headers
export const debugAPI = {
  checkToken: () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    return token;
  },
  testHeaders: () => {
    return api.get('/debug/headers');
  },
};