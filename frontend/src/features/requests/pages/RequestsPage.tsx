import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock, Download, Plane } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { PageLoader } from '@/components/ui/spinner'
import { useLeaveList } from '@/features/leave/hooks/useLeave'
import { useOvertimeList } from '@/features/overtime/hooks/useOvertime'
import { useDepartments } from '@/features/users/hooks/useUsers'
import { requestStatusVariant } from '@/lib/statusBadge'
import { formatDate, formatTime, monthBounds, currentMonthValue, cn } from '@/lib/utils'
import { exportToXlsx } from '@/lib/exportExcel'
import { requestLeaveDetailPath, requestOvertimeDetailPath } from '@/routes/routePaths'
import type { LeaveStatus } from '@/types/leave'
import type { OvertimeStatus } from '@/types/overtime'

type Tab = 'leave' | 'overtime'

// The full record of every request (waiting, approved, rejected, cancelled).
const leaveStatusOptions = [
  { value: '', label: 'Semua status' },
  { value: 'pending', label: 'Menunggu' },
  { value: 'approved', label: 'Disetujui' },
  { value: 'rejected', label: 'Ditolak' },
  { value: 'cancelled', label: 'Dibatalkan' },
]

const overtimeStatusOptions = [
  { value: '', label: 'Semua status' },
  { value: 'pending', label: 'Menunggu HRD' },
  { value: 'approved_by_hrd', label: 'Menunggu Direktur' },
  { value: 'approved_by_director', label: 'Disetujui' },
  { value: 'rejected', label: 'Ditolak' },
]

