import type { Role } from './phaseA'

export interface AuthUser {
  id: number
  fullName: string
  email: string
  role: Role
}

export interface LoginRequest {
  email: string
  password: string
}

export interface SignupRequest extends LoginRequest {
  fullName: string
}

export interface CsrfResponse {
  headerName: string
  token: string
}

export type FieldErrors = Record<string, string>

export interface ApiErrorResponse {
  message?: string
  code?: string
  fieldErrors?: FieldErrors
}
