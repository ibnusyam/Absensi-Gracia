import { useQuery } from '@tanstack/react-query'
import { attendanceApi, type AttendanceReportFilters } from '@/api/attendance.api'

export function useAttendanceReport(filters: AttendanceReportFilters) {
  return useQuery({
    queryKey: ['attendance', 'report', filters],
    queryFn: () => attendanceApi.report(filters),
  })
}
