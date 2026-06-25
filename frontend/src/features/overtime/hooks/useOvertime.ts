import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  overtimeApi,
  type CreateOvertimePayload,
  type OvertimeFilters,
  type UpdateOvertimeEmployeePayload,
} from '@/api/overtime.api'
import { getApiErrorMessage } from '@/api/client'
import { toast } from '@/components/ui/toast'

export function useOvertimeList(filters: OvertimeFilters = {}) {
  return useQuery({
    queryKey: ['overtime', 'list', filters],
    queryFn: () => overtimeApi.list(filters),
  })
}

export function useOvertimeDetail(id: number) {
  return useQuery({
    queryKey: ['overtime', 'detail', id],
    queryFn: () => overtimeApi.show(id),
    enabled: Number.isFinite(id) && id > 0,
  })
}

export function useCreateOvertime() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateOvertimePayload) => overtimeApi.create(payload),
    onSuccess: () => {
      toast.success('Pengajuan lembur dikirim.')
      qc.invalidateQueries({ queryKey: ['overtime'] })
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Gagal mengajukan lembur.')),
  })
}

export function useUpdateOvertimeEmployee() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateOvertimeEmployeePayload }) =>
      overtimeApi.updateEmployee(id, payload),
    onSuccess: () => {
      toast.success('Data lembur karyawan diperbarui.')
      qc.invalidateQueries({ queryKey: ['overtime'] })
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Gagal memperbarui data lembur.')),
  })
}

export function useOvertimeSessionClock() {
  const qc = useQueryClient()

  const clockIn = useMutation({
    mutationFn: (sessionId: number) => overtimeApi.sessionClockIn(sessionId),
    onSuccess: () => {
      toast.success('Mulai lembur dicatat.')
      qc.invalidateQueries({ queryKey: ['overtime'] })
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Gagal memulai lembur.')),
  })

  const clockOut = useMutation({
    mutationFn: (sessionId: number) => overtimeApi.sessionClockOut(sessionId),
    onSuccess: () => {
      toast.success('Lembur selesai dicatat.')
      qc.invalidateQueries({ queryKey: ['overtime'] })
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Gagal menyelesaikan lembur.')),
  })

  return { clockIn, clockOut }
}
