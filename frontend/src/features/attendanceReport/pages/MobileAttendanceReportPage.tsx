import { useState } from 'react'
import { ChevronRight } from 'lucide-react'
import { MobileHeader } from '@/components/mobile/MobileHeader'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { useDepartments } from '@/features/users/hooks/useUsers'
import { useHasRole } from '@/features/auth/hooks/useAuth'
import { useAttendanceReport } from '@/features/attendanceReport/hooks/useAttendanceReport'
import { SummaryCards } from '@/features/attendanceReport/components/SummaryCards'
import { AttendanceDetailModal } from '@/features/attendanceReport/components/AttendanceDetailModal'
import { attendanceBadgeVariant } from '@/lib/statusBadge'
import { formatTime } from '@/lib/utils'
import { todayString } from '@/features/attendanceReport/date'
import type { AttendanceReportRow } from '@/types/attendanceReport'

export function MobileAttendanceReportPage() {
  const [date, setDate] = useState(todayString)
  const [departmentId, setDepartmentId] = useState('')
  const [selected, setSelected] = useState<AttendanceReportRow | null>(null)

  const isAdminBagian = useHasRole('admin-bagian')
  const departments = useDepartments()
  const report = useAttendanceReport({
    date,
    department_id: departmentId ? Number(departmentId) : undefined,
  })

  return (
    <div className="pb-8">
      <MobileHeader title="Laporan Absensi" />

      <div className="space-y-3 p-4">
        <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="bg-white" />
        {!isAdminBagian && (
          <Select
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            className="bg-white"
          >
            <option value="">Semua departemen</option>
            {departments.data?.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </Select>
        )}

        {report.isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner className="h-6 w-6 text-sky-500" />
          </div>
        ) : (
          <>
            {report.data && <SummaryCards summary={report.data.summary} />}

            {report.data?.is_holiday && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
                Tanggal ini akhir pekan / hari libur.
              </p>
            )}

            {report.data?.rows.map((row) => (
              <button
                key={row.user.id}
                onClick={() => row.attendance && setSelected(row)}
                className="flex w-full items-center gap-3 rounded-xl bg-white p-3 text-left shadow-sm disabled:opacity-100"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-slate-800">{row.user.name}</p>
                  <p className="truncate text-xs text-slate-500">
                    {row.user.department?.name ?? '-'}
                    {row.attendance?.clock_in_at && ` · masuk ${formatTime(row.attendance.clock_in_at)}`}
                  </p>
                </div>
                <Badge variant={attendanceBadgeVariant(row.status)}>{row.status_label}</Badge>
                {row.attendance && <ChevronRight className="h-4 w-4 text-slate-300" />}
              </button>
            ))}

            {report.data?.rows.length === 0 && (
              <p className="py-8 text-center text-sm text-slate-400">Tidak ada karyawan.</p>
            )}
          </>
        )}
      </div>

      {selected && <AttendanceDetailModal row={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
