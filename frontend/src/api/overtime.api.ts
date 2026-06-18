import { apiClient } from './client'
import type { ApiResponse, PaginatedResponse } from '@/types/api'
import type { OvertimeRequest, OvertimeSession, OvertimeStatus } from '@/types/overtime'

export interface OvertimeFilters {
  status?: OvertimeStatus
  department_id?: number
  date_from?: string
  date_to?: string
  /** 'all' = every employee's requests (approver/super-admin only). Default: own. */
  scope?: 'all'
  /** true => only requests still moving through approval (Pengajuan bucket). */
  in_process?: boolean
  per_page?: number
  page?: number
}

export interface CreateOvertimePayload {
  overtime_date: string
  planned_start: string
  planned_end: string
  reason: string
  employee_ids: number[]
}

export const overtimeApi = {
  async list(filters: OvertimeFilters = {}): Promise<PaginatedResponse<OvertimeRequest>> {
    const { data } = await apiClient.get<PaginatedResponse<OvertimeRequest>>('/overtime-requests', {
      params: filters,
    })
    return data
  },

  async show(id: number): Promise<OvertimeRequest> {
    const { data } = await apiClient.get<ApiResponse<OvertimeRequest>>(`/overtime-requests/${id}`)
    return data.data
  },

  async create(payload: CreateOvertimePayload): Promise<OvertimeRequest> {
    const { data } = await apiClient.post<ApiResponse<OvertimeRequest>>('/overtime-requests', payload)
    return data.data
  },

  async sessionClockIn(sessionId: number): Promise<OvertimeSession> {
    const { data } = await apiClient.post<ApiResponse<OvertimeSession>>(
      `/overtime-sessions/${sessionId}/clock-in`,
    )
    return data.data
  },

  async sessionClockOut(sessionId: number): Promise<OvertimeSession> {
    const { data } = await apiClient.post<ApiResponse<OvertimeSession>>(
      `/overtime-sessions/${sessionId}/clock-out`,
    )
    return data.data
  },
}
