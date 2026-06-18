import { useState, type FormEvent } from 'react'
import { LogIn, LogOut, Plus, X } from 'lucide-react'
import { MobileHeader } from '@/components/mobile/MobileHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Spinner } from '@/components/ui/spinner'
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

const emptyForm = { overtime_date: '', planned_start: '', planned_end: '', reason: '' }

function Session({ employee, currentUserId }: { employee: OvertimeRequestEmployee; currentUserId?: number }) {
  const { clockIn, clockOut } = useOvertimeSessionClock()
  const s = employee.session
  const mine = employee.user_id === currentUserId

  if (!s) return <Badge variant="muted">Menunggu</Badge>
  if (s.clock_out_at)
    return (
      <span className="text-right text-xs text-slate-500">
        {formatTime(s.clock_in_at)}–{formatTime(s.clock_out_at)}
        {s.total_hours != null && ` · ${s.total_hours} jam`}
      </span>
    )
  if (s.clock_in_at)
    return mine ? (
      <Button size="sm" variant="success" disabled={clockOut.isPending} onClick={() => clockOut.mutate(s.id)}>
        <LogOut className="h-4 w-4" /> Selesai
      </Button>
    ) : (
      <span className="text-xs text-slate-500">Mulai {formatTime(s.clock_in_at)}</span>
    )
  return mine ? (
    <Button size="sm" disabled={clockIn.isPending} onClick={() => clockIn.mutate(s.id)}>
      <LogIn className="h-4 w-4" /> Mulai
    </Button>
  ) : (
    <Badge variant="muted">Belum mulai</Badge>
  )
}

export function MobileOvertimePage() {
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

  const toggle = (id: number) =>
    setSelected((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    await createOvertime.mutateAsync({ ...form, employee_ids: selected })
    setForm(emptyForm)
    setSelected([])
    setShowForm(false)
  }

  return (
    <div className="pb-8">
      <MobileHeader
        title="Lembur"
        action={
          canCreate ? (
            <button onClick={() => setShowForm((v) => !v)} aria-label="Ajukan lembur" className="p-1">
              {showForm ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
            </button>
          ) : undefined
        }
      />

      <div className="space-y-3 p-4">
        {showForm && canCreate && (
          <form onSubmit={submit} className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
            <div className="space-y-1">
              <Label htmlFor="m-ot-date">Tanggal</Label>
              <Input
                id="m-ot-date"
                type="date"
                required
                value={form.overtime_date}
                onChange={(e) => setForm({ ...form, overtime_date: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="m-ot-start">Mulai</Label>
                <Input
                  id="m-ot-start"
                  type="time"
                  required
                  value={form.planned_start}
                  onChange={(e) => setForm({ ...form, planned_start: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="m-ot-end">Selesai</Label>
                <Input
                  id="m-ot-end"
                  type="time"
                  required
                  value={form.planned_end}
                  onChange={(e) => setForm({ ...form, planned_end: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="m-ot-reason">Alasan</Label>
              <Textarea
                id="m-ot-reason"
                required
                maxLength={1000}
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>Karyawan ({selected.length} dipilih)</Label>
              {employees.isLoading ? (
                <Spinner className="h-4 w-4" />
              ) : (
                <div className="max-h-44 space-y-1 overflow-y-auto rounded-lg border p-2">
                  {employees.data?.data.map((u) => (
                    <label key={u.id} className="flex items-center gap-2 rounded px-1 py-1 text-sm">
                      <input
                        type="checkbox"
                        checked={selected.includes(u.id)}
                        onChange={() => toggle(u.id)}
                      />
                      {u.name}
                    </label>
                  ))}
                </div>
              )}
            </div>
            <Button
              type="submit"
              disabled={createOvertime.isPending || selected.length === 0}
              className="w-full"
            >
              {createOvertime.isPending && <Spinner className="h-4 w-4" />}
              Kirim Pengajuan
            </Button>
          </form>
        )}

        {list.isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner className="h-6 w-6 text-sky-500" />
          </div>
        ) : list.data?.data.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">Belum ada pengajuan lembur.</p>
        ) : (
          list.data?.data.map((o) => (
            <div key={o.id} className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="mb-1 flex items-center justify-between">
                <span className="font-semibold text-slate-800">{formatDate(o.overtime_date)}</span>
                <Badge variant={requestStatusVariant(o.status)}>{o.status_label}</Badge>
              </div>
              <p className="text-sm text-slate-500">
                {o.planned_start}–{o.planned_end}
                {o.department && ` · ${o.department.name}`}
              </p>
              <p className="mt-1 text-sm text-slate-600">{o.reason}</p>
              <div className="mt-2 divide-y rounded-lg border">
                {o.employees?.map((emp) => (
                  <div key={emp.id} className="flex items-center justify-between gap-2 px-3 py-2">
                    <span className="text-sm">{emp.user?.name ?? `#${emp.user_id}`}</span>
                    <Session employee={emp} currentUserId={currentUser?.id} />
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
