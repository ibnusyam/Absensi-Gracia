import { useQuery } from '@tanstack/react-query'
import { recapApi, type RecapFilters } from '@/api/recap.api'

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
