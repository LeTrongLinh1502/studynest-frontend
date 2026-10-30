import { get, post } from './httpClient'

export const authApi = {
  getCurrentUser: () => get('/api/auth/me'),
  login: (credentials) => post('/api/auth/login', credentials),
  signup: (userData) => post('/api/auth/signup', userData),
  logout: () => post('/api/auth/logout'),
}
