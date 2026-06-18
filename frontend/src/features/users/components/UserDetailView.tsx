import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { useUserDetail } from '@/features/users/hooks/useUsers'
import { requestStatusVariant } from '@/lib/statusBadge'
import { formatDate, formatTime, cn } from '@/lib/utils'
import type { UserDetail } from '@/api/masterData.api'

type Tab = 'bio' | 'leave' | 'overtime'

function initials(name?: string) {
  if (!name) return '?'
  return name
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3 border-b py-2.5 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-medium text-slate-800">{value ?? '-'}</span>
    </div>
  )
}

function BiodataTab({ detail }: { detail: UserDetail }) {
  const u = detail.user
  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        {u.avatar_url ? (
          <img src={u.avatar_url} alt={u.name} className="h-16 w-16 rounded-full object-cover" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-sky-100 text-lg font-bold text-sky-600">
            {initials(u.name)}
          </div>
        )}
        <div>
          <p className="text-lg font-bold text-slate-800">{u.name}</p>
          <p className="text-sm text-muted-foreground">{u.role?.name ?? '-'}</p>
        </div>
      </div>
      <Row label="NIK" value={u.employee_id ?? '-'} />
      <Row label="Email" value={u.email} />
      <Row label="Telepon" value={u.phone ?? '-'} />
      <Row label="Departemen" value={u.department?.name ?? '-'} />
      <Row
        label="Status"
        value={
          <Badge variant={u.is_active ? 'success' : 'destructive'}>
            {u.is_active ? 'Aktif' : 'Nonaktif'}
          </Badge>
        }
      />
      <Row label="Bergabung" value={u.joined_at ? formatDate(u.joined_at) : '-'} />
      <Row
        label="Sisa cuti tahun ini"
        value={
          detail.leave_quota
            ? `${detail.leave_quota.remaining_days} / ${detail.leave_quota.total_days} hari`
            : '-'
        }
      />
    </div>
  )
}

function LeaveTab({ detail }: { detail: UserDetail }) {
  if (detail.leave_requests.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-400">Belum ada pengajuan cuti.</p>
  }
  return (
    <div className="space-y-2">
      {detail.leave_requests.map((l) => (
        <div key={l.id} className="rounded-lg border p-3">
          <div className="mb-1 flex items-center justify-between">
            <span className="font-medium text-slate-800">{l.type_label}</span>
            <Badge variant={requestStatusVariant(l.status)}>{l.status_label}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {formatDate(l.start_date)} – {formatDate(l.end_date)} · {l.total_days} hari
          </p>
          {l.reason && <p className="mt-1 text-sm text-slate-600">{l.reason}</p>}
        </div>
      ))}
    </div>
  )
}

function OvertimeTab({ detail }: { detail: UserDetail }) {
  if (detail.overtime_requests.length === 0) {
    return <p className="py-8 text-center text-sm text-slate-400">Belum ada lembur.</p>
  }
  return (
    <div className="space-y-2">
      {detail.overtime_requests.map((o) => {
        const mine = o.employees?.find((e) => e.user_id === detail.user.id)
        const s = mine?.session
        return (
          <div key={o.id} className="rounded-lg border p-3">
            <div className="mb-1 flex items-center justify-between">
              <span className="font-medium text-slate-800">{formatDate(o.overtime_date)}</span>
              <Badge variant={requestStatusVariant(o.status)}>{o.status_label}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Rencana {o.planned_start}–{o.planned_end}
              {o.department && ` · ${o.department.name}`}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              {s?.clock_out_at
                ? `Aktual ${formatTime(s.clock_in_at)}–${formatTime(s.clock_out_at)}${
                    s.total_hours != null ? ` · ${s.total_hours} jam` : ''
                  }`
                : s?.clock_in_at
                  ? `Mulai ${formatTime(s.clock_in_at)} (berjalan)`
                  : 'Belum dijalankan'}
            </p>
          </div>
        )
      })}
    </div>
  )
}

/** Tabbed detail content (biodata + leave + overtime) for a single user. */
export function UserDetailView({ userId }: { userId: number }) {
  const [tab, setTab] = useState<Tab>('bio')
  const detail = useUserDetail(userId)

  const tabs: { key: Tab; label: string }[] = [
    { key: 'bio', label: 'Biodata' },
    { key: 'leave', label: 'Cuti' },
    { key: 'overtime', label: 'Lembur' },
  ]

  return (
    <div className="rounded-2xl bg-white shadow-sm">
      {/* Tabs */}
      <div className="flex gap-1 border-b px-4 pt-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={cn(
              'border-b-2 px-3 py-2 text-sm font-medium transition-colors',
              tab === t.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-slate-700',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="p-4">
        {detail.isLoading ? (
          <div className="flex justify-center py-10">
            <Spinner className="h-6 w-6 text-sky-500" />
          </div>
        ) : detail.isError || !detail.data ? (
          <p className="py-10 text-center text-sm text-slate-400">Gagal memuat detail karyawan.</p>
        ) : tab === 'bio' ? (
          <BiodataTab detail={detail.data} />
        ) : tab === 'leave' ? (
          <LeaveTab detail={detail.data} />
        ) : (
          <OvertimeTab detail={detail.data} />
        )}
      </div>
    </div>
  )
}
