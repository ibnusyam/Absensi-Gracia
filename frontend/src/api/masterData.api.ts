import { apiClient } from './client'
import type { ApiResponse, PaginatedResponse } from '@/types/api'
import type { Department, Role, User } from '@/types/user'
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

export interface OffPeriod {
  id: number
  start_date: string
  /** null = open-ended (until reactivated). */
  end_date: string | null
  reason: string | null
  created_by_name: string | null
}

export interface UserDetail {
  user: User
  leave_quota: LeaveQuota | null
  leave_requests: LeaveRequest[]
  overtime_requests: OvertimeRequest[]
  is_currently_off: boolean
  off_periods: OffPeriod[]
}

export interface SetOffPayload {
  start_date: string
  end_date?: string | null
  reason?: string | null
}

export interface UserFormPayload {
  name: string
  email: string
  password?: string
  role_id: number
  department_id?: number | null
  employee_id?: string | null
  phone?: string | null
  joined_at?: string | null
  is_active?: boolean

  // Extended employee profile (all optional)
  no_ktp?: string | null
  alamat?: string | null
  telepon_rumah?: string | null
  tempat_lahir?: string | null
  tanggal_lahir?: string | null
  jenis_kelamin?: string | null
  status_pernikahan?: string | null
  jumlah_tanggungan?: number | null
  agama?: string | null
  pendidikan?: string | null
  jurusan?: string | null
  status_pajak?: string | null
  no_npwp?: string | null
  no_jamsostek?: string | null
  rekening_bca?: string | null
  rekening_bni?: string | null
  status_karir?: string | null
  tanggal_spk?: string | null
  kartu_pensiun?: string | null
  kode_jabatan?: string | null
  nama_jabatan?: string | null
  keterangan_data?: string | null
  jatah_cuti?: number | null
  tahun_cuti?: number | null
  sisa_cuti?: number | null
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

  async setOffPeriod(userId: number, payload: SetOffPayload): Promise<void> {
    await apiClient.post(`/users/${userId}/off-periods`, payload)
  },

  /** Close an off period ("Aktifkan kembali") by setting its end date. */
  async updateOffPeriod(
    id: number,
    payload: { end_date?: string | null; reason?: string | null },
  ): Promise<void> {
    await apiClient.patch(`/off-periods/${id}`, payload)
  },

  async deleteOffPeriod(id: number): Promise<void> {
    await apiClient.delete(`/off-periods/${id}`)
  },

  async createUser(payload: UserFormPayload): Promise<User> {
    const { data } = await apiClient.post<ApiResponse<User>>('/users', payload)
    return data.data
  },

  async updateUser(id: number, payload: Partial<UserFormPayload>): Promise<User> {
    const { data } = await apiClient.put<ApiResponse<User>>(`/users/${id}`, payload)
    return data.data
  },

  /** Soft delete = deactivate. History is preserved. */
  async deactivateUser(id: number): Promise<void> {
    await apiClient.delete(`/users/${id}`)
  },

  async roles(): Promise<Role[]> {
    const { data } = await apiClient.get<ApiResponse<Role[]>>('/roles')
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
