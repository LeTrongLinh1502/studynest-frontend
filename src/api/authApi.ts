import { get, post } from './httpClient'
import type { AuthUser, LoginRequest, SignupRequest } from '../types/auth'

export const authApi = {
  getCurrentUser: () => get<AuthUser>('/api/auth/me'),
  login: (credentials: LoginRequest) => post<AuthUser>('/api/auth/login', credentials),
  signup: (userData: SignupRequest) => post<AuthUser>('/api/auth/signup', userData),
  logout: () => post<void>('/api/auth/logout'),
}
