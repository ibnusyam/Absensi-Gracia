import type { User } from './user'

export type AttendanceStatus = 'present' | 'late' | 'absent' | 'permit' | 'holiday' | 'off'

export interface WorkLocation {
  id: number
  name: string
  latitude: number
  longitude: number
  radius_meters: number
  wifi_ssid: string | null
  is_active: boolean
}

export interface Attendance {
  id: number
  user_id: number
  date: string
  clock_in_at: string | null
  clock_out_at: string | null
  location_id: number | null
  clock_in_lat: number | null
  clock_in_lng: number | null
  clock_out_lat: number | null
  clock_out_lng: number | null
  selfie_url: string | null
  selfie_out_url: string | null
  status: AttendanceStatus
  status_label: string
  late_minutes: number | null
  note: string | null
  location?: WorkLocation | null
  user?: User | null
}

export interface AttendanceSummary {
  month: number
  year: number
  total_days: number
  present: number
  late: number
  absent: number
  permit: number
  holiday: number
  total_late_minutes: number
}
