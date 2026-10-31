import { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { authApi } from '../api/authApi'
import { ApiError } from '../api/httpClient'
import type { AuthUser, LoginRequest, SignupRequest } from '../types/auth'

interface AuthContextValue {
  user: AuthUser | null
  isAuthenticated: boolean
  isInitializing: boolean
  login: (credentials: LoginRequest) => Promise<AuthUser>
  signup: (userData: SignupRequest) => Promise<AuthUser>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isInitializing, setIsInitializing] = useState(true)

  const refreshUser = useCallback(async () => {
    try {
      setUser(await authApi.getCurrentUser())
    } catch (error) {
      if (!(error instanceof ApiError && error.status === 401)) {
        console.error('Không thể kiểm tra phiên đăng nhập:', error)
      }
      setUser(null)
    } finally {
      setIsInitializing(false)
    }
  }, [])

  useEffect(() => {
    refreshUser()
  }, [refreshUser])

  const login = useCallback(async (credentials: LoginRequest) => {
    const authenticatedUser = await authApi.login(credentials)
    setUser(authenticatedUser)
    return authenticatedUser
  }, [])

  const signup = useCallback((userData: SignupRequest) => authApi.signup(userData), [])

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } finally {
      setUser(null)
    }
  }, [])

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isInitializing,
      login,
      signup,
      logout,
      refreshUser,
    }),
    [user, isInitializing, login, signup, logout, refreshUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
