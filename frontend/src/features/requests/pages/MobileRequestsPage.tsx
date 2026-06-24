import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock, Plane } from 'lucide-react'
import { MobileHeader } from '@/components/mobile/MobileHeader'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { useLeaveList } from '@/features/leave/hooks/useLeave'
import { useOvertimeList } from '@/features/overtime/hooks/useOvertime'
import { Input } from '@/components/ui/input'
import { requestStatusVariant } from '@/lib/statusBadge'
import { requestLeaveDetailPath, requestOvertimeDetailPath } from '@/routes/routePaths'
import { formatDate, formatTime, monthBounds, currentMonthValue, cn } from '@/lib/utils'

type Tab = 'leave' | 'overtime'

export function MobileRequestsPage() {
  const [tab, setTab] = useState<Tab>('leave')
  const [month, setMonth] = useState(currentMonthValue())
  const { from, to } = monthBounds(month)

  const navigate = useNavigate()
  const leave = useLeaveList({ scope: 'all', per_page: 50, date_from: from, date_to: to })
  const overtime = useOvertimeList({ scope: 'all', per_page: 50, date_from: from, date_to: to })

  const loading = tab === 'leave' ? leave.isLoading : overtime.isLoading

  return (
    <div className="pb-8">
      <MobileHeader title="Pengajuan Karyawan" />

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
          leave.data?.data.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">Tidak ada pengajuan cuti.</p>
          ) : (
            leave.data?.data.map((l) => (
              <div
                key={l.id}
                onClick={() => navigate(requestLeaveDetailPath(l.id))}
                className="cursor-pointer rounded-2xl bg-white p-4 shadow-sm active:bg-slate-50"
              >
                <div className="mb-1 flex items-center justify-between">
                  <span className="font-semibold text-slate-800">{l.user?.name ?? `#${l.user_id}`}</span>
                  <Badge variant={requestStatusVariant(l.status)}>{l.status_label}</Badge>
                </div>
                <p className="text-xs text-slate-400">{l.user?.department?.name ?? '-'}</p>
                <p className="mt-1 text-sm text-slate-600">
                  {l.type_label} · {formatDate(l.start_date)} – {formatDate(l.end_date)} · {l.total_days} hari
                </p>
              </div>
            ))
          )
        ) : overtime.data?.data.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">Tidak ada pengajuan lembur.</p>
        ) : (
          overtime.data?.data.map((o) => (
            <div
              key={o.id}
              onClick={() => navigate(requestOvertimeDetailPath(o.id))}
              className="cursor-pointer rounded-2xl bg-white p-4 shadow-sm active:bg-slate-50"
            >
              <div className="mb-1 flex items-center justify-between">
                <span className="font-semibold text-slate-800">
                  {formatDate(o.overtime_date)}
                </span>
                <Badge variant={requestStatusVariant(o.status)}>{o.status_label}</Badge>
              </div>
              <p className="text-sm text-slate-600">
                {o.planned_start}–{o.planned_end}
                {o.department && ` · ${o.department.name}`}
              </p>
              <div className="mt-2 space-y-1">
                {o.employees?.map((emp) => (
                  <div key={emp.id} className="flex items-center justify-between text-xs text-slate-500">
                    <span>{emp.user?.name ?? `#${emp.user_id}`}</span>
                    {emp.session?.clock_out_at ? (
                      <span className="text-right">
                        {formatTime(emp.session.clock_in_at)}–{formatTime(emp.session.clock_out_at)}
                        {emp.session.total_hours != null && (
                          <span className="block">{emp.session.total_hours} jam</span>
                        )}
                      </span>
                    ) : emp.session?.clock_in_at ? (
                      <span>Mulai {formatTime(emp.session.clock_in_at)}</span>
                    ) : (
                      <span className="text-slate-400">Belum mulai</span>
                    )}
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
