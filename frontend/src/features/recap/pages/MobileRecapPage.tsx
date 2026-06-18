import { useState } from 'react'
import { Clock, Plane } from 'lucide-react'
import { MobileHeader } from '@/components/mobile/MobileHeader'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { useLeaveRecap, useOvertimeRecap } from '@/features/recap/hooks/useRecap'
import { formatDate, monthBounds, currentMonthValue, cn } from '@/lib/utils'

type Tab = 'leave' | 'overtime'

function multiplierLabel(key: string): string {
  return `${key.replace('.', ',')}×`
}

export function MobileRecapPage() {
  const [tab, setTab] = useState<Tab>('leave')
  const [month, setMonth] = useState(currentMonthValue())
  const { month: m, year: y } = monthBounds(month)
  const filters = { month: m, year: y }

  const leave = useLeaveRecap(filters)
  const overtime = useOvertimeRecap(filters)
  const loading = tab === 'leave' ? leave.isLoading : overtime.isLoading

  const tierEntries = Object.entries(overtime.data?.summary.hours_by_multiplier ?? {}).sort(
    (a, b) => Number(a[0]) - Number(b[0]),
  )

  return (
    <div className="pb-8">
      <MobileHeader title="Rekap" />

      <div className="px-4 pt-4">
        <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-4 pb-0">
        <button
          type="button"
          onClick={() => setTab('leave')}
          className={cn(
            'flex flex-1 items-center justify-center gap-2 rounded-xl py-2 text-sm font-medium',
            tab === 'leave' ? 'bg-sky-500 text-white' : 'bg-white text-slate-600 shadow-sm',
          )}
        >
          <Plane className="h-4 w-4" /> Cuti
        </button>
        <button
          type="button"
          onClick={() => setTab('overtime')}
          className={cn(
            'flex flex-1 items-center justify-center gap-2 rounded-xl py-2 text-sm font-medium',
            tab === 'overtime' ? 'bg-sky-500 text-white' : 'bg-white text-slate-600 shadow-sm',
          )}
        >
          <Clock className="h-4 w-4" /> Lembur
        </button>
      </div>

      <div className="space-y-3 p-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <Spinner className="h-6 w-6 text-sky-500" />
          </div>
        ) : tab === 'leave' ? (
          <>
            <div className="rounded-2xl bg-sky-500 p-4 text-white">
              <p className="text-sm opacity-90">Jumlah orang cuti bulan ini</p>
              <p className="text-3xl font-bold">{leave.data?.summary.total_people ?? 0}</p>
              <p className="mt-1 text-xs opacity-90">
                {leave.data?.summary.total_requests ?? 0} pengajuan · {leave.data?.summary.total_days ?? 0} hari
              </p>
            </div>
            {leave.data?.data.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">Tidak ada cuti disetujui.</p>
            ) : (
              leave.data?.data.map((l) => (
                <div key={l.id} className="rounded-2xl bg-white p-4 shadow-sm">
                  <p className="font-semibold text-slate-800">{l.user?.name ?? `#${l.user_id}`}</p>
                  <p className="text-xs text-slate-400">{l.user?.department?.name ?? '-'}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    {l.type_label} · {formatDate(l.start_date)} – {formatDate(l.end_date)} · {l.total_days} hari
                  </p>
                </div>
              ))
            )}
          </>
        ) : (
          <>
            <div className="rounded-2xl bg-emerald-600 p-4 text-white">
              <p className="text-sm opacity-90">Total jam lembur bulan ini</p>
              <p className="text-3xl font-bold">{overtime.data?.summary.total_hours ?? 0} jam</p>
              <p className="mt-1 text-xs opacity-90">
                {overtime.data?.summary.total_sessions ?? 0} sesi · {overtime.data?.summary.total_employees ?? 0} karyawan
              </p>
              {tierEntries.length > 0 && (
                <p className="mt-1 text-xs opacity-90">
                  {tierEntries.map(([k, v]) => `${v}j ${multiplierLabel(k)}`).join(' · ')}
                </p>
              )}
            </div>
            {overtime.data?.data.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">Tidak ada lembur selesai.</p>
            ) : (
              overtime.data?.data.map((r) => (
                <div key={r.session_id} className="rounded-2xl bg-white p-4 shadow-sm">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="font-semibold text-slate-800">{r.employee_name ?? '-'}</span>
                    <Badge variant={r.is_holiday ? 'warning' : 'muted'}>
                      {r.is_holiday ? 'Libur' : 'Kerja'}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-400">
                    {formatDate(r.overtime_date)} · {r.department_name ?? '-'}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {r.total_hours} jam
                    {Object.keys(r.tiers).length > 0 &&
                      ` (${Object.entries(r.tiers)
                        .map(([k, v]) => `${v}j ${multiplierLabel(k)}`)
                        .join(' + ')})`}
                  </p>
                </div>
              ))
            )}
          </>
        )}
      </div>
    </div>
  )
}
