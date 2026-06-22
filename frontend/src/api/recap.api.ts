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

export interface AttendanceRecapFilters {
  start_date: string
  end_date: string
  department_id?: number
}

/** Granular per-day status code for a single cell of the attendance grid. */
export type AttendanceCell =
  | 'present'
  | 'late'
  | 'leave_annual'
  | 'leave_sick'
  | 'leave_emergency'
  | 'absent'
  | 'holiday'
  | 'off'
  | 'none'

export interface AttendanceRecapRow {
  user: {
    id: number
    name: string
    employee_id: string | null
    department_name: string | null
  }
  /** Status codes aligned positionally with the response `dates` array. */
  cells: AttendanceCell[]
  /** Count per status code, e.g. { present: 18, absent: 2, ... }. */
  totals: Record<string, number>
}

export interface AttendanceRecapResponse {
  period: { start_date: string; end_date: string }
  dates: string[]
  legend: Record<AttendanceCell, string>
  summary: { total_employees: number; total_days: number }
  rows: AttendanceRecapRow[]
}

export const recapApi = {
  async attendance(filters: AttendanceRecapFilters): Promise<AttendanceRecapResponse> {
    const { data } = await apiClient.get<ApiResponse<AttendanceRecapResponse>>('/recap/attendance', {
      params: filters,
    })
    return data.data
  },

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
