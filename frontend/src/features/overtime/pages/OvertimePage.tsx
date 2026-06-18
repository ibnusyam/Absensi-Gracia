import { useState, type FormEvent } from 'react'
import { Clock, LogIn, LogOut, Plus, X } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Spinner, PageLoader } from '@/components/ui/spinner'
import {
  useOvertimeList,
  useCreateOvertime,
  useOvertimeSessionClock,
} from '@/features/overtime/hooks/useOvertime'
import { useUsers } from '@/features/users/hooks/useUsers'
import { useCurrentUser, useHasRole } from '@/features/auth/hooks/useAuth'
import { requestStatusVariant } from '@/lib/statusBadge'
import { formatDate, formatTime } from '@/lib/utils'
import type { OvertimeRequestEmployee } from '@/types/overtime'

const emptyForm = {
  overtime_date: '',
  planned_start: '',
  planned_end: '',
  reason: '',
}

function SessionControl({ employee, currentUserId }: { employee: OvertimeRequestEmployee; currentUserId?: number }) {
  const { clockIn, clockOut } = useOvertimeSessionClock()
  const session = employee.session
  const isMine = employee.user_id === currentUserId

  if (!session) {
    return <Badge variant="muted">Menunggu</Badge>
  }

  if (session.clock_out_at) {
    return (
      <span className="text-xs text-muted-foreground">
        {formatTime(session.clock_in_at)}–{formatTime(session.clock_out_at)}
        {session.total_hours != null && ` · ${session.total_hours} jam`}
      </span>
    )
  }

  if (session.clock_in_at) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Mulai {formatTime(session.clock_in_at)}</span>
        {isMine && (
          <Button
            size="sm"
            variant="success"
            disabled={clockOut.isPending}
            onClick={() => clockOut.mutate(session.id)}
          >
            <LogOut className="h-4 w-4" /> Selesai
          </Button>
        )}
      </div>
    )
  }

  return isMine ? (
    <Button size="sm" disabled={clockIn.isPending} onClick={() => clockIn.mutate(session.id)}>
      <LogIn className="h-4 w-4" /> Mulai
    </Button>
  ) : (
    <Badge variant="muted">Belum mulai</Badge>
  )
}

export function OvertimePage() {
  const list = useOvertimeList({ per_page: 20 })
  const createOvertime = useCreateOvertime()
  const currentUser = useCurrentUser()
  const canCreate = useHasRole('admin-bagian')

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [selected, setSelected] = useState<number[]>([])
  // Only the admin's own department — they can only request overtime for their bagian.
  const employees = useUsers(
    showForm && canCreate
      ? { is_active: true, per_page: 100, department_id: currentUser?.department_id ?? undefined }
      : {},
  )

  const reset = () => {
    setForm(emptyForm)
    setSelected([])
  }

  const toggleEmployee = (id: number) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    await createOvertime.mutateAsync({ ...form, employee_ids: selected })
    reset()
    setShowForm(false)
  }

  return (
    <div>
      <PageHeader
        title="Lembur"
        description="Pengajuan dan pelaksanaan lembur."
        action={
          canCreate && (
            <Button onClick={() => setShowForm((v) => !v)}>
              {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              {showForm ? 'Tutup' : 'Ajukan Lembur'}
            </Button>
          )
        }
      />

      {showForm && canCreate && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Pengajuan Lembur Baru</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="overtime_date">Tanggal</Label>
                <Input
                  id="overtime_date"
                  type="date"
                  required
                  value={form.overtime_date}
                  onChange={(e) => setForm({ ...form, overtime_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="planned_start">Mulai</Label>
                <Input
                  id="planned_start"
                  type="time"
                  required
                  value={form.planned_start}
                  onChange={(e) => setForm({ ...form, planned_start: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="planned_end">Selesai</Label>
                <Input
                  id="planned_end"
                  type="time"
                  required
                  value={form.planned_end}
                  onChange={(e) => setForm({ ...form, planned_end: e.target.value })}
                />
              </div>
              <div className="space-y-2 sm:col-span-3">
                <Label htmlFor="reason">Alasan</Label>
                <Textarea
                  id="reason"
                  required
                  maxLength={1000}
                  placeholder="Jelaskan kebutuhan lembur…"
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                />
              </div>
              <div className="space-y-2 sm:col-span-3">
                <Label>Karyawan ({selected.length} dipilih)</Label>
                {employees.isLoading ? (
                  <Spinner className="h-4 w-4" />
                ) : (
                  <div className="grid max-h-48 gap-1 overflow-y-auto rounded-md border p-2 sm:grid-cols-2">
                    {employees.data?.data.map((u) => (
                      <label key={u.id} className="flex items-center gap-2 rounded px-2 py-1 text-sm hover:bg-accent">
                        <input
                          type="checkbox"
                          checked={selected.includes(u.id)}
                          onChange={() => toggleEmployee(u.id)}
                        />
                        <span>{u.name}</span>
                        {u.department && (
                          <span className="text-xs text-muted-foreground">· {u.department.name}</span>
                        )}
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <div className="sm:col-span-3">
                <Button type="submit" disabled={createOvertime.isPending || selected.length === 0}>
                  {createOvertime.isPending && <Spinner className="h-4 w-4" />}
                  Kirim Pengajuan
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {list.isLoading ? (
        <PageLoader />
      ) : list.data?.data.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Belum ada pengajuan lembur.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {list.data?.data.map((o) => (
            <Card key={o.id}>
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
                  <span className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    {formatDate(o.overtime_date)} · {o.planned_start}–{o.planned_end}
                  </span>
                  <Badge variant={requestStatusVariant(o.status)}>{o.status_label}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">{o.reason}</p>
                {o.department && (
                  <p className="text-xs text-muted-foreground">Bagian: {o.department.name}</p>
                )}
                <div className="divide-y rounded-md border">
                  {o.employees?.map((emp) => (
                    <div key={emp.id} className="flex items-center justify-between gap-2 px-3 py-2">
                      <span className="text-sm">{emp.user?.name ?? `#${emp.user_id}`}</span>
                      <SessionControl employee={emp} currentUserId={currentUser?.id} />
                    </div>
                  ))}
                  {(!o.employees || o.employees.length === 0) && (
                    <p className="px-3 py-2 text-sm text-muted-foreground">Tidak ada karyawan.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
