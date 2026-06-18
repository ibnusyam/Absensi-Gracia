import { apiClient } from './client'
import type { ApiResponse } from '@/types/api'
import type { ApprovalActionType, PendingApprovals } from '@/types/approval'

export interface ApprovalActionPayload {
  action: ApprovalActionType
  notes?: string
}

export const approvalApi = {
  async pending(): Promise<PendingApprovals> {
    const { data } = await apiClient.get<ApiResponse<PendingApprovals>>('/approvals/pending')
    return data.data
  },

  async act(
    type: 'overtime' | 'leave',
    id: number,
    payload: ApprovalActionPayload,
  ): Promise<void> {
    await apiClient.post(`/approvals/${type}/${id}`, payload)
  },
}
