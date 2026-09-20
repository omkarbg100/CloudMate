import axios from 'axios'

// Base URL — uses Vite proxy in dev, VITE_API_URL in production
const BASE_URL = import.meta.env.VITE_API_URL || '/api'

const http = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // send HTTP-only cookies
  headers: { 'Content-Type': 'application/json' },
})

// Attach stored token to every request if available
http.interceptors.request.use((config) => {
  const token = localStorage.getItem('dm_token')
  if (token) config.headers['Authorization'] = `Bearer ${token}`
  return config
})

// Global error interceptor — redirect to /login on 401
http.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('dm_token')
      // Only redirect if not already on auth pages
      if (!window.location.pathname.startsWith('/login') && !window.location.pathname.startsWith('/register')) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  }
)

// ── Auth ──────────────────────────────────────────────────────────────────────
const auth = {
  register: (data) => http.post('/auth/register', data).then((r) => r.data),
  login: (data) => http.post('/auth/login', data).then((r) => r.data),
  me: () => http.get('/auth/me').then((r) => r.data),
  logout: () => http.post('/auth/logout').then((r) => r.data),
}

// ── Projects ──────────────────────────────────────────────────────────────────
const projects = {
  list: () => http.get('/projects').then((r) => r.data),
  create: (data) => http.post('/projects', data).then((r) => r.data),
  get: (id) => http.get(`/projects/${id}`).then((r) => r.data),
  update: (id, data) => http.patch(`/projects/${id}`, data).then((r) => r.data),
  delete: (id) => http.delete(`/projects/${id}`).then((r) => r.data),
  // AI operations
  analyze: (id) => http.post(`/projects/${id}/analyze`).then((r) => r.data),
  generateArchitecture: (id, data) =>
    http.post(`/projects/${id}/architecture`, data).then((r) => r.data),
  getAnalysis: (id) => http.get(`/projects/${id}/analysis`).then((r) => r.data),
}

const api = { auth, projects }
export default api
