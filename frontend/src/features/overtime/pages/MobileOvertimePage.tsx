import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { LogIn, LogOut, Pencil, Plus, X } from 'lucide-react'
import { MobileHeader } from '@/components/mobile/MobileHeader'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
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
import { formatDate, formatDateTime, formatTime } from '@/lib/utils'
import { overtimeEditPath } from '@/routes/routePaths'
import type { CompensationType, OvertimeRequestEmployee } from '@/types/overtime'

interface EmployeeRow {
  planned_start_at: string
  planned_end_at: string
  compensation_type: CompensationType
}

const defaultStart = (date: string) => (date ? `${date}T17:00` : '')
const defaultEnd = (date: string) => (date ? `${date}T20:00` : '')

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
  const [overtimeDate, setOvertimeDate] = useState('')
  const [reason, setReason] = useState('')
  const [rows, setRows] = useState<Record<number, EmployeeRow>>({})

  const employees = useUsers(
    showForm && canCreate
      ? { is_active: true, per_page: 100, department_id: currentUser?.department_id ?? undefined }
      : {},
  )

  const selectedIds = Object.keys(rows).map(Number)

  const toggle = (id: number) =>
    setRows((prev) => {
      if (prev[id]) {
        const { [id]: _, ...rest } = prev
        return rest
      }
      return {
        ...prev,
        [id]: {
          planned_start_at: defaultStart(overtimeDate),
          planned_end_at: defaultEnd(overtimeDate),
          compensation_type: 'money',
        },
      }
    })

  const setRow = (id: number, patch: Partial<EmployeeRow>) =>
    setRows((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }))

  const onDateChange = (date: string) => {
    setOvertimeDate(date)
    setRows((prev) => {
      const next: Record<number, EmployeeRow> = {}
      for (const [id, r] of Object.entries(prev)) {
        next[Number(id)] = {
          ...r,
          planned_start_at: r.planned_start_at || defaultStart(date),
          planned_end_at: r.planned_end_at || defaultEnd(date),
        }
      }
      return next
    })
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    await createOvertime.mutateAsync({
      overtime_date: overtimeDate,
      reason,
      employees: selectedIds.map((id) => ({ user_id: id, ...rows[id] })),
    })
    setOvertimeDate('')
    setReason('')
    setRows({})
    setShowForm(false)
  }

  const employeeName = (id: number) => employees.data?.data.find((u) => u.id === id)?.name ?? `#${id}`

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
                value={overtimeDate}
                onChange={(e) => onDateChange(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="m-ot-reason">Alasan</Label>
              <Textarea
                id="m-ot-reason"
                required
                maxLength={1000}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Karyawan ({selectedIds.length} dipilih)</Label>
              {employees.isLoading ? (
                <Spinner className="h-4 w-4" />
              ) : (
                <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border p-2">
                  {employees.data?.data.map((u) => (
                    <label key={u.id} className="flex items-center gap-2 rounded px-1 py-1 text-sm">
                      <input type="checkbox" checked={Boolean(rows[u.id])} onChange={() => toggle(u.id)} />
                      {u.name}
                    </label>
                  ))}
                </div>
              )}
            </div>

            {selectedIds.map((id) => (
              <div key={id} className="space-y-2 rounded-lg border p-3">
                <div className="text-sm font-medium">{employeeName(id)}</div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">Mulai</Label>
                  <Input
                    type="datetime-local"
                    required
                    value={rows[id].planned_start_at}
                    onChange={(e) => setRow(id, { planned_start_at: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">Selesai</Label>
                  <Input
                    type="datetime-local"
                    required
                    value={rows[id].planned_end_at}
                    onChange={(e) => setRow(id, { planned_end_at: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">Kompensasi</Label>
                  <Select
                    value={rows[id].compensation_type}
                    onChange={(e) => setRow(id, { compensation_type: e.target.value as CompensationType })}
                  >
                    <option value="money">Ganti Uang</option>
                    <option value="leave">Ganti Hari</option>
                  </Select>
                </div>
              </div>
            ))}

            <Button type="submit" disabled={createOvertime.isPending || selectedIds.length === 0} className="w-full">
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
                <div className="flex items-center gap-2">
                  {canCreate && (
                    <Link
                      to={overtimeEditPath(o.id)}
                      className={buttonVariants({ size: 'sm', variant: 'outline' })}
                    >
                      <Pencil className="h-4 w-4" /> Edit
                    </Link>
                  )}
                  <Badge variant={requestStatusVariant(o.status)}>{o.status_label}</Badge>
                </div>
              </div>
              {o.department && <p className="text-sm text-slate-500">{o.department.name}</p>}
              <p className="mt-1 text-sm text-slate-600">{o.reason}</p>
              <div className="mt-2 divide-y rounded-lg border">
                {o.employees?.map((emp) => (
                  <div key={emp.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{emp.user?.name ?? `#${emp.user_id}`}</span>
                        <Badge variant={emp.compensation_type === 'leave' ? 'success' : 'muted'}>
                          {emp.compensation_label}
                        </Badge>
                      </div>
                      <div className="text-xs text-slate-500">
                        {formatDateTime(emp.planned_start_at)} – {formatDateTime(emp.planned_end_at)}
                        {emp.compensation_type === 'leave' && emp.leave_days_credited > 0 && (
                          <span className="ml-1 text-emerald-600">· +{emp.leave_days_credited} hari</span>
                        )}
                      </div>
                    </div>
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
