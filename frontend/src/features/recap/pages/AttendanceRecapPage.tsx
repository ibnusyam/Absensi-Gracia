import { useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { PageLoader } from '@/components/ui/spinner'
import { useDepartments } from '@/features/users/hooks/useUsers'
import { useAttendanceRecap } from '@/features/recap/hooks/useRecap'
import { exportToXlsx } from '@/lib/exportExcel'
import { formatDate, cn } from '@/lib/utils'
import type { AttendanceCell } from '@/api/recap.api'

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

/** Short letter, full label and badge colours for each status code. */
const CELL_META: Record<AttendanceCell, { short: string; label: string; className: string }> = {
  present: { short: 'H', label: 'Hadir', className: 'bg-green-100 text-green-700' },
  leave_annual: { short: 'C', label: 'Cuti Tahunan', className: 'bg-blue-100 text-blue-700' },
  leave_sick: { short: 'S', label: 'Sakit', className: 'bg-purple-100 text-purple-700' },
  leave_emergency: { short: 'I', label: 'Izin', className: 'bg-cyan-100 text-cyan-700' },
  absent: { short: 'A', label: 'Alpha', className: 'bg-red-100 text-red-700' },
  holiday: { short: 'L', label: 'Libur', className: 'bg-gray-100 text-gray-400' },
  off: { short: 'O', label: 'Off', className: 'bg-slate-700 text-white' },
  none: { short: '·', label: 'Tidak ada data', className: 'text-gray-300' },
}

/** Totals shown on the right side of the grid, in display order. */
const TOTAL_COLUMNS: { key: string; label: string }[] = [
  { key: 'masuk', label: 'Masuk' },
  { key: 'leave_annual', label: 'Cuti' },
  { key: 'leave_sick', label: 'Sakit' },
  { key: 'leave_emergency', label: 'Izin' },
  { key: 'absent', label: 'Alpha' },
  { key: 'off', label: 'Off' },
]

function totalValue(totals: Record<string, number>, key: string): number {
  if (key === 'masuk') return totals.present ?? 0
  return totals[key] ?? 0
}

function dayHeader(ds: string): { day: string; weekday: string; isWeekend: boolean } {
  const d = new Date(`${ds}T00:00:00`)
  const dow = d.getDay()
  return {
    day: String(d.getDate()).padStart(2, '0'),
    weekday: d.toLocaleDateString('id-ID', { weekday: 'short' }),
    isWeekend: dow === 0 || dow === 6,
  }
}

/**
 * Excel column header for a date, e.g. "10 Jun". Must be a non-integer-like,
 * unique string: object keys that look like integers ("10", "26") get reordered
 * to the front by JS engines, which scrambles the exported column order.
 */
function excelDateLabel(ds: string): string {
  return new Date(`${ds}T00:00:00`).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })
}

