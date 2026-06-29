import { useState } from 'react'
import { Download } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { PageLoader } from '@/components/ui/spinner'
import { useDepartments } from '@/features/users/hooks/useUsers'
import { useHasRole } from '@/features/auth/hooks/useAuth'
import { useAttendanceReport } from '@/features/attendanceReport/hooks/useAttendanceReport'
import { SummaryCards } from '@/features/attendanceReport/components/SummaryCards'
import { AttendanceDetailModal } from '@/features/attendanceReport/components/AttendanceDetailModal'
import { attendanceBadgeVariant } from '@/lib/statusBadge'
import { formatTime, formatWorkDuration } from '@/lib/utils'
import { exportToXlsx } from '@/lib/exportExcel'
import { todayString } from '@/features/attendanceReport/date'
import type { AttendanceReportRow } from '@/types/attendanceReport'

export function AttendanceReportPage() {
  const [date, setDate] = useState(todayString)
  const [departmentId, setDepartmentId] = useState('')
  const [selected, setSelected] = useState<AttendanceReportRow | null>(null)

  const isAdminBagian = useHasRole('admin-bagian')
  const departments = useDepartments()
  const report = useAttendanceReport({
    date,
    department_id: departmentId ? Number(departmentId) : undefined,
  })

  const rows = report.data?.rows ?? []

  const handleExport = () => {
    const data = rows.map((r) => ({
      Nama: r.user.name,
      NIK: r.user.employee_id ?? '-',
      Departemen: r.user.department?.name ?? '-',
      Status: r.status_label,
      Masuk: formatTime(r.attendance?.clock_in_at),
      Keluar: formatTime(r.attendance?.clock_out_at),
      'Jam Kerja': formatWorkDuration(r.attendance?.clock_in_at, r.attendance?.clock_out_at),
    }))
    exportToXlsx(`laporan-absensi-${date}`, 'Laporan Absensi', data)
  }

  return (
    <div>
      <PageHeader
        title="Laporan Absensi"
        description="Pantau kehadiran karyawan per hari."
        action={
          <Button variant="outline" onClick={handleExport} disabled={rows.length === 0}>
            <Download className="h-4 w-4" /> Export Excel
          </Button>
        }
      />

      <Card className="mb-4">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
          <div className="space-y-1">
            <Label htmlFor="date">Tanggal</Label>
            <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          {!isAdminBagian && (
            <div className="space-y-1">
              <Label htmlFor="dept">Departemen</Label>
              <Select
                id="dept"
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="sm:w-56"
              >
                <option value="">Semua departemen</option>
                {departments.data?.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </Select>
            </div>
          )}
          <div className="sm:ml-auto sm:text-right">
            <p className="text-sm text-muted-foreground">Total karyawan</p>
            <p className="text-xl font-bold">{report.data?.summary.total ?? '-'}</p>
          </div>
        </CardContent>
      </Card>

      {report.isLoading ? (
        <PageLoader />
      ) : (
        <>
          <div className="mb-4">
            {report.data && <SummaryCards summary={report.data.summary} />}
          </div>

          {report.data?.is_holiday && (
            <p className="mb-3 rounded-lg bg-amber-50 px-4 py-2 text-sm text-amber-700">
              Tanggal ini akhir pekan / hari libur.
            </p>
          )}

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="px-4 py-3 font-medium">Nama</th>
                      <th className="px-4 py-3 font-medium">Departemen</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Masuk</th>
                      <th className="px-4 py-3 font-medium">Keluar</th>
                      <th className="px-4 py-3 font-medium">Jam Kerja</th>
                      <th className="px-4 py-3 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.data?.rows.map((row) => (
                      <tr key={row.user.id} className="border-b last:border-0">
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-800">{row.user.name}</p>
                          <p className="text-xs text-muted-foreground">{row.user.employee_id ?? '-'}</p>
                        </td>
                        <td className="px-4 py-3">{row.user.department?.name ?? '-'}</td>
                        <td className="px-4 py-3">
                          <Badge variant={attendanceBadgeVariant(row.status)}>{row.status_label}</Badge>
                        </td>
                        <td className="px-4 py-3">{formatTime(row.attendance?.clock_in_at)}</td>
                        <td className="px-4 py-3">{formatTime(row.attendance?.clock_out_at)}</td>
                        <td className="px-4 py-3 font-medium">
                          {formatWorkDuration(row.attendance?.clock_in_at, row.attendance?.clock_out_at)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={!row.attendance}
                            onClick={() => setSelected(row)}
                          >
                            Detail
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {report.data?.rows.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
                          Tidak ada karyawan.
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

      {selected && <AttendanceDetailModal row={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
