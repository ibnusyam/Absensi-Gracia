import { apiClient } from './client'
import type { ApiResponse, PaginatedResponse } from '@/types/api'
import type {
  CompensationType,
  OvertimeRequest,
  OvertimeRequestEmployee,
  OvertimeSession,
  OvertimeStatus,
} from '@/types/overtime'

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

export interface CreateOvertimeEmployee {
  user_id: number
  /** Local datetime "YYYY-MM-DDTHH:mm" from the datetime-local inputs. */
  planned_start_at: string
  planned_end_at: string
  compensation_type: CompensationType
}

export interface CreateOvertimePayload {
  overtime_date: string
  reason: string
  employees: CreateOvertimeEmployee[]
}

/** Admin correction of a single employee's overtime row (partial update). */
export interface UpdateOvertimeEmployeePayload {
  planned_start_at?: string | null
  planned_end_at?: string | null
  clock_in_at?: string | null
  clock_out_at?: string | null
  compensation_type?: CompensationType
}

/** Clock in/out an overtime session with selfie + GPS (mirrors attendance). */
export interface OvertimeSessionClockPayload {
  sessionId: number
  latitude: number
  longitude: number
  selfie?: File | null
}

function buildSessionForm(payload: OvertimeSessionClockPayload): FormData {
  const form = new FormData()
  form.append('latitude', String(payload.latitude))
  form.append('longitude', String(payload.longitude))
  if (payload.selfie) form.append('selfie', payload.selfie)
  return form
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

  async updateEmployee(
    employeeId: number,
    payload: UpdateOvertimeEmployeePayload,
  ): Promise<OvertimeRequestEmployee> {
    const { data } = await apiClient.patch<ApiResponse<OvertimeRequestEmployee>>(
      `/overtime-request-employees/${employeeId}`,
      payload,
    )
    return data.data
  },

  async sessionClockIn(payload: OvertimeSessionClockPayload): Promise<OvertimeSession> {
    const { data } = await apiClient.post<ApiResponse<OvertimeSession>>(
      `/overtime-sessions/${payload.sessionId}/clock-in`,
      buildSessionForm(payload),
    )
    return data.data
  },

  async sessionClockOut(payload: OvertimeSessionClockPayload): Promise<OvertimeSession> {
    const { data } = await apiClient.post<ApiResponse<OvertimeSession>>(
      `/overtime-sessions/${payload.sessionId}/clock-out`,
      buildSessionForm(payload),
    )
    return data.data
  },
}
