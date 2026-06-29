import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { leaveApi, type CreateLeavePayload, type LeaveFilters } from '@/api/leave.api'
import { getApiErrorMessage } from '@/api/client'
import { toast } from '@/components/ui/toast'

export function useLeaveList(filters: LeaveFilters = {}) {
  return useQuery({
    queryKey: ['leave', 'list', filters],
    queryFn: () => leaveApi.list(filters),
  })
}

export function useLeaveDetail(id: number) {
  return useQuery({
    queryKey: ['leave', 'detail', id],
    queryFn: () => leaveApi.show(id),
    enabled: Number.isFinite(id) && id > 0,
  })
}

export function useLeaveQuota() {
  return useQuery({
    queryKey: ['leave', 'quota'],
    queryFn: () => leaveApi.quota(),
  })
}

export function useLeaveQuotaLedger() {
  return useQuery({
    queryKey: ['leave', 'quota', 'ledger'],
    queryFn: () => leaveApi.quotaLedger(),
  })
}

export function useCreateLeave() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateLeavePayload) => leaveApi.create(payload),
    onSuccess: () => {
      toast.success('Pengajuan cuti dikirim.')
      qc.invalidateQueries({ queryKey: ['leave'] })
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Gagal mengajukan cuti.')),
  })
}

export function useCancelLeave() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => leaveApi.cancel(id),
    onSuccess: () => {
      toast.success('Pengajuan cuti dibatalkan.')
      qc.invalidateQueries({ queryKey: ['leave'] })
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Gagal membatalkan cuti.')),
  })
}
