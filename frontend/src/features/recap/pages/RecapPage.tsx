import { useState } from 'react'
import { Clock, Download, Plane } from 'lucide-react'
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
import { formatDate, monthBounds, currentMonthValue, formatMonthLabel, cn } from '@/lib/utils'

type Tab = 'leave' | 'overtime'

/** "1.5" -> "1,5×" */
function multiplierLabel(key: string): string {
  return `${key.replace('.', ',')}×`
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
  const [month, setMonth] = useState(currentMonthValue())
  const [departmentId, setDepartmentId] = useState('')

  const departments = useDepartments()
  const { month: m, year: y } = monthBounds(month)
  const deptId = departmentId ? Number(departmentId) : undefined
  const filters = { month: m, year: y, department_id: deptId }

  const leave = useLeaveRecap(filters)
  const overtime = useOvertimeRecap(filters)

  const tierEntries = Object.entries(overtime.data?.summary.hours_by_multiplier ?? {}).sort(
    (a, b) => Number(a[0]) - Number(b[0]),
  )

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
      exportToXlsx(`rekap-cuti-${y}-${String(m).padStart(2, '0')}`, 'Rekap Cuti', rows)
    } else {
      const rows = (overtime.data?.data ?? []).map((r) => ({
        Tanggal: formatDate(r.overtime_date),
        Karyawan: r.employee_name ?? '-',
        Departemen: r.department_name ?? '-',
        Hari: r.is_holiday ? 'Libur' : 'Kerja',
        'Total Jam': r.total_hours,
        ...Object.fromEntries(
          Object.entries(r.tiers).map(([k, v]) => [`Jam ${multiplierLabel(k)}`, v]),
        ),
      }))
      exportToXlsx(`rekap-lembur-${y}-${String(m).padStart(2, '0')}`, 'Rekap Lembur', rows)
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
        description={`Cuti yang disetujui & lembur yang selesai — ${formatMonthLabel(month)}.`}
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
                            Tidak ada cuti disetujui pada bulan ini.
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
          <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatCard label="Total jam lembur" value={`${overtime.data?.summary.total_hours ?? 0} jam`} />
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
                      <th className="px-4 py-3 font-medium">Tanggal</th>
                      <th className="px-4 py-3 font-medium">Karyawan</th>
                      <th className="px-4 py-3 font-medium">Departemen</th>
                      <th className="px-4 py-3 font-medium">Hari</th>
                      <th className="px-4 py-3 font-medium">Total Jam</th>
                      <th className="px-4 py-3 font-medium">Rincian</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overtime.data?.data.map((r) => (
                      <tr key={r.session_id} className="border-b last:border-0">
                        <td className="px-4 py-3">{formatDate(r.overtime_date)}</td>
                        <td className="px-4 py-3 font-medium text-slate-800">{r.employee_name ?? '-'}</td>
                        <td className="px-4 py-3">{r.department_name ?? '-'}</td>
                        <td className="px-4 py-3">
                          <Badge variant={r.is_holiday ? 'warning' : 'muted'}>
                            {r.is_holiday ? 'Libur' : 'Kerja'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">{r.total_hours} jam</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {Object.entries(r.tiers)
                            .map(([k, v]) => `${v}j ${multiplierLabel(k)}`)
                            .join(' + ') || '-'}
                        </td>
                      </tr>
                    ))}
                    {overtime.data?.data.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                          Tidak ada lembur selesai pada bulan ini.
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
