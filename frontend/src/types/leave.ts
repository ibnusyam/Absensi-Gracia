import type { User } from './user'
import type { ApprovalLog } from './approval'

export type LeaveType = 'annual' | 'sick' | 'emergency' | 'unpaid'
export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled'

export interface LeaveRequest {
  id: number
  user_id: number
  type: LeaveType
  type_label: string
  start_date: string
  end_date: string
  total_days: number
  reason: string
  attachment_url: string | null
  status: LeaveStatus
  status_label: string
  created_at: string
  user?: User | null
  approval_logs?: ApprovalLog[]
}

export interface LeaveQuota {
  id: number
  user_id: number
  year: number
  total_days: number
  used_days: number
  remaining_days: number
}
