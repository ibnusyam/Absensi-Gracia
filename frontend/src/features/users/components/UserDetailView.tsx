import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Pencil } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { useUserDetail, useOffPeriodActions, useUserActions } from '@/features/users/hooks/useUsers'
import { useHasRole } from '@/features/auth/hooks/useAuth'
import { userEditPath } from '@/routes/routePaths'
import { requestStatusVariant } from '@/lib/statusBadge'
import { formatDate, formatDateTime, formatTime, cn } from '@/lib/utils'
import type { UserDetail } from '@/api/masterData.api'

type Tab = 'bio' | 'leave' | 'overtime' | 'off'

/** Local "YYYY-MM-DD" for today. */
function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

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

/** Renders a Row only when the value is present (keeps the detail tidy). */
function OptRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === '') return null
  return <Row label={label} value={value} />
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1 mt-5 text-xs font-semibold uppercase tracking-wide text-slate-400">
      {children}
    </p>
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
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-violet-100 text-lg font-bold text-violet-700">
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
          <span className="flex items-center justify-end gap-1.5">
            {detail.is_currently_off && <Badge variant="default">Sedang Off</Badge>}
            <Badge variant={u.is_active ? 'success' : 'destructive'}>
              {u.is_active ? 'Aktif' : 'Nonaktif'}
            </Badge>
          </span>
        }
      />
      <Row label="Bergabung" value={u.joined_at ? formatDate(u.joined_at) : '-'} />
      <Row label="Status Karir" value={u.jenjang_label ?? '-'} />
      <Row
        label="Sisa cuti tahun ini"
        value={
          detail.leave_quota
            ? `${detail.leave_quota.remaining_days} / ${detail.leave_quota.total_days} hari`
            : '-'
        }
      />

      {(u.no_ktp || u.tempat_lahir || u.tanggal_lahir || u.jenis_kelamin || u.status_pernikahan ||
        u.agama || u.pendidikan || u.jurusan || u.alamat || u.telepon_rumah ||
        u.jumlah_tanggungan != null) && (
        <>
          <SectionTitle>Data Pribadi</SectionTitle>
          <OptRow label="No. KTP" value={u.no_ktp} />
          <OptRow label="Tempat lahir" value={u.tempat_lahir} />
          <OptRow label="Tanggal lahir" value={u.tanggal_lahir ? formatDate(u.tanggal_lahir) : null} />
          <OptRow
            label="Jenis kelamin"
            value={u.jenis_kelamin === 'L' ? 'Laki-laki' : u.jenis_kelamin === 'P' ? 'Perempuan' : u.jenis_kelamin}
          />
          <OptRow label="Status pernikahan" value={u.status_pernikahan} />
          <OptRow label="Jumlah tanggungan" value={u.jumlah_tanggungan} />
          <OptRow label="Agama" value={u.agama} />
          <OptRow label="Pendidikan" value={u.pendidikan} />
          <OptRow label="Jurusan" value={u.jurusan} />
          <OptRow label="Alamat" value={u.alamat} />
          <OptRow label="Telepon rumah" value={u.telepon_rumah} />
        </>
      )}

      {(u.nama_jabatan || u.kode_jabatan || u.tanggal_spk || u.kartu_pensiun ||
        u.keterangan_data) && (
        <>
          <SectionTitle>Kepegawaian</SectionTitle>
          <OptRow label="Jabatan" value={u.nama_jabatan} />
          <OptRow label="Kode jabatan" value={u.kode_jabatan} />
          <OptRow label="Tanggal SPK" value={u.tanggal_spk ? formatDate(u.tanggal_spk) : null} />
          <OptRow label="Kartu pensiun" value={u.kartu_pensiun ? formatDate(u.kartu_pensiun) : null} />
          <OptRow label="Keterangan" value={u.keterangan_data} />
        </>
      )}

      {(u.status_pajak || u.no_npwp || u.no_jamsostek || u.rekening_bca || u.rekening_bni) && (
        <>
          <SectionTitle>Pajak &amp; Bank</SectionTitle>
          <OptRow label="Status pajak" value={u.status_pajak} />
          <OptRow label="No. NPWP" value={u.no_npwp} />
          <OptRow label="No. Jamsostek / BPJS" value={u.no_jamsostek} />
          <OptRow label="Rekening BCA" value={u.rekening_bca} />
          <OptRow label="Rekening BNI" value={u.rekening_bni} />
        </>
      )}

      {(u.jatah_cuti != null || u.sisa_cuti != null || u.tahun_cuti != null) && (
        <>
          <SectionTitle>Cuti (data lama)</SectionTitle>
          <OptRow label="Jatah cuti" value={u.jatah_cuti} />
          <OptRow label="Sisa cuti" value={u.sisa_cuti} />
          <OptRow label="Tahun cuti" value={u.tahun_cuti} />
        </>
      )}
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
              {mine?.planned_start_at
                ? `Rencana ${formatDateTime(mine.planned_start_at)} – ${formatDateTime(mine.planned_end_at)}`
                : 'Rencana belum diatur'}
              {mine && ` · ${mine.compensation_label}`}
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

