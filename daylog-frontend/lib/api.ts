import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

// Auth API
export const authAPI = {
  register: (data: { username: string; password: string; email?: string }) =>
    api.post('/auth/register', data),
  login: (data: { username: string; password: string }) =>
    api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
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
};

// Activity API
export const activityAPI = {
  getActivities: (params?: { userId?: string; startDate?: string; endDate?: string }) =>
    api.get('/activities', { params }),
  getActivityById: (id: string) => api.get(`/activities/${id}`),
  createActivity: (data: { date: string; description: string; status: string }) =>
    api.post('/activities', data),
  updateActivity: (id: string, data: { description?: string; status?: string }) =>
    api.put(`/activities/${id}`, data),
  deleteActivity: (id: string) => api.delete(`/activities/${id}`),
};

// Poker API
export const pokerAPI = {
  getSessions: (teamId?: string) =>
    api.get('/poker', { params: teamId ? { teamId } : undefined }),
  getSessionById: (id: string) => api.get(`/poker/${id}`),
  createSession: (data: { teamId: string; storyName: string; description?: string }) =>
    api.post('/poker', data),
  vote: (sessionId: string, points: number) =>
    api.post(`/poker/${sessionId}/vote`, { points }),
  revealVotes: (sessionId: string) => api.post(`/poker/${sessionId}/reveal`),
  completeSession: (sessionId: string, finalPoints: number) =>
    api.post(`/poker/${sessionId}/complete`, { finalPoints }),
};
