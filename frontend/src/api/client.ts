import axios, { AxiosError } from 'axios'
import { env } from '@/config/env'
import { useAuthStore } from '@/features/auth/stores/authStore'
import type { ApiValidationError } from '@/types/api'

export const apiClient = axios.create({
  baseURL: env.apiBaseUrl,
  headers: {
    Accept: 'application/json',
  },
})

// Attach Bearer token from the auth store on every request.
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// On 401, clear the session and bounce to login.
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiValidationError>) => {
    if (error.response?.status === 401) {
      const { token, clearAuth } = useAuthStore.getState()
      if (token) {
        clearAuth()
        if (window.location.pathname !== '/login') {
          window.location.assign('/login')
        }
      }
    }
    return Promise.reject(error)
  },
)

/** Extract a human-readable message from an Axios error. */
export function getApiErrorMessage(error: unknown, fallback = 'Terjadi kesalahan.'): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiValidationError | undefined
    if (data?.message) return data.message
  }
  return fallback
}

/** Extract field-level validation errors (422). */
export function getApiFieldErrors(error: unknown): Record<string, string[]> | undefined {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiValidationError | undefined
    return data?.errors
  }
  return undefined
}
