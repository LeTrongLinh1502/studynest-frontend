import { createContext, useCallback, useEffect, useMemo, useState } from 'react'
import { authApi } from '../api/authApi'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isInitializing, setIsInitializing] = useState(true)

  const refreshUser = useCallback(async () => {
    try {
      setUser(await authApi.getCurrentUser())
    } catch (error) {
      if (error.status !== 401) console.error('Không thể kiểm tra phiên đăng nhập:', error)
      setUser(null)
    } finally {
      setIsInitializing(false)
    }
  }, [])

  useEffect(() => {
    refreshUser()
  }, [refreshUser])

  const login = useCallback(async (credentials) => {
    const authenticatedUser = await authApi.login(credentials)
    setUser(authenticatedUser)
    return authenticatedUser
  }, [])

  const signup = useCallback((userData) => authApi.signup(userData), [])

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
