import type { Department, User } from './user'
import type { ApprovalLog } from './approval'

export type OvertimeStatus =
  | 'pending'
  | 'approved_by_hrd'
  | 'approved_by_director'
  | 'rejected'

export type CompensationType = 'money' | 'leave'

export interface OvertimeSession {
  id: number
  overtime_request_employee_id: number
  clock_in_at: string | null
  clock_out_at: string | null
  total_hours: number | null
}

export interface OvertimeRequestEmployee {
  id: number
  overtime_request_id: number
  user_id: number
  planned_start_at: string | null
  planned_end_at: string | null
  compensation_type: CompensationType
  compensation_label: string
  leave_days_credited: number
  user?: User | null
  session?: OvertimeSession | null
}

export interface OvertimeRequest {
  id: number
  requested_by: number
  department_id: number
  overtime_date: string
  planned_start: string | null
  planned_end: string | null
  reason: string
  status: OvertimeStatus
  status_label: string
  created_at: string
  requester?: User | null
  department?: Department | null
  employees?: OvertimeRequestEmployee[]
  approval_logs?: ApprovalLog[]
}
