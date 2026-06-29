import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, CheckSquare, Clock, Eye, Plane, X } from 'lucide-react'
import { MobileHeader } from '@/components/mobile/MobileHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { usePendingApprovals, useApprovalAction } from '@/features/approval/hooks/useApproval'
import { requestStatusVariant } from '@/lib/statusBadge'
import { requestLeaveDetailPath, requestOvertimeDetailPath } from '@/routes/routePaths'
import { formatDate } from '@/lib/utils'

type ApprovalType = 'overtime' | 'leave'

function Actions({ type, id }: { type: ApprovalType; id: number }) {
  const action = useApprovalAction()
  const [notes, setNotes] = useState('')
  const busy = action.isPending

  const act = (decision: 'approved' | 'rejected') =>
    action.mutate({ type, id, payload: { action: decision, notes: notes || undefined } })

  return (
    <div className="mt-2 space-y-2">
      <Input
        placeholder="Catatan (opsional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
      <div className="flex gap-2">
        <Button size="sm" variant="success" className="flex-1" disabled={busy} onClick={() => act('approved')}>
          <Check className="h-4 w-4" /> Setujui
        </Button>
        <Button size="sm" variant="destructive" className="flex-1" disabled={busy} onClick={() => act('rejected')}>
          <X className="h-4 w-4" /> Tolak
        </Button>
      </div>
    </div>
  )
}

export function MobileApprovalPage() {
  const { data, isLoading } = usePendingApprovals()
  const navigate = useNavigate()
  const overtime = data?.overtime ?? []
  const leave = data?.leave ?? []
  const total = overtime.length + leave.length

  return (
    <div className="pb-8">
      <MobileHeader
        title="Approval"
        action={total > 0 ? <Badge variant="warning">{total}</Badge> : undefined}
      />

      <div className="space-y-3 p-4">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner className="h-6 w-6 text-violet-700" />
          </div>
        ) : total === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl bg-white py-12 text-center shadow-sm">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100">
              <CheckSquare className="h-6 w-6 text-green-700" />
            </div>
            <p className="text-sm text-slate-500">Tidak ada pengajuan menunggu. 🎉</p>
          </div>
        ) : (
          <>
            {overtime.map((o) => (
              <div key={`ot-${o.id}`} className="rounded-2xl bg-white p-4 shadow-sm">
                <div className="mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-semibold text-slate-800">
                    <Clock className="h-4 w-4 text-violet-700" /> Lembur
                  </span>
                  <Badge variant={requestStatusVariant(o.status)}>{o.status_label}</Badge>
                </div>
                <p className="text-sm text-slate-500">
                  {formatDate(o.overtime_date)}
                  {o.department && ` · ${o.department.name}`}
                </p>
                <p className="mt-1 text-sm text-slate-600">{o.reason}</p>
                <p className="mt-1 text-xs text-slate-400">
                  Oleh {o.requester?.name ?? '-'}
                  {o.employees && ` · ${o.employees.length} karyawan`}
                </p>
                <button
                  type="button"
                  onClick={() => navigate(requestOvertimeDetailPath(o.id))}
                  className="mt-2 flex items-center gap-1 text-sm font-medium text-violet-700"
                >
                  <Eye className="h-4 w-4" /> Lihat detail
                </button>
                <Actions type="overtime" id={o.id} />
              </div>
            ))}
            {leave.map((l) => (
              <div key={`lv-${l.id}`} className="rounded-2xl bg-white p-4 shadow-sm">
                <div className="mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 font-semibold text-slate-800">
                    <Plane className="h-4 w-4 text-violet-700" /> Cuti
                  </span>
                  <Badge variant={requestStatusVariant(l.status)}>{l.status_label}</Badge>
                </div>
                <p className="text-sm text-slate-500">
                  {l.type_label} · {formatDate(l.start_date)}–{formatDate(l.end_date)} ({l.total_days} hari)
                </p>
                <p className="mt-1 text-sm text-slate-600">{l.reason}</p>
                <p className="mt-1 text-xs text-slate-400">Oleh {l.user?.name ?? '-'}</p>
                <button
                  type="button"
                  onClick={() => navigate(requestLeaveDetailPath(l.id))}
                  className="mt-2 flex items-center gap-1 text-sm font-medium text-violet-700"
                >
                  <Eye className="h-4 w-4" /> Lihat detail
                </button>
                <Actions type="leave" id={l.id} />
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