export function AttendanceRecapPage() {
  const [startDate, setStartDate] = useState(firstOfMonth)
  const [endDate, setEndDate] = useState(() => isoLocal(new Date()))
  const [departmentId, setDepartmentId] = useState('')

  const departments = useDepartments()
  const recap = useAttendanceRecap({
    start_date: startDate,
    end_date: endDate,
    department_id: departmentId ? Number(departmentId) : undefined,
  })

  const dates = recap.data?.dates ?? []
  const rows = recap.data?.rows ?? []
  const rangeInvalid = Boolean(startDate && endDate && endDate < startDate)

  const dayHeaders = useMemo(() => dates.map(dayHeader), [dates])

  // Per-day count of employees who came in (Hadir); other statuses
  // (cuti/izin/sakit/alpha/off/libur) are not counted.
  const dailyMasuk = useMemo(
    () =>
      dates.map((_, i) =>
        rows.reduce((acc, r) => acc + (r.cells[i] === 'present' ? 1 : 0), 0),
      ),
    [dates, rows],
  )

  // Column totals across all employees, for the footer's recap columns.
  const columnTotals = useMemo(() => {
    const sums: Record<string, number> = {}
    TOTAL_COLUMNS.forEach((c) => {
      sums[c.key] = rows.reduce((acc, r) => acc + totalValue(r.totals, c.key), 0)
    })
    return sums
  }, [rows])

  const handleExport = () => {
    const data: Record<string, string | number | null>[] = rows.map((r) => {
      const base: Record<string, string | number | null> = {
        Nama: r.user.name,
        NIK: r.user.employee_id ?? '-',
        Departemen: r.user.department_name ?? '-',
      }
      dates.forEach((ds, i) => {
        base[excelDateLabel(ds)] = CELL_META[r.cells[i]]?.short ?? '-'
      })
      TOTAL_COLUMNS.forEach((c) => {
        base[c.label] = totalValue(r.totals, c.key)
      })
      return base
    })

    // Footer: per-day Masuk count + column totals.
    if (rows.length > 0) {
      const footer: Record<string, string | number | null> = {
        Nama: 'TOTAL MASUK',
        NIK: '',
        Departemen: '',
      }
      dates.forEach((ds, i) => {
        footer[excelDateLabel(ds)] = dailyMasuk[i]
      })
      TOTAL_COLUMNS.forEach((c) => {
        footer[c.label] = columnTotals[c.key]
      })
      data.push(footer)
    }

    exportToXlsx(`rekap-absensi-${startDate}_${endDate}`, 'Rekap Absensi', data)
  }

  return (
    <div>
      <PageHeader
        title="Rekap Absensi"
        description="Rekap kehadiran karyawan per periode — hadir, cuti, izin, sakit, dan alpha."
        action={
          <Button variant="outline" onClick={handleExport} disabled={rows.length === 0}>
            <Download className="h-4 w-4" /> Export Excel
          </Button>
        }
      />

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
            />
          </div>
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
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="mb-4 flex flex-wrap gap-2 text-xs">
        {(Object.keys(CELL_META) as AttendanceCell[])
          .filter((k) => k !== 'none')
          .map((k) => (
            <span key={k} className="inline-flex items-center gap-1.5">
              <span
                className={cn(
                  'inline-flex h-5 w-6 items-center justify-center rounded font-semibold',
                  CELL_META[k].className,
                )}
              >
                {CELL_META[k].short}
              </span>
              <span className="text-muted-foreground">{CELL_META[k].label}</span>
            </span>
          ))}
      </div>

      {rangeInvalid ? (
        <Card>
          <CardContent className="p-6 text-center text-sm text-red-600">
            "Sampai tanggal" tidak boleh sebelum "Dari tanggal".
          </CardContent>
        </Card>
      ) : recap.isLoading ? (
        <PageLoader />
      ) : (
        <Card>
          <CardContent className="p-0">
            <p className="px-4 pt-3 text-xs text-muted-foreground sm:hidden">
              Geser ke samping untuk melihat semua tanggal →
            </p>
            <div
              className={cn(
                'overflow-auto scroll-smooth',
                'max-h-[70vh] rounded-b-xl',
                // Refined thin scrollbar (the horizontal "slider").
                '[&::-webkit-scrollbar]:h-2.5 [&::-webkit-scrollbar]:w-2.5',
                '[&::-webkit-scrollbar-track]:bg-transparent',
                '[&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300',
                'hover:[&::-webkit-scrollbar-thumb]:bg-slate-400',
              )}
            >
              <table className="w-max min-w-full border-collapse text-sm">
                <thead>
                  <tr className="text-muted-foreground">
                    <th className="sticky left-0 top-0 z-30 border-b bg-slate-50 px-4 py-2 text-left font-medium shadow-[2px_0_4px_-2px_rgba(0,0,0,0.12)]">
                      Karyawan
                    </th>
                    {dayHeaders.map((h, i) => (
                      <th
                        key={dates[i]}
                        className={cn(
                          'sticky top-0 z-20 w-9 border-b bg-slate-50 px-1 py-2 text-center font-medium',
                          h.isWeekend && 'text-rose-400',
                        )}
                      >
                        <div className="text-[11px] leading-tight">{h.weekday}</div>
                        <div>{h.day}</div>
                      </th>
                    ))}
                    {TOTAL_COLUMNS.map((c, idx) => (
                      <th
                        key={c.key}
                        className={cn(
                          'sticky top-0 z-20 border-b bg-slate-50 px-2 py-2 text-center font-medium',
                          idx === 0 && 'border-l-2 border-l-slate-200',
                        )}
                      >
                        {c.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.user.id} className="group border-b last:border-0">
                      <td className="sticky left-0 z-10 bg-white px-4 py-2 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.12)] group-hover:bg-slate-50">
                        <div className="whitespace-nowrap font-medium text-slate-800">{r.user.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {r.user.department_name ?? '-'}
                        </div>
                      </td>
                      {r.cells.map((code, i) => {
                        const meta = CELL_META[code]
                        return (
                          <td
                            key={dates[i]}
                            className={cn(
                              'px-1 py-1 text-center',
                              dayHeaders[i]?.isWeekend && 'bg-slate-50/70',
                            )}
                          >
                            <span
                              title={`${formatDate(dates[i])} — ${meta.label}`}
                              className={cn(
                                'inline-flex h-6 w-7 items-center justify-center rounded text-xs font-semibold',
                                meta.className,
                              )}
                            >
                              {meta.short}
                            </span>
                          </td>
                        )
                      })}
                      {TOTAL_COLUMNS.map((c, idx) => {
                        const v = totalValue(r.totals, c.key)
                        return (
                          <td
                            key={c.key}
                            className={cn(
                              'px-2 py-2 text-center tabular-nums',
                              idx === 0 && 'border-l-2 border-l-slate-200',
                              c.key === 'absent' && v > 0 && 'font-semibold text-red-600',
                              c.key === 'masuk' && 'font-semibold text-slate-800',
                            )}
                          >
                            {v}
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                  {rows.length === 0 && (
                    <tr>
                      <td
                        colSpan={1 + dates.length + TOTAL_COLUMNS.length}
                        className="px-4 py-6 text-center text-muted-foreground"
                      >
                        Tidak ada data karyawan untuk periode ini.
                      </td>
                    </tr>
                  )}
                </tbody>
                {rows.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-t-slate-200 bg-slate-50 font-semibold text-slate-800">
                      <td className="sticky left-0 bottom-0 z-10 bg-slate-50 px-4 py-2 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.12)]">
                        <div className="whitespace-nowrap">Total Masuk / hari</div>
                        <div className="text-xs font-normal text-muted-foreground">
                          Hadir
                        </div>
                      </td>
                      {dailyMasuk.map((count, i) => (
                        <td
                          key={dates[i]}
                          className={cn(
                            'px-1 py-2 text-center tabular-nums',
                            dayHeaders[i]?.isWeekend && 'bg-slate-100/70',
                          )}
                        >
                          {count}
                        </td>
                      ))}
                      {TOTAL_COLUMNS.map((c, idx) => (
                        <td
                          key={c.key}
                          className={cn(
                            'px-2 py-2 text-center tabular-nums',
                            idx === 0 && 'border-l-2 border-l-slate-200',
                          )}
                        >
                          {columnTotals[c.key]}
                        </td>
                      ))}
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
