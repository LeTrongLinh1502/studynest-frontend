import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from './useAuth'
import type { Role } from '../types/phaseA'

export default function RoleRoute({ role }: { role: Role }) {
  const { user } = useAuth()
  return user?.role === role ? <Outlet /> : <Navigate to="/forbidden" replace />
}
