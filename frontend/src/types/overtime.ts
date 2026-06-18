import type { Department, User } from './user'
import type { ApprovalLog } from './approval'

export type OvertimeStatus =
  | 'pending'
  | 'approved_by_hrd'
  | 'approved_by_director'
  | 'rejected'

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
  user?: User | null
  session?: OvertimeSession | null
}

export interface OvertimeRequest {
  id: number
  requested_by: number
  department_id: number
  overtime_date: string
  planned_start: string
  planned_end: string
  reason: string
  status: OvertimeStatus
  status_label: string
  created_at: string
  requester?: User | null
  department?: Department | null
  employees?: OvertimeRequestEmployee[]
  approval_logs?: ApprovalLog[]
}
