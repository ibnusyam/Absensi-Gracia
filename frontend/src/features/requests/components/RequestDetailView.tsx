import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageLoader } from '@/components/ui/spinner'
import { useLeaveDetail } from '@/features/leave/hooks/useLeave'
import { useOvertimeDetail } from '@/features/overtime/hooks/useOvertime'
import { requestStatusVariant } from '@/lib/statusBadge'
import { formatDate, formatTime } from '@/lib/utils'
import type { LeaveStatus } from '@/types/leave'
import type { OvertimeStatus } from '@/types/overtime'
import { ApprovalTimeline } from './ApprovalTimeline'

export type RequestKind = 'leave' | 'overtime'

/** Next pending step label for the timeline, or null once the request is final. */
function leavePending(status: LeaveStatus): string | null {
  return status === 'pending' ? 'Menunggu persetujuan HRD' : null
}

function overtimePending(status: OvertimeStatus): string | null {
  if (status === 'pending') return 'Menunggu persetujuan HRD'
  if (status === 'approved_by_hrd') return 'Menunggu persetujuan Direktur'
  return null
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-medium text-slate-800">{value}</p>
    </div>
  )
}

export function RequestDetailView({ kind, id }: { kind: RequestKind; id: number }) {
  // Only the relevant query is enabled (the other gets id=0 → disabled).
  const leave = useLeaveDetail(kind === 'leave' ? id : 0)
  const overtime = useOvertimeDetail(kind === 'overtime' ? id : 0)
  const query = kind === 'leave' ? leave : overtime

  if (query.isLoading) return <PageLoader />
  if (query.isError || !query.data) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          Pengajuan tidak ditemukan.
        </CardContent>
      </Card>
    )
  }

  if (kind === 'leave' && leave.data) {
    const l = leave.data
    return (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="space-y-4 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-semibold text-slate-800">{l.user?.name ?? `#${l.user_id}`}</p>
                <p className="text-sm text-muted-foreground">{l.user?.department?.name ?? '-'}</p>
              </div>
              <Badge variant={requestStatusVariant(l.status)}>{l.status_label}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Jenis" value={l.type_label} />
              <Field label="Jumlah hari" value={`${l.total_days} hari`} />
              <Field label="Mulai" value={formatDate(l.start_date)} />
              <Field label="Selesai" value={formatDate(l.end_date)} />
            </div>
            <Field label="Alasan" value={l.reason || '-'} />
            {l.attachment_url && (
              <a
                href={l.attachment_url}
                target="_blank"
                rel="noreferrer"
                className="inline-block text-sm font-medium text-sky-600 hover:underline"
              >
                Lihat lampiran
              </a>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="mb-4 text-sm font-semibold text-slate-700">Riwayat Persetujuan</p>
            <ApprovalTimeline
              submittedAt={l.created_at}
              submittedBy={l.user?.name}
              logs={l.approval_logs ?? []}
              pendingLabel={leavePending(l.status)}
            />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (kind === 'overtime' && overtime.data) {
    const o = overtime.data
    return (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="space-y-4 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-semibold text-slate-800">{formatDate(o.overtime_date)}</p>
                <p className="text-sm text-muted-foreground">
                  {o.planned_start}–{o.planned_end}
                  {o.department && ` · ${o.department.name}`}
                </p>
              </div>
              <Badge variant={requestStatusVariant(o.status)}>{o.status_label}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Diajukan oleh" value={o.requester?.name ?? '-'} />
              <Field label="Bagian" value={o.department?.name ?? '-'} />
            </div>
            <Field label="Alasan" value={o.reason || '-'} />
            <div>
              <p className="mb-1 text-xs text-muted-foreground">Karyawan</p>
              <div className="divide-y rounded-md border">
                {o.employees?.map((emp) => (
                  <div key={emp.id} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                    <span>{emp.user?.name ?? `#${emp.user_id}`}</span>
                    {emp.session?.clock_out_at ? (
                      <span className="text-right text-xs text-muted-foreground">
                        {formatTime(emp.session.clock_in_at)}–{formatTime(emp.session.clock_out_at)}
                        {emp.session.total_hours != null && ` · ${emp.session.total_hours} jam`}
                      </span>
                    ) : emp.session?.clock_in_at ? (
                      <span className="text-xs text-muted-foreground">
                        Mulai {formatTime(emp.session.clock_in_at)}
                      </span>
                    ) : (
                      <Badge variant="muted">Belum mulai</Badge>
                    )}
                  </div>
                ))}
                {(!o.employees || o.employees.length === 0) && (
                  <p className="px-3 py-2 text-sm text-muted-foreground">Tidak ada karyawan.</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="mb-4 text-sm font-semibold text-slate-700">Riwayat Persetujuan</p>
            <ApprovalTimeline
              submittedAt={o.created_at}
              submittedBy={o.requester?.name}
              logs={o.approval_logs ?? []}
              pendingLabel={overtimePending(o.status)}
            />
          </CardContent>
        </Card>
      </div>
    )
  }

  return null
}
