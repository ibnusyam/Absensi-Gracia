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
  clock_in_lat: number | null
  clock_in_lng: number | null
  clock_out_lat: number | null
  clock_out_lng: number | null
  selfie_url: string | null
  selfie_out_url: string | null
}

export interface OvertimePayTier {
  multiplier: number
  hours: number
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
  /** Money-compensation pay-tier breakdown (1.5×/2×/3×). Empty until completed. */
  pay_tiers: OvertimePayTier[]
  /** True when the overtime date is a weekend/holiday (affects tier rates). */
  is_holiday: boolean | null
  /** Sum of hours × multiplier, i.e. equivalent paid hours. */
  weighted_hours: number | null
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
