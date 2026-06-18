import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { approvalApi, type ApprovalActionPayload } from '@/api/approval.api'
import { getApiErrorMessage } from '@/api/client'
import { toast } from '@/components/ui/toast'

export function usePendingApprovals() {
  return useQuery({
    queryKey: ['approvals', 'pending'],
    queryFn: () => approvalApi.pending(),
  })
}

export function useApprovalAction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: { type: 'overtime' | 'leave'; id: number; payload: ApprovalActionPayload }) =>
      approvalApi.act(vars.type, vars.id, vars.payload),
    onSuccess: (_data, vars) => {
      toast.success(vars.payload.action === 'approved' ? 'Disetujui.' : 'Ditolak.')
      qc.invalidateQueries({ queryKey: ['approvals'] })
      qc.invalidateQueries({ queryKey: ['overtime'] })
      qc.invalidateQueries({ queryKey: ['leave'] })
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Gagal memproses approval.')),
  })
}
