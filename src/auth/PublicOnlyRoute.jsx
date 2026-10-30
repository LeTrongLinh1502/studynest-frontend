import { Navigate, Outlet } from 'react-router-dom'
import LoadingScreen from '../components/LoadingScreen'
import { useAuth } from './useAuth'

function PublicOnlyRoute() {
  const { isAuthenticated, isInitializing } = useAuth()
  if (isInitializing) return <LoadingScreen />
  return isAuthenticated ? <Navigate to="/dashboard" replace /> : <Outlet />
}

export default PublicOnlyRoute
