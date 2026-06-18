import { apiClient } from './client'
import type { ApiResponse, PaginatedResponse } from '@/types/api'
import type { Department, User } from '@/types/user'
import type { LeaveQuota, LeaveRequest } from '@/types/leave'
import type { OvertimeRequest } from '@/types/overtime'
import type { WorkLocation } from '@/types/attendance'

export interface UserFilters {
  department_id?: number
  role_id?: number
  is_active?: boolean
  search?: string
  per_page?: number
  page?: number
}

export interface UserDetail {
  user: User
  leave_quota: LeaveQuota | null
  leave_requests: LeaveRequest[]
  overtime_requests: OvertimeRequest[]
}

export const masterDataApi = {
  async users(filters: UserFilters = {}): Promise<PaginatedResponse<User>> {
    const { data } = await apiClient.get<PaginatedResponse<User>>('/users', { params: filters })
    return data
  },

  async userDetail(id: number): Promise<UserDetail> {
    const { data } = await apiClient.get<ApiResponse<UserDetail>>(`/users/${id}`)
    return data.data
  },

  async departments(): Promise<Department[]> {
    const { data } = await apiClient.get<ApiResponse<Department[]>>('/departments')
    return data.data
  },

  async workLocations(): Promise<WorkLocation[]> {
    const { data } = await apiClient.get<ApiResponse<WorkLocation[]>>('/work-locations')
    return data.data
  },
}
