import type { Attendance, AttendanceStatus } from './attendance'
import type { User } from './user'

export interface AttendanceReportRow {
  user: User
  status: AttendanceStatus
  status_label: string
  attendance: Attendance | null
}

export interface AttendanceReportSummary {
  total: number
  present: number
  late: number
  permit: number
  absent: number
  holiday: number
}

export interface AttendanceReport {
  date: string
  is_holiday: boolean
  summary: AttendanceReportSummary
  rows: AttendanceReportRow[]
}
