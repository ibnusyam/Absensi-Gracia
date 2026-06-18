import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { attendanceApi, type AttendanceFilters, type ClockInPayload, type ClockOutPayload } from '@/api/attendance.api'
import { getApiErrorMessage } from '@/api/client'
import { toast } from '@/components/ui/toast'

export function useTodayAttendance() {
  return useQuery({
    queryKey: ['attendance', 'today'],
    queryFn: () => attendanceApi.today(),
  })
}

export function useAttendanceSummary(month?: number, year?: number) {
  return useQuery({
    queryKey: ['attendance', 'summary', month, year],
    queryFn: () => attendanceApi.summary(month, year),
  })
}

export function useAttendanceList(filters: AttendanceFilters) {
  return useQuery({
    queryKey: ['attendance', 'list', filters],
    queryFn: () => attendanceApi.list(filters),
  })
}

function useInvalidateAttendance() {
  const qc = useQueryClient()
  return () => qc.invalidateQueries({ queryKey: ['attendance'] })
}

export function useClockIn() {
  const invalidate = useInvalidateAttendance()
  return useMutation({
    mutationFn: (payload: ClockInPayload) => attendanceApi.clockIn(payload),
    onSuccess: () => {
      toast.success('Clock-in berhasil!')
      invalidate()
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Clock-in gagal.')),
  })
}

export function useClockOut() {
  const invalidate = useInvalidateAttendance()
  return useMutation({
    mutationFn: (payload: ClockOutPayload) => attendanceApi.clockOut(payload),
    onSuccess: () => {
      toast.success('Clock-out berhasil!')
      invalidate()
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Clock-out gagal.')),
  })
}
