import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/features/auth/stores/authStore'
import { routePaths } from './routePaths'
import type { RoleSlug } from '@/types/user'

interface ProtectedRouteProps {
  roles?: RoleSlug[]
}

export function ProtectedRoute({ roles }: ProtectedRouteProps) {
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)

  if (!token) {
    return <Navigate to={routePaths.login} replace />
  }

  if (roles && roles.length > 0) {
    const slug = user?.role?.slug
    if (!slug || !roles.includes(slug)) {
      return <Navigate to={routePaths.dashboard} replace />
    }
  }

  return <Outlet />
}
