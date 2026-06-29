import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Check, CheckSquare, Clock, Eye, Plane, X } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { PageLoader } from '@/components/ui/spinner'
import { usePendingApprovals, useApprovalAction } from '@/features/approval/hooks/useApproval'
import { requestStatusVariant } from '@/lib/statusBadge'
import { requestLeaveDetailPath, requestOvertimeDetailPath } from '@/routes/routePaths'
import { formatDate } from '@/lib/utils'

type ApprovalType = 'overtime' | 'leave'

function ApprovalActions({ type, id }: { type: ApprovalType; id: number }) {
  const action = useApprovalAction()
  const [notes, setNotes] = useState('')
  const busy = action.isPending

  const act = (decision: 'approved' | 'rejected') => {
    action.mutate({ type, id, payload: { action: decision, notes: notes || undefined } })
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <Input
        placeholder="Catatan (opsional)"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        className="sm:max-w-xs"
      />
      <div className="flex gap-2">
        <Button size="sm" variant="success" disabled={busy} onClick={() => act('approved')}>
          <Check className="h-4 w-4" /> Setujui
        </Button>
        <Button size="sm" variant="destructive" disabled={busy} onClick={() => act('rejected')}>
          <X className="h-4 w-4" /> Tolak
        </Button>
      </div>
    </div>
  )
}

export function ApprovalPage() {
  const { data, isLoading } = usePendingApprovals()
  const navigate = useNavigate()

  const overtime = data?.overtime ?? []
  const leave = data?.leave ?? []
  const total = overtime.length + leave.length

  return (
    <div>
      <PageHeader
        title="Approval"
        description="Tinjau pengajuan yang menunggu persetujuan Anda."
        action={total > 0 ? <Badge variant="warning">{total} menunggu</Badge> : undefined}
      />

      {isLoading ? (
        <PageLoader />
      ) : total === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100">
              <CheckSquare className="h-6 w-6 text-green-700" />
            </div>
            <p className="text-sm text-muted-foreground">Tidak ada pengajuan yang menunggu. 🎉</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {overtime.length > 0 && (
            <section className="space-y-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <Clock className="h-4 w-4" /> Lembur ({overtime.length})
              </h2>
              {overtime.map((o) => (
                <Card key={o.id}>
                  <CardHeader>
                    <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
                      <span>
                        {formatDate(o.overtime_date)}
                        {o.department && ` · ${o.department.name}`}
                      </span>
                      <div className="flex items-center gap-2">
                        <Badge variant={requestStatusVariant(o.status)}>{o.status_label}</Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(requestOvertimeDetailPath(o.id))}
                        >
                          <Eye className="h-4 w-4" /> Detail
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm">{o.reason}</p>
                    <p className="text-xs text-muted-foreground">
                      Diajukan oleh {o.requester?.name ?? '-'}
                      {o.department && ` · ${o.department.name}`}
                      {o.employees && ` · ${o.employees.length} karyawan`}
                    </p>
                    <ApprovalActions type="overtime" id={o.id} />
                  </CardContent>
                </Card>
              ))}
            </section>
          )}

          {leave.length > 0 && (
            <section className="space-y-3">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <Plane className="h-4 w-4" /> Cuti ({leave.length})
              </h2>
              {leave.map((l) => (
                <Card key={l.id}>
                  <CardHeader>
                    <CardTitle className="flex flex-wrap items-center justify-between gap-2 text-base">
                      <span>
                        {l.type_label} · {formatDate(l.start_date)}–{formatDate(l.end_date)} ({l.total_days} hari)
                      </span>
                      <div className="flex items-center gap-2">
                        <Badge variant={requestStatusVariant(l.status)}>{l.status_label}</Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(requestLeaveDetailPath(l.id))}
                        >
                          <Eye className="h-4 w-4" /> Detail
                        </Button>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm">{l.reason}</p>
                    <p className="text-xs text-muted-foreground">
                      Diajukan oleh {l.user?.name ?? '-'}
                    </p>
                    <ApprovalActions type="leave" id={l.id} />
                  </CardContent>
                </Card>
              ))}
            </section>
          )}
        </div>
      )}
    </div>
  )
}
