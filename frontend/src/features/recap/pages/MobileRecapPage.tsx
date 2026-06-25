import { useState } from 'react'
import { ChevronDown, ChevronRight, Clock, Plane } from 'lucide-react'
import { MobileHeader } from '@/components/mobile/MobileHeader'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { useLeaveRecap, useOvertimeRecap } from '@/features/recap/hooks/useRecap'
import { formatDate, cn } from '@/lib/utils'

type Tab = 'leave' | 'overtime'

function multiplierLabel(key: string): string {
  return `${key.replace('.', ',')}×`
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

export function MobileRecapPage() {
  const [tab, setTab] = useState<Tab>('leave')
  const [startDate, setStartDate] = useState(firstOfMonth)
  const [endDate, setEndDate] = useState(() => isoLocal(new Date()))
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const filters = { start_date: startDate, end_date: endDate }

  const toggleRow = (key: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  const leave = useLeaveRecap(filters)
  const overtime = useOvertimeRecap(filters)
  const loading = tab === 'leave' ? leave.isLoading : overtime.isLoading

  const tierEntries = Object.entries(overtime.data?.summary.hours_by_multiplier ?? {}).sort(
    (a, b) => Number(a[0]) - Number(b[0]),
  )

  return (
    <div className="pb-8">
      <MobileHeader title="Rekap" />

      <div className="flex gap-2 px-4 pt-4">
        <Input
          type="date"
          value={startDate}
          max={endDate || undefined}
          onChange={(e) => setStartDate(e.target.value)}
        />
        <Input
          type="date"
          value={endDate}
          min={startDate || undefined}
          onChange={(e) => setEndDate(e.target.value)}
        />
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
              <p className="text-sm opacity-90">Jumlah orang cuti periode ini</p>
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
              <p className="text-sm opacity-90">Total jam lembur periode ini</p>
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
              overtime.data?.data.map((r, idx) => {
                const key = String(r.user_id ?? r.employee_name ?? idx)
                const isOpen = expanded.has(key)
                return (
                  <div key={key} className="rounded-2xl bg-white p-4 shadow-sm">
                    <button
                      type="button"
                      onClick={() => toggleRow(key)}
                      className="flex w-full items-center justify-between text-left"
                    >
                      <span className="font-semibold text-slate-800">{r.employee_name ?? '-'}</span>
                      {isOpen ? (
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      )}
                    </button>
                    <p className="text-xs text-slate-400">{r.department_name ?? '-'}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      <span className="font-semibold text-slate-800">{r.total_hours} jam</span> ·{' '}
                      {r.day_count} hari · {r.session_count} sesi
                      {r.leave_days > 0 && (
                        <span className="text-emerald-600"> · +{r.leave_days} hari cuti</span>
                      )}
                    </p>
                    {Object.keys(r.tiers).length > 0 && (
                      <p className="mt-0.5 text-xs text-slate-500">
                        {Object.entries(r.tiers)
                          .map(([k, v]) => `${v}j ${multiplierLabel(k)}`)
                          .join(' + ')}
                      </p>
                    )}
                    {isOpen && (
                      <div className="mt-2 space-y-1 border-t pt-2">
                        {r.sessions.map((s) => (
                          <div
                            key={s.session_id}
                            className="flex items-center justify-between text-xs text-slate-500"
                          >
                            <span>
                              {formatDate(s.overtime_date)}{' '}
                              <Badge variant={s.is_holiday ? 'warning' : 'muted'}>
                                {s.is_holiday ? 'Libur' : 'Kerja'}
                              </Badge>
                            </span>
                            <span>
                              {s.total_hours} jam
                              {s.compensation_type === 'leave' && s.leave_days > 0 && (
                                <span className="text-emerald-600"> · +{s.leave_days} hari</span>
                              )}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })
            )}
          </>
        )}
      </div>
    </div>
  )
}
