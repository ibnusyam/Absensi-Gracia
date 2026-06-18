import { apiClient } from './client'
import type { ApiResponse } from '@/types/api'
import type { LeaveRequest } from '@/types/leave'

export interface RecapFilters {
  month: number
  year: number
  department_id?: number
}

export interface RecapLeaveResponse {
  period: { month: number; year: number }
  summary: {
    total_requests: number
    total_people: number
    total_days: number
  }
  data: LeaveRequest[]
}

export interface RecapOvertimeRow {
  session_id: number
  overtime_date: string
  is_holiday: boolean
  employee_name: string | null
  department_name: string | null
  total_hours: number
  /** Hours keyed by pay multiplier, e.g. { "1.5": 1, "2": 1.5, "3": 0 }. */
  tiers: Record<string, number>
}

export interface RecapOvertimeResponse {
  period: { month: number; year: number }
  summary: {
    total_sessions: number
    total_employees: number
    total_hours: number
    hours_by_multiplier: Record<string, number>
  }
  data: RecapOvertimeRow[]
}

export const recapApi = {
  async leave(filters: RecapFilters): Promise<RecapLeaveResponse> {
    const { data } = await apiClient.get<ApiResponse<RecapLeaveResponse>>('/recap/leave', {
      params: filters,
    })
    return data.data
  },

  async overtime(filters: RecapFilters): Promise<RecapOvertimeResponse> {
    const { data } = await apiClient.get<ApiResponse<RecapOvertimeResponse>>('/recap/overtime', {
      params: filters,
    })
    return data.data
  },
}
