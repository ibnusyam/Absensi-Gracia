import { useQuery } from '@tanstack/react-query'
import { recapApi, type RecapFilters, type AttendanceRecapFilters } from '@/api/recap.api'

export function useAttendanceRecap(filters: AttendanceRecapFilters) {
  return useQuery({
    queryKey: ['recap', 'attendance', filters],
    queryFn: () => recapApi.attendance(filters),
    enabled: Boolean(filters.start_date && filters.end_date),
  })
}

export function useLeaveRecap(filters: RecapFilters) {
  return useQuery({
    queryKey: ['recap', 'leave', filters],
    queryFn: () => recapApi.leave(filters),
  })
}

export function useOvertimeRecap(filters: RecapFilters) {
  return useQuery({
    queryKey: ['recap', 'overtime', filters],
    queryFn: () => recapApi.overtime(filters),
  })
}
