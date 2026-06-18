import { useQuery } from '@tanstack/react-query'
import { masterDataApi, type UserFilters } from '@/api/masterData.api'

export function useUsers(filters: UserFilters = {}) {
  return useQuery({
    queryKey: ['users', filters],
    queryFn: () => masterDataApi.users(filters),
  })
}

export function useUserDetail(id: number | null) {
  return useQuery({
    queryKey: ['users', 'detail', id],
    queryFn: () => masterDataApi.userDetail(id as number),
    enabled: id != null,
  })
}

export function useDepartments() {
  return useQuery({
    queryKey: ['departments'],
    queryFn: () => masterDataApi.departments(),
  })
}
