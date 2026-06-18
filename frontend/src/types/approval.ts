import type { User } from './user'
import type { OvertimeRequest } from './overtime'
import type { LeaveRequest } from './leave'

export type ApprovalActionType = 'approved' | 'rejected'

export interface ApprovalLog {
  id: number
  stage: number
  stage_label: string | null
  approver_id: number
  approver?: User | null
  action: ApprovalActionType
  action_label: string
  notes: string | null
  acted_at: string
}

export interface PendingApprovals {
  overtime: OvertimeRequest[]
  leave: LeaveRequest[]
}
