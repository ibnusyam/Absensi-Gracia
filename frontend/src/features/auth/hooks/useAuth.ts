import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { authApi, type LoginPayload } from '@/api/auth.api'
import { getApiErrorMessage } from '@/api/client'
import { useAuthStore } from '@/features/auth/stores/authStore'
import { toast } from '@/components/ui/toast'
import { routePaths } from '@/routes/routePaths'
import type { RoleSlug } from '@/types/user'

export function useLogin() {
  const setAuth = useAuthStore((s) => s.setAuth)
  const navigate = useNavigate()

  return useMutation({
    mutationFn: (payload: LoginPayload) => authApi.login(payload),
    onSuccess: (result) => {
      setAuth(result.token, result.user)
      toast.success(`Selamat datang, ${result.user.name}!`)
      navigate(routePaths.dashboard, { replace: true })
    },
    onError: (error) => {
      toast.error(getApiErrorMessage(error, 'Login gagal.'))
    },
  })
}

export function useLogout() {
  const clearAuth = useAuthStore((s) => s.clearAuth)
  const navigate = useNavigate()

  return useMutation({
    mutationFn: () => authApi.logout(),
    onSettled: () => {
      clearAuth()
      navigate(routePaths.login, { replace: true })
    },
  })
}

/** Refresh the current user profile in the background (keeps role/dept fresh). */
export function useMe() {
  const token = useAuthStore((s) => s.token)
  const setUser = useAuthStore((s) => s.setUser)

  return useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const user = await authApi.me()
      setUser(user)
      return user
    },
    enabled: Boolean(token),
  })
}

export function useCurrentUser() {
  return useAuthStore((s) => s.user)
}

export function useHasRole(...roles: RoleSlug[]): boolean {
  const user = useAuthStore((s) => s.user)
  return Boolean(user?.role && roles.includes(user.role.slug))
}