export function RequestsPage() {
  const [tab, setTab] = useState<Tab>('leave')
  const [status, setStatus] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [month, setMonth] = useState(currentMonthValue())

  const navigate = useNavigate()
  const departments = useDepartments()
  const deptId = departmentId ? Number(departmentId) : undefined
  const { from, to } = monthBounds(month)

  const leave = useLeaveList({
    scope: 'all',
    per_page: 50,
    date_from: from,
    date_to: to,
    status: tab === 'leave' ? ((status || undefined) as LeaveStatus | undefined) : undefined,
    department_id: deptId,
  })
  const overtime = useOvertimeList({
    scope: 'all',
    per_page: 50,
    date_from: from,
    date_to: to,
    status: tab === 'overtime' ? ((status || undefined) as OvertimeStatus | undefined) : undefined,
    department_id: deptId,
  })

  const statusOptions = tab === 'leave' ? leaveStatusOptions : overtimeStatusOptions

  const switchTab = (next: Tab) => {
    setTab(next)
    setStatus('') // status enums differ between tabs
  }

  const exportDisabled =
    tab === 'leave'
      ? (leave.data?.data.length ?? 0) === 0
      : (overtime.data?.data.length ?? 0) === 0

  const handleExport = () => {
    if (tab === 'leave') {
      const data = (leave.data?.data ?? []).map((l) => ({
        Karyawan: l.user?.name ?? `#${l.user_id}`,
        Departemen: l.user?.department?.name ?? '-',
        Jenis: l.type_label,
        Mulai: formatDate(l.start_date),
        Selesai: formatDate(l.end_date),
        Hari: l.total_days,
        Status: l.status_label,
      }))
      exportToXlsx('pengajuan-cuti', 'Cuti', data)
    } else {
      // One row per employee so hours & overtime pay are payroll-ready.
      const data = (overtime.data?.data ?? []).flatMap((o) =>
        (o.employees ?? []).map((emp) => ({
          Tanggal: formatDate(o.overtime_date),
          Departemen: o.department?.name ?? '-',
          'Diajukan oleh': o.requester?.name ?? '-',
          Status: o.status_label,
          Karyawan: emp.user?.name ?? `#${emp.user_id}`,
          Mulai: formatTime(emp.session?.clock_in_at),
          Selesai: formatTime(emp.session?.clock_out_at),
          'Total Jam': emp.session?.total_hours ?? '',
        })),
      )
      exportToXlsx('pengajuan-lembur', 'Lembur', data)
    }
  }

  return (
    <div>
      <PageHeader
        title="Pengajuan Karyawan"
        description="Semua pengajuan cuti & lembur — klik untuk lihat riwayat persetujuannya."
        action={
          <Button variant="outline" onClick={handleExport} disabled={exportDisabled}>
            <Download className="h-4 w-4" /> Export Excel
          </Button>
        }
      />

      {/* Tabs */}
      <div className="mb-4 flex gap-2">
        <button
          type="button"
          onClick={() => switchTab('leave')}
          className={cn(
            'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
            tab === 'leave'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-accent',
          )}
        >
          <Plane className="h-4 w-4" /> Cuti
        </button>
        <button
          type="button"
          onClick={() => switchTab('overtime')}
          className={cn(
            'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
            tab === 'overtime'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-accent',
          )}
        >
          <Clock className="h-4 w-4" /> Lembur
        </button>
      </div>

      {/* Filters */}
      <Card className="mb-4">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
          <div className="space-y-1">
            <Label htmlFor="month">Bulan</Label>
            <Input
              id="month"
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="sm:w-44"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="status">Status</Label>
            <Select id="status" value={status} onChange={(e) => setStatus(e.target.value)} className="sm:w-48">
              {statusOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="dept">Departemen</Label>
            <Select id="dept" value={departmentId} onChange={(e) => setDepartmentId(e.target.value)} className="sm:w-56">
              <option value="">Semua departemen</option>
              {departments.data?.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </div>
        </CardContent>
      </Card>

      {tab === 'leave' ? (
        leave.isLoading ? (
          <PageLoader />
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="px-4 py-3 font-medium">Karyawan</th>
                      <th className="px-4 py-3 font-medium">Departemen</th>
                      <th className="px-4 py-3 font-medium">Jenis</th>
                      <th className="px-4 py-3 font-medium">Periode</th>
                      <th className="px-4 py-3 font-medium">Hari</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leave.data?.data.map((l) => (
                      <tr
                        key={l.id}
                        className="cursor-pointer border-b last:border-0 hover:bg-slate-50"
                        onClick={() => navigate(requestLeaveDetailPath(l.id))}
                      >
                        <td className="px-4 py-3 font-medium text-slate-800">{l.user?.name ?? `#${l.user_id}`}</td>
                        <td className="px-4 py-3">{l.user?.department?.name ?? '-'}</td>
                        <td className="px-4 py-3">{l.type_label}</td>
                        <td className="px-4 py-3">
                          {formatDate(l.start_date)} – {formatDate(l.end_date)}
                        </td>
                        <td className="px-4 py-3">{l.total_days}</td>
                        <td className="px-4 py-3">
                          <Badge variant={requestStatusVariant(l.status)}>{l.status_label}</Badge>
                        </td>
                      </tr>
                    ))}
                    {leave.data?.data.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                          Tidak ada pengajuan cuti.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )
      ) : overtime.isLoading ? (
        <PageLoader />
      ) : overtime.data?.data.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Tidak ada pengajuan lembur.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {overtime.data?.data.map((o) => (
            <Card
              key={o.id}
              className="cursor-pointer transition-colors hover:bg-slate-50"
              onClick={() => navigate(requestOvertimeDetailPath(o.id))}
            >
              <CardContent className="space-y-3 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="flex items-center gap-2 font-medium">
                    <Clock className="h-5 w-5 text-primary" />
                    {formatDate(o.overtime_date)} · {o.planned_start}–{o.planned_end}
                  </span>
                  <Badge variant={requestStatusVariant(o.status)}>{o.status_label}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{o.reason}</p>
                <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground">
                  {o.department && <span>Bagian: {o.department.name}</span>}
                  {o.requester && <span>Diajukan oleh: {o.requester.name}</span>}
                </div>
                <div className="divide-y rounded-md border">
                  {o.employees?.map((emp) => (
                    <div key={emp.id} className="flex items-center justify-between gap-2 px-3 py-2">
                      <span className="text-sm">{emp.user?.name ?? `#${emp.user_id}`}</span>
                      {emp.session?.clock_out_at ? (
                        <span className="text-right text-xs text-muted-foreground">
                          {formatTime(emp.session.clock_in_at)}–{formatTime(emp.session.clock_out_at)}
                          {emp.session.total_hours != null && ` · ${emp.session.total_hours} jam`}
                        </span>
                      ) : emp.session?.clock_in_at ? (
                        <span className="text-xs text-muted-foreground">
                          Mulai {formatTime(emp.session.clock_in_at)}
                        </span>
                      ) : (
                        <Badge variant="muted">Belum mulai</Badge>
                      )}
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
