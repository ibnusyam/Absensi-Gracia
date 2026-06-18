import { apiClient } from './client'
import type { ApiResponse } from '@/types/api'
import type { User } from '@/types/user'

export interface LoginPayload {
  email: string
  password: string
  device_name: string
}

export interface LoginResult {
  token: string
  user: User
}

export const authApi = {
  async login(payload: LoginPayload): Promise<LoginResult> {
    const { data } = await apiClient.post<ApiResponse<LoginResult>>('/auth/login', payload)
    return data.data
  },

  async logout(): Promise<void> {
    await apiClient.post('/auth/logout')
  },

  async me(): Promise<User> {
    const { data } = await apiClient.get<ApiResponse<User>>('/auth/me')
    return data.data
  },

  async registerDeviceToken(fcmToken: string): Promise<void> {
    await apiClient.post('/auth/device-token', { fcm_token: fcmToken })
  },
}
