import { useQuery } from '@tanstack/react-query'
import { masterDataApi } from '@/api/masterData.api'

/** Active work locations (with coordinates) for the attendance map. */
export function useWorkLocations() {
  return useQuery({
    queryKey: ['work-locations'],
    queryFn: () => masterDataApi.workLocations(),
    staleTime: 5 * 60_000,
  })
}
