import { useState } from 'react'
import { Search, UserPlus } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { useNavigate } from 'react-router-dom'
import { PageLoader } from '@/components/ui/spinner'
import { useUsers, useDepartments } from '@/features/users/hooks/useUsers'
import { useHasRole } from '@/features/auth/hooks/useAuth'
import { routePaths, userDetailPath } from '@/routes/routePaths'

export function UsersPage() {
  const navigate = useNavigate()
  const canManage = useHasRole('super-admin', 'hrd')
  const [search, setSearch] = useState('')
  const [departmentId, setDepartmentId] = useState<string>('')
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
    <div>
      <PageHeader
        title="Karyawan"
        description="Daftar karyawan perusahaan."
        action={
          canManage && (
            <Button onClick={() => navigate(routePaths.userNew)}>
              <UserPlus className="h-4 w-4" /> Tambah Karyawan
            </Button>
          )
        }
      />

      <Card className="mb-4">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cari nama atau email…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              className="pl-9"
            />
          </div>
          <Select
            value={departmentId}
            onChange={(e) => {
              setDepartmentId(e.target.value)
              setPage(1)
            }}
            className="sm:max-w-xs"
          >
            <option value="">Semua bagian</option>
            {departments.data?.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {users.isLoading ? (
            <PageLoader />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="px-4 py-3 font-medium">Nama</th>
                    <th className="px-4 py-3 font-medium">NIK</th>
                    <th className="px-4 py-3 font-medium">Email</th>
                    <th className="px-4 py-3 font-medium">Bagian</th>
                    <th className="px-4 py-3 font-medium">Status Karir</th>
                    <th className="px-4 py-3 font-medium">Role</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {users.data?.data.map((u) => (
                    <tr key={u.id} className="border-b last:border-0">
                      <td className="px-4 py-3 font-medium">{u.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{u.employee_id ?? '-'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{u.email}</td>
                      <td className="px-4 py-3">{u.department?.name ?? '-'}</td>
                      <td className="px-4 py-3">
                        {u.jenjang === 'outsourcing' ? (
                          <Badge variant="muted">Outsourcing</Badge>
                        ) : (
                          <span className="text-muted-foreground">Karyawan</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {u.role ? <Badge variant="muted">{u.role.name}</Badge> : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={u.is_active ? 'success' : 'destructive'}>
                          {u.is_active ? 'Aktif' : 'Nonaktif'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="outline" size="sm" onClick={() => navigate(userDetailPath(u.id))}>
                          Detail
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {users.data?.data.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
                        Tidak ada karyawan ditemukan.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {meta && meta.last_page > 1 && (
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Halaman {meta.current_page} dari {meta.last_page} · {meta.total} karyawan
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={meta.current_page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Sebelumnya
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={meta.current_page >= meta.last_page}
              onClick={() => setPage((p) => p + 1)}
            >
              Berikutnya
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
