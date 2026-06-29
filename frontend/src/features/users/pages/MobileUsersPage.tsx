import { useState } from 'react'
import { Search, UserPlus } from 'lucide-react'
import { MobileHeader } from '@/components/mobile/MobileHeader'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { useNavigate } from 'react-router-dom'
import { Spinner } from '@/components/ui/spinner'
import { useUsers, useDepartments } from '@/features/users/hooks/useUsers'
import { useHasRole } from '@/features/auth/hooks/useAuth'
import { routePaths, userDetailPath } from '@/routes/routePaths'

function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
}

export function MobileUsersPage() {
  const navigate = useNavigate()
  const canManage = useHasRole('super-admin', 'hrd')
  const [search, setSearch] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [page, setPage] = useState(1)

  const departments = useDepartments()
  const users = useUsers({
    search: search || undefined,
    department_id: departmentId ? Number(departmentId) : undefined,
    per_page: 20,
    page,
  })
  const meta = users.data?.meta

  return (
    <div className="pb-8">
      <MobileHeader title="Karyawan" />

      <div className="space-y-3 p-4">
        {canManage && (
          <Button className="w-full" onClick={() => navigate(routePaths.userNew)}>
            <UserPlus className="h-4 w-4" /> Tambah Karyawan
          </Button>
        )}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Cari nama atau email…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            className="bg-white pl-9"
          />
        </div>
        <Select
          value={departmentId}
          onChange={(e) => {
            setDepartmentId(e.target.value)
            setPage(1)
          }}
          className="bg-white"
        >
          <option value="">Semua bagian</option>
          {departments.data?.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </Select>

        {users.isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner className="h-6 w-6 text-violet-700" />
          </div>
        ) : users.data?.data.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">Tidak ada karyawan ditemukan.</p>
        ) : (
          users.data?.data.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => navigate(userDetailPath(u.id))}
              className="flex w-full items-center gap-3 rounded-2xl bg-white p-3 text-left shadow-sm transition-colors active:bg-slate-50"
            >
              {u.avatar_url ? (
                <img src={u.avatar_url} alt={u.name} className="h-11 w-11 rounded-full object-cover" />
              ) : (
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-violet-700">
                  {initials(u.name)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-slate-800">{u.name}</p>
                <p className="truncate text-sm text-slate-500">
                  {u.department?.name ?? '-'}
                  {u.role && ` · ${u.role.name}`}
                </p>
              </div>
              <Badge variant={u.is_active ? 'success' : 'destructive'}>
                {u.is_active ? 'Aktif' : 'Nonaktif'}
              </Badge>
            </button>
          ))
        )}

        {meta && meta.last_page > 1 && (
          <div className="flex items-center justify-between pt-2 text-sm">
            <Button
              variant="outline"
              size="sm"
              disabled={meta.current_page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Sebelumnya
            </Button>
            <span className="text-slate-500">
              {meta.current_page}/{meta.last_page}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={meta.current_page >= meta.last_page}
              onClick={() => setPage((p) => p + 1)}
            >
              Berikutnya
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
