import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { PageLoader } from '@/components/ui/spinner'
import { useLeaveDetail } from '@/features/leave/hooks/useLeave'
import { useOvertimeDetail } from '@/features/overtime/hooks/useOvertime'
import { requestStatusVariant } from '@/lib/statusBadge'
import { formatDate, formatDateTime, formatTime } from '@/lib/utils'
import type { LeaveStatus } from '@/types/leave'
import type { OvertimeRequestEmployee, OvertimeStatus } from '@/types/overtime'
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

/** One labelled selfie thumbnail (clock-in or clock-out) for an overtime session. */
function PhotoThumb({ url, label, time }: { url: string | null; label: string; time: string | null }) {
  return (
    <div className="text-center">
      <p className="mb-1 text-[11px] text-muted-foreground">
        {label}
        {time ? ` · ${time}` : ''}
      </p>
      {url ? (
        <a href={url} target="_blank" rel="noreferrer">
          <img src={url} alt={label} className="h-20 w-20 rounded-md object-cover" />
        </a>
      ) : (
        <div className="flex h-20 w-20 items-center justify-center rounded-md border border-dashed text-[10px] text-slate-400">
          Tidak ada
        </div>
      )}
    </div>
  )
}

/**
 * Compensation breakdown for a completed overtime session: leave-day credit for
 * "ganti hari", or the money pay tiers (1.5×/2×/3×) for "ganti uang".
 */
function CompensationDetail({ emp }: { emp: OvertimeRequestEmployee }) {
  if (emp.compensation_type === 'leave') {
    return (
      <p className="text-xs">
        <span className="text-muted-foreground">Kompensasi: </span>
        <span className="font-medium text-emerald-700">
          Ganti hari · {emp.leave_days_credited} hari cuti
        </span>
      </p>
    )
  }
  if (emp.pay_tiers.length === 0) return null
  return (
    <div className="text-xs">
      <p className="text-muted-foreground">
        Kompensasi uang{emp.is_holiday ? ' · hari libur (2×/3×)' : ' · hari kerja (1.5×/2×)'}:
      </p>
      <ul className="mt-0.5 space-y-0.5">
        {emp.pay_tiers.map((t) => (
          <li key={t.multiplier} className="text-slate-700">
            {t.hours} jam × {t.multiplier}× ={' '}
            <span className="font-medium">{Math.round(t.hours * t.multiplier * 100) / 100} jam upah</span>
          </li>
        ))}
      </ul>
      {emp.weighted_hours != null && (
        <p className="mt-0.5 font-medium text-slate-800">Total setara {emp.weighted_hours} jam upah</p>
      )}
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
              <Field
                label="Status gaji"
                value={
                  l.cuts_salary ? (
                    <span className="text-amber-600">Potong gaji</span>
                  ) : (
                    'Tidak potong gaji'
                  )
                }
              />
            </div>
            <Field label="Alasan" value={l.reason || '-'} />
            {l.attachment_url && (
              <a
                href={l.attachment_url}
                target="_blank"
                rel="noreferrer"
                className="inline-block text-sm font-medium text-violet-700 hover:underline"
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
                <p className="text-sm text-muted-foreground">{o.department?.name ?? '-'}</p>
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
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span>{emp.user?.name ?? `#${emp.user_id}`}</span>
                        <Badge variant={emp.compensation_type === 'leave' ? 'success' : 'muted'}>
                          {emp.compensation_label}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        Rencana {formatDateTime(emp.planned_start_at)} – {formatDateTime(emp.planned_end_at)}
                      </span>
                      {emp.session &&
                        (emp.session.selfie_url || emp.session.selfie_out_url || emp.session.clock_out_at) && (
                          <div className="mt-2 space-y-2 rounded-md bg-slate-50 p-2">
                            {(emp.session.selfie_url || emp.session.selfie_out_url) && (
                              <div className="flex gap-3">
                                <PhotoThumb
                                  url={emp.session.selfie_url}
                                  label="Clock In"
                                  time={formatTime(emp.session.clock_in_at)}
                                />
                                <PhotoThumb
                                  url={emp.session.selfie_out_url}
                                  label="Clock Out"
                                  time={formatTime(emp.session.clock_out_at)}
                                />
                              </div>
                            )}
                            {emp.session.clock_out_at && <CompensationDetail emp={emp} />}
                          </div>
                        )}
                    </div>
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
