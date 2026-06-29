import { useRef, type ChangeEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  overtimeApi,
  type CreateOvertimePayload,
  type OvertimeFilters,
  type OvertimeSessionClockPayload,
  type UpdateOvertimeEmployeePayload,
} from '@/api/overtime.api'
import { getApiErrorMessage } from '@/api/client'
import { toast } from '@/components/ui/toast'
import { useGeolocation } from '@/hooks/useGeolocation'

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
    mutationFn: (payload: OvertimeSessionClockPayload) => overtimeApi.sessionClockIn(payload),
    onSuccess: () => {
      toast.success('Mulai lembur dicatat.')
      qc.invalidateQueries({ queryKey: ['overtime'] })
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Gagal memulai lembur.')),
  })

  const clockOut = useMutation({
    mutationFn: (payload: OvertimeSessionClockPayload) => overtimeApi.sessionClockOut(payload),
    onSuccess: () => {
      toast.success('Lembur selesai dicatat.')
      qc.invalidateQueries({ queryKey: ['overtime'] })
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Gagal menyelesaikan lembur.')),
  })

  return { clockIn, clockOut }
}

/**
 * Drives an overtime session clock-in/out with a selfie + GPS, mirroring the
 * daily attendance capture: `trigger()` opens the camera, and the captured
 * photo is submitted together with the current coordinates. Render the returned
 * `fileRef`/`onChange` on a hidden `<input type="file" capture="user">`.
 */
export function useOvertimeClockCapture() {
  const { clockIn, clockOut } = useOvertimeSessionClock()
  const geo = useGeolocation()
  const fileRef = useRef<HTMLInputElement>(null)
  const ctx = useRef<{ action: 'in' | 'out'; sessionId: number }>({ action: 'in', sessionId: 0 })

  const trigger = (action: 'in' | 'out', sessionId: number) => {
    ctx.current = { action, sessionId }
    fileRef.current?.click()
  }

  const onChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null
    if (!file) return
    try {
      const coords = await geo.request()
      const payload: OvertimeSessionClockPayload = {
        sessionId: ctx.current.sessionId,
        latitude: coords.latitude,
        longitude: coords.longitude,
        selfie: file,
      }
      if (ctx.current.action === 'in') await clockIn.mutateAsync(payload)
      else await clockOut.mutateAsync(payload)
    } catch {
      if (geo.error) toast.error(geo.error)
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const busy = clockIn.isPending || clockOut.isPending || geo.loading
  return { fileRef, onChange, trigger, busy }
}
