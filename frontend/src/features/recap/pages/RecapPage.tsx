import { Fragment, useState } from 'react'
import { ChevronDown, ChevronRight, Clock, Download, Plane } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { PageLoader } from '@/components/ui/spinner'
import { useDepartments } from '@/features/users/hooks/useUsers'
import { useLeaveRecap, useOvertimeRecap } from '@/features/recap/hooks/useRecap'
import { exportToXlsx } from '@/lib/exportExcel'
import { formatDate, cn } from '@/lib/utils'

type Tab = 'leave' | 'overtime'

/** "1.5" -> "1,5×" */
function multiplierLabel(key: string): string {
  return `${key.replace('.', ',')}×`
}

/** Hours for a tier cell: localized number, or "–" when there are none. */
function tierCell(hours: number | undefined): string {
  if (!hours) return '–'
  return String(hours).replace('.', ',')
}

/** Local "YYYY-MM-DD" for a Date (avoids the UTC shift of toISOString). */
function isoLocal(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function firstOfMonth(): string {
  const now = new Date()
  return isoLocal(new Date(now.getFullYear(), now.getMonth(), 1))
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-bold text-slate-800">{value}</p>
      </CardContent>
    </Card>
  )
}

export function RecapPage() {
  const [tab, setTab] = useState<Tab>('leave')
  const [startDate, setStartDate] = useState(firstOfMonth)
  const [endDate, setEndDate] = useState(() => isoLocal(new Date()))
  const [departmentId, setDepartmentId] = useState('')
  // Which employee rows are expanded to show their per-session breakdown.
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const toggleRow = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  const departments = useDepartments()
  const deptId = departmentId ? Number(departmentId) : undefined
  const rangeInvalid = Boolean(startDate && endDate && endDate < startDate)
  const filters = { start_date: startDate, end_date: endDate, department_id: deptId }

  const leave = useLeaveRecap(filters)
  const overtime = useOvertimeRecap(filters)

  const tierEntries = Object.entries(overtime.data?.summary.hours_by_multiplier ?? {}).sort(
    (a, b) => Number(a[0]) - Number(b[0]),
  )
  // Sorted multiplier keys (e.g. ["1.5","2","3"]) used as fixed tier columns.
  const tierKeys = tierEntries.map(([k]) => k)

  const handleExport = () => {
    if (tab === 'leave') {
      const rows = (leave.data?.data ?? []).map((l) => ({
        Karyawan: l.user?.name ?? `#${l.user_id}`,
        Departemen: l.user?.department?.name ?? '-',
        Jenis: l.type_label,
        Mulai: formatDate(l.start_date),
        Selesai: formatDate(l.end_date),
        Hari: l.total_days,
      }))
      exportToXlsx(`rekap-cuti-${startDate}_${endDate}`, 'Rekap Cuti', rows)
    } else {
      // One accumulated row per employee. Fixed tier columns (sorted) so every
      // row lines up under the same headers.
      const rows = (overtime.data?.data ?? []).map((r) => ({
        Karyawan: r.employee_name ?? '-',
        Departemen: r.department_name ?? '-',
        'Jumlah Hari': r.day_count,
        'Jumlah Sesi': r.session_count,
        'Total Jam': r.total_hours,
        ...Object.fromEntries(
          tierKeys.map((k) => [`Jam ${multiplierLabel(k)}`, r.tiers[k] ?? 0]),
        ),
        'Hari Cuti': r.leave_days,
      }))
      exportToXlsx(`rekap-lembur-${startDate}_${endDate}`, 'Rekap Lembur', rows)
    }
  }

  const exportDisabled =
    tab === 'leave'
      ? (leave.data?.data.length ?? 0) === 0
      : (overtime.data?.data.length ?? 0) === 0

  return (
    <div>
      <PageHeader
        title="Rekap"
        description={`Cuti yang disetujui & lembur yang selesai — ${formatDate(startDate)} – ${formatDate(endDate)}.`}
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
          onClick={() => setTab('leave')}
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
          onClick={() => setTab('overtime')}
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
            <Label htmlFor="start">Dari tanggal</Label>
            <Input
              id="start"
              type="date"
              value={startDate}
              max={endDate || undefined}
              onChange={(e) => setStartDate(e.target.value)}
              className="sm:w-44"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="end">Sampai tanggal</Label>
            <Input
              id="end"
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(e) => setEndDate(e.target.value)}
              className="sm:w-44"
            />
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

      {rangeInvalid ? (
        <Card>
          <CardContent className="p-6 text-center text-sm text-red-600">
            "Sampai tanggal" tidak boleh sebelum "Dari tanggal".
          </CardContent>
        </Card>
      ) : tab === 'leave' ? (
        leave.isLoading ? (
          <PageLoader />
        ) : (
          <>
            <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <StatCard label="Jumlah orang cuti" value={leave.data?.summary.total_people ?? 0} />
              <StatCard label="Total pengajuan" value={leave.data?.summary.total_requests ?? 0} />
              <StatCard label="Total hari" value={leave.data?.summary.total_days ?? 0} />
            </div>
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
                      </tr>
                    </thead>
                    <tbody>
                      {leave.data?.data.map((l) => (
                        <tr key={l.id} className="border-b last:border-0">
                          <td className="px-4 py-3 font-medium text-slate-800">{l.user?.name ?? `#${l.user_id}`}</td>
                          <td className="px-4 py-3">{l.user?.department?.name ?? '-'}</td>
                          <td className="px-4 py-3">{l.type_label}</td>
                          <td className="px-4 py-3">
                            {formatDate(l.start_date)} – {formatDate(l.end_date)}
                          </td>
                          <td className="px-4 py-3">{l.total_days}</td>
                        </tr>
                      ))}
                      {leave.data?.data.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                            Tidak ada cuti disetujui pada periode ini.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </>
        )
      ) : overtime.isLoading ? (
        <PageLoader />
      ) : (
        <>
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-4">
            <StatCard label="Total jam lembur" value={`${overtime.data?.summary.total_hours ?? 0} jam`} />
            <StatCard label="Hari cuti (ganti hari)" value={`${overtime.data?.summary.total_leave_days ?? 0} hari`} />
            <StatCard label="Jumlah karyawan" value={overtime.data?.summary.total_employees ?? 0} />
            <StatCard label="Total sesi" value={overtime.data?.summary.total_sessions ?? 0} />
          </div>

          {tierEntries.length > 0 && (
            <Card className="mb-4">
              <CardContent className="flex flex-wrap gap-6 p-4">
                <p className="text-sm font-medium text-slate-600">Jam per tarif:</p>
                {tierEntries.map(([mult, hours]) => (
                  <div key={mult} className="text-sm">
                    <span className="font-semibold text-slate-800">{multiplierLabel(mult)}</span>{' '}
                    <span className="text-muted-foreground">{hours} jam</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="px-4 py-3 font-medium">Karyawan</th>
                      <th className="px-4 py-3 font-medium">Departemen</th>
                      <th className="px-4 py-3 text-center font-medium">Hari</th>
                      <th className="px-4 py-3 text-center font-medium">Sesi</th>
                      {tierKeys.map((k) => (
                        <th key={k} className="px-4 py-3 text-center font-medium">
                          {multiplierLabel(k)}
                        </th>
                      ))}
                      <th className="px-4 py-3 text-center font-medium">Total Jam</th>
                      <th className="px-4 py-3 text-center font-medium">Hari Cuti</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overtime.data?.data.map((r, idx) => {
                      const key = String(r.user_id ?? r.employee_name ?? idx)
                      const isOpen = expanded.has(key)
                      return (
                        <Fragment key={key}>
                          <tr
                            className="cursor-pointer border-b last:border-0 hover:bg-slate-50"
                            onClick={() => toggleRow(key)}
                          >
                            <td className="px-4 py-3 font-medium text-slate-800">
                              <span className="flex items-center gap-1.5">
                                {isOpen ? (
                                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                )}
                                {r.employee_name ?? '-'}
                              </span>
                            </td>
                            <td className="px-4 py-3">{r.department_name ?? '-'}</td>
                            <td className="px-4 py-3 text-center tabular-nums">{r.day_count}</td>
                            <td className="px-4 py-3 text-center tabular-nums">{r.session_count}</td>
                            {tierKeys.map((k) => (
                              <td key={k} className="px-4 py-3 text-center tabular-nums">
                                {tierCell(r.tiers[k])}
                              </td>
                            ))}
                            <td className="px-4 py-3 text-center font-semibold tabular-nums text-slate-800">
                              {r.total_hours}
                            </td>
                            <td className="px-4 py-3 text-center font-semibold tabular-nums text-emerald-600">
                              {r.leave_days > 0 ? r.leave_days : '-'}
                            </td>
                          </tr>
                          {isOpen && (
                            <tr className="border-b last:border-0 bg-slate-50/60">
                              <td colSpan={6 + tierKeys.length} className="px-4 py-2">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="text-left text-muted-foreground">
                                      <th className="py-1.5 pr-4 font-medium">Tanggal</th>
                                      <th className="py-1.5 pr-4 font-medium">Hari</th>
                                      {tierKeys.map((k) => (
                                        <th key={k} className="py-1.5 pr-4 text-center font-medium">
                                          {multiplierLabel(k)}
                                        </th>
                                      ))}
                                      <th className="py-1.5 pr-4 text-center font-medium">Jam</th>
                                      <th className="py-1.5 text-center font-medium">Hari Cuti</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {r.sessions.map((s) => (
                                      <tr key={s.session_id} className="border-t border-slate-200/70">
                                        <td className="py-1.5 pr-4">{formatDate(s.overtime_date)}</td>
                                        <td className="py-1.5 pr-4">
                                          <Badge variant={s.is_holiday ? 'warning' : 'muted'}>
                                            {s.is_holiday ? 'Libur' : 'Kerja'}
                                          </Badge>
                                        </td>
                                        {tierKeys.map((k) => (
                                          <td key={k} className="py-1.5 pr-4 text-center tabular-nums">
                                            {tierCell(s.tiers[k])}
                                          </td>
                                        ))}
                                        <td className="py-1.5 pr-4 text-center tabular-nums">{s.total_hours}</td>
                                        <td className="py-1.5 text-center tabular-nums text-emerald-600">
                                          {s.compensation_type === 'leave' && s.leave_days > 0 ? s.leave_days : '-'}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      )
                    })}
                    {overtime.data?.data.length === 0 && (
                      <tr>
                        <td colSpan={6 + tierKeys.length} className="px-4 py-6 text-center text-muted-foreground">
                          Tidak ada lembur selesai pada periode ini.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
