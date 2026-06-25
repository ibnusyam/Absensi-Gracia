import { apiClient } from './client'
import type { ApiResponse, PaginatedResponse } from '@/types/api'
import type { LeaveQuota, LeaveRequest, LeaveStatus, LeaveType } from '@/types/leave'

export interface LeaveFilters {
  status?: LeaveStatus
  type?: LeaveType
  date_from?: string
  date_to?: string
  user_id?: number
  department_id?: number
  /** 'all' = every employee's requests (approver/super-admin only). Default: own. */
  scope?: 'all'
  /** true => only requests still awaiting a decision (Pengajuan bucket). */
  in_process?: boolean
  per_page?: number
  page?: number
}

export interface CreateLeavePayload {
  type: LeaveType
  start_date: string
  end_date: string
  half_day?: boolean
  reason: string
  attachment?: File | null
}

export const leaveApi = {
  async list(filters: LeaveFilters = {}): Promise<PaginatedResponse<LeaveRequest>> {
    const { data } = await apiClient.get<PaginatedResponse<LeaveRequest>>('/leave-requests', {
      params: filters,
    })
    return data
  },

  async show(id: number): Promise<LeaveRequest> {
    const { data } = await apiClient.get<ApiResponse<LeaveRequest>>(`/leave-requests/${id}`)
    return data.data
  },

  async create(payload: CreateLeavePayload): Promise<LeaveRequest> {
    const form = new FormData()
    form.append('type', payload.type)
    form.append('start_date', payload.start_date)
    form.append('end_date', payload.end_date)
    form.append('half_day', payload.half_day ? '1' : '0')
    form.append('reason', payload.reason)
    if (payload.attachment) form.append('attachment', payload.attachment)

    const { data } = await apiClient.post<ApiResponse<LeaveRequest>>('/leave-requests', form)
    return data.data
  },

  async cancel(id: number): Promise<LeaveRequest> {
    const { data } = await apiClient.delete<ApiResponse<LeaveRequest>>(`/leave-requests/${id}`)
    return data.data
  },

  async quota(): Promise<LeaveQuota> {
    const { data } = await apiClient.get<ApiResponse<LeaveQuota>>('/leave-quota')
    return data.data
  },
}