/** Manage an employee's "off" (dirumahkan / dinonaktifkan sementara) periods. */
function OffTab({ detail, userId }: { detail: UserDetail; userId: number }) {
  const canManage = useHasRole('hrd', 'super-admin', 'direktur')
  const { setOff, endOff, removeOff } = useOffPeriodActions(userId)
  const [start, setStart] = useState(todayStr)
  const [end, setEnd] = useState('')
  const [reason, setReason] = useState('')

  const today = todayStr()
  const isActive = (o: UserDetail['off_periods'][number]) =>
    o.start_date <= today && (!o.end_date || o.end_date >= today)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setOff.mutate(
      { start_date: start, end_date: end || null, reason: reason || null },
      { onSuccess: () => { setEnd(''); setReason('') } },
    )
  }

  return (
    <div className="space-y-4">
      {canManage && (
        <form onSubmit={submit} className="space-y-3 rounded-lg border p-3">
          <p className="text-sm font-medium text-slate-700">Tandai karyawan off</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="off-start">Mulai</Label>
              <Input id="off-start" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="off-end">Selesai (opsional)</Label>
              <Input
                id="off-end"
                type="date"
                value={end}
                min={start}
                onChange={(e) => setEnd(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="off-reason">Alasan (opsional)</Label>
            <Input
              id="off-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="mis. dirumahkan sementara"
            />
          </div>
          <Button type="submit" disabled={setOff.isPending}>
            Off-kan
          </Button>
          <p className="text-xs text-muted-foreground">
            Kosongkan "Selesai" untuk off tanpa batas waktu (sampai diaktifkan kembali).
          </p>
        </form>
      )}

      {detail.off_periods.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-400">Karyawan belum pernah di-off-kan.</p>
      ) : (
        <div className="space-y-2">
          {detail.off_periods.map((o) => {
            const active = isActive(o)
            return (
              <div key={o.id} className="rounded-lg border p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-slate-800">
                    {formatDate(o.start_date)} – {o.end_date ? formatDate(o.end_date) : 'tanpa batas'}
                  </span>
                  {active && <Badge variant="default">Sedang Off</Badge>}
                </div>
                {o.reason && <p className="mt-1 text-sm text-slate-600">{o.reason}</p>}
                {o.created_by_name && (
                  <p className="mt-0.5 text-xs text-muted-foreground">Ditetapkan oleh {o.created_by_name}</p>
                )}
                {canManage && (
                  <div className="mt-2 flex gap-2">
                    {active && !o.end_date && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={endOff.isPending}
                        onClick={() => endOff.mutate({ id: o.id, end_date: today })}
                      >
                        Aktifkan kembali
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-600 hover:text-red-700"
                      disabled={removeOff.isPending}
                      onClick={() => removeOff.mutate(o.id)}
                    >
                      Hapus
                    </Button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/** Tabbed detail content (biodata + leave + overtime + off) for a single user. */
export function UserDetailView({ userId }: { userId: number }) {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('bio')
  const detail = useUserDetail(userId)
  const canManage = useHasRole('super-admin', 'hrd')
  const { update, deactivate } = useUserActions()
  const u = detail.data?.user

  const tabs: { key: Tab; label: string }[] = [
    { key: 'bio', label: 'Biodata' },
    { key: 'leave', label: 'Cuti' },
    { key: 'overtime', label: 'Lembur' },
    { key: 'off', label: 'Off / Nonaktif' },
  ]

  return (
    <div className="rounded-2xl bg-white shadow-sm">
      {canManage && u && (
        <div className="flex justify-end gap-2 border-b px-4 py-2">
          <Button variant="outline" size="sm" onClick={() => navigate(userEditPath(u.id))}>
            <Pencil className="h-3.5 w-3.5" /> Edit
          </Button>
          {u.is_active ? (
            <Button
              variant="outline"
              size="sm"
              className="text-red-600 hover:text-red-700"
              disabled={deactivate.isPending}
              onClick={() => {
                if (window.confirm(`Nonaktifkan ${u.name}? Riwayatnya tetap tersimpan.`)) {
                  deactivate.mutate(u.id)
                }
              }}
            >
              Nonaktifkan
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              disabled={update.isPending}
              onClick={() => update.mutate({ id: u.id, payload: { is_active: true } })}
            >
              Aktifkan kembali
            </Button>
          )}
        </div>
      )}

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
            <Spinner className="h-6 w-6 text-violet-700" />
          </div>
        ) : detail.isError || !detail.data ? (
          <p className="py-10 text-center text-sm text-slate-400">Gagal memuat detail karyawan.</p>
        ) : tab === 'bio' ? (
          <BiodataTab detail={detail.data} />
        ) : tab === 'leave' ? (
          <LeaveTab detail={detail.data} />
        ) : tab === 'overtime' ? (
          <OvertimeTab detail={detail.data} />
        ) : (
          <OffTab detail={detail.data} userId={userId} />
        )}
      </div>
    </div>
  )
}
