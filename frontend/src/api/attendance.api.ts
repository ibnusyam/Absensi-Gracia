import { apiClient } from './client'
import type { ApiResponse, PaginatedResponse } from '@/types/api'
import type { Attendance, AttendanceStatus, AttendanceSummary } from '@/types/attendance'
import type { AttendanceReport } from '@/types/attendanceReport'

export interface AttendanceReportFilters {
  date?: string
  department_id?: number
}

export interface AttendanceFilters {
  date_from?: string
  date_to?: string
  user_id?: number
  status?: AttendanceStatus
  per_page?: number
  page?: number
}

export interface ClockInPayload {
  latitude: number
  longitude: number
  selfie?: File | null
}

export interface ClockOutPayload {
  latitude: number
  longitude: number
  selfie?: File | null
}

export const attendanceApi = {
  async list(filters: AttendanceFilters = {}): Promise<PaginatedResponse<Attendance>> {
    const { data } = await apiClient.get<PaginatedResponse<Attendance>>('/attendances', {
      params: filters,
    })
    return data
  },

  async report(filters: AttendanceReportFilters = {}): Promise<AttendanceReport> {
    const { data } = await apiClient.get<ApiResponse<AttendanceReport>>('/attendances/report', {
      params: filters,
    })
    return data.data
  },

  async today(): Promise<Attendance | null> {
    const { data } = await apiClient.get<ApiResponse<Attendance | null>>('/attendances/today')
    return data.data
  },

  async summary(month?: number, year?: number): Promise<AttendanceSummary> {
    const { data } = await apiClient.get<ApiResponse<AttendanceSummary>>('/attendances/summary', {
      params: { month, year },
    })
    return data.data
  },

  async clockIn(payload: ClockInPayload): Promise<Attendance> {
    const form = new FormData()
    form.append('latitude', String(payload.latitude))
    form.append('longitude', String(payload.longitude))
    if (payload.selfie) form.append('selfie', payload.selfie)

    const { data } = await apiClient.post<ApiResponse<Attendance>>('/attendances/clock-in', form)
    return data.data
  },

  async clockOut(payload: ClockOutPayload): Promise<Attendance> {
    const form = new FormData()
    form.append('latitude', String(payload.latitude))
    form.append('longitude', String(payload.longitude))
    if (payload.selfie) form.append('selfie', payload.selfie)

    const { data } = await apiClient.post<ApiResponse<Attendance>>('/attendances/clock-out', form)
    return data.data
  },
}
