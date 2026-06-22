import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  masterDataApi,
  type UserFilters,
  type SetOffPayload,
  type UserFormPayload,
} from '@/api/masterData.api'
import { getApiErrorMessage } from '@/api/client'
import { toast } from '@/components/ui/toast'

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

export function useRoles() {
  return useQuery({
    queryKey: ['roles'],
    queryFn: () => masterDataApi.roles(),
  })
}

/** Create / update / deactivate employees (Super Admin & HRD). */
export function useUserActions() {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: ['users'] })

  const create = useMutation({
    mutationFn: (payload: UserFormPayload) => masterDataApi.createUser(payload),
    onSuccess: () => {
      toast.success('Karyawan ditambahkan.')
      invalidate()
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Gagal menambah karyawan.')),
  })

  const update = useMutation({
    mutationFn: (vars: { id: number; payload: Partial<UserFormPayload> }) =>
      masterDataApi.updateUser(vars.id, vars.payload),
    onSuccess: () => {
      toast.success('Karyawan diperbarui.')
      invalidate()
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Gagal memperbarui karyawan.')),
  })

  const deactivate = useMutation({
    mutationFn: (id: number) => masterDataApi.deactivateUser(id),
    onSuccess: () => {
      toast.success('Karyawan dinonaktifkan.')
      invalidate()
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Gagal menonaktifkan karyawan.')),
  })

  return { create, update, deactivate }
}

/** Mutations for managing an employee's "off" periods (HRD/admin). */
export function useOffPeriodActions(userId: number) {
  const qc = useQueryClient()
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['users', 'detail', userId] })
    qc.invalidateQueries({ queryKey: ['users'] })
  }

  const setOff = useMutation({
    mutationFn: (payload: SetOffPayload) => masterDataApi.setOffPeriod(userId, payload),
    onSuccess: () => {
      toast.success('Karyawan ditandai off.')
      invalidate()
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Gagal menandai off.')),
  })

  const endOff = useMutation({
    mutationFn: (vars: { id: number; end_date: string }) =>
      masterDataApi.updateOffPeriod(vars.id, { end_date: vars.end_date }),
    onSuccess: () => {
      toast.success('Periode off diakhiri.')
      invalidate()
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Gagal mengakhiri off.')),
  })

  const removeOff = useMutation({
    mutationFn: (id: number) => masterDataApi.deleteOffPeriod(id),
    onSuccess: () => {
      toast.success('Periode off dihapus.')
      invalidate()
    },
    onError: (error) => toast.error(getApiErrorMessage(error, 'Gagal menghapus periode off.')),
  })

  return { setOff, endOff, removeOff }
}
