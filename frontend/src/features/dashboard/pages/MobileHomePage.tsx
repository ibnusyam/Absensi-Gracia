import { Link } from 'react-router-dom'
import { Bell, ChevronRight, FileCheck2, LogOut } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import { Badge } from '@/components/ui/badge'
import { useCurrentUser, useLogout } from '@/features/auth/hooks/useAuth'
import { useLeaveQuota } from '@/features/leave/hooks/useLeave'
import { useTodayAttendance, useAttendanceList } from '@/features/attendance/hooks/useAttendance'
import { visibleNavGroups } from '@/components/layout/navItems'
import { routePaths } from '@/routes/routePaths'
import { attendanceBadgeVariant } from '@/lib/statusBadge'
import { formatDate, formatTime } from '@/lib/utils'

function initials(name?: string) {
  if (!name) return '?'
  return name
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
}

export function MobileHomePage() {
  const user = useCurrentUser()
  const logout = useLogout()
  const quota = useLeaveQuota()
  const today = useTodayAttendance()
  const recent = useAttendanceList({ per_page: 5 })

  const roleSlug = user?.role?.slug
  // Drop the ungrouped Dashboard entry; keep titled segments only.
  const groups = visibleNavGroups(roleSlug).filter((g) => g.title)
  const selfServiceTiles = groups.find((g) => g.title === 'Mandiri')?.items ?? []
  const adminGroups = groups.filter((g) => g.title !== 'Mandiri')

  const t = today.data

  return (
    <div className="pb-8">
      {/* Blue header */}
      <div className="rounded-b-3xl bg-gradient-to-b from-sky-400 to-sky-500 px-4 pb-6 pt-6 text-white">
        <div className="flex items-center gap-3">
          {user?.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={user.name}
              className="h-14 w-14 rounded-full border-2 border-white/60 object-cover"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-white/60 bg-white/20 text-lg font-bold">
              {initials(user?.name)}
            </div>
          )}
          <div className="flex-1">
            <p className="text-lg font-bold uppercase leading-tight">{user?.name ?? '-'}</p>
            <p className="text-sm font-medium uppercase text-white/80">
              {user?.department?.name ?? user?.role?.name ?? '-'}
            </p>
          </div>
          <button type="button" className="relative rounded-lg bg-white/15 p-2" aria-label="Notifikasi">
            <Bell className="h-5 w-5" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
          </button>
          <button
            type="button"
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
            className="rounded-lg bg-white/15 p-2"
            aria-label="Keluar"
          >
            {logout.isPending ? <Spinner className="h-5 w-5" /> : <LogOut className="h-5 w-5" />}
          </button>
        </div>

        {/* Stat cards */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-white p-4 text-slate-800 shadow">
            <p className="text-2xl font-bold">
              {quota.data?.remaining_days ?? '-'} <span className="text-sm font-medium text-sky-500">hari</span>
            </p>
            <p className="text-sm text-slate-500">Sisa Cuti</p>
          </div>
          <div className="rounded-xl bg-white p-4 text-slate-800 shadow">
            <p className="flex items-center gap-2 text-2xl font-bold">
              0 <FileCheck2 className="h-5 w-5 text-sky-500" />
            </p>
            <p className="text-sm text-slate-500">Dokumen Ditinjau</p>
          </div>
        </div>

        {/* Self-service menu tiles */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          {selfServiceTiles.map(({ label, path, icon: Icon }) => (
            <Link
              key={path}
              to={path}
              className="flex flex-col items-start gap-2 rounded-xl bg-white/15 p-3 transition-colors hover:bg-white/25"
            >
              <Icon className="h-6 w-6" />
              <span className="text-sm font-medium">{label}</span>
            </Link>
          ))}
        </div>

        {/* Ongoing shift / clock summary */}
        <Link
          to={routePaths.attendance}
          className="mt-4 flex items-center justify-between rounded-xl bg-white/15 px-4 py-3 transition-colors hover:bg-white/25"
        >
          <div>
            <p className="text-xs text-white/80">Shift berjalan</p>
            <p className="font-semibold">OFF</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-white/80">Clock-In / Clock-Out</p>
            <p className="font-semibold">
              {formatTime(t?.clock_in_at)} / {formatTime(t?.clock_out_at)}
            </p>
          </div>
          <ChevronRight className="h-5 w-5" />
        </Link>
      </div>

      {/* Admin segment: monitoring & approval (only for those with access) */}
      {adminGroups.map((group) => (
        <div key={group.title} className="px-4 pt-6">
          <h2 className="mb-3 text-lg font-bold text-sky-600">{group.title}</h2>
          <div className="grid grid-cols-3 gap-3">
            {group.items.map(({ label, path, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                className="flex flex-col items-start gap-2 rounded-xl bg-white p-3 text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
              >
                <Icon className="h-6 w-6 text-sky-500" />
                <span className="text-sm font-medium">{label}</span>
              </Link>
            ))}
          </div>
        </div>
      ))}

      {/* Recent attendance */}
      <div className="px-4 pt-6">
        <h2 className="mb-3 text-lg font-bold text-sky-600">Absensi Terbaru</h2>
        {recent.isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner className="h-6 w-6 text-sky-500" />
          </div>
        ) : recent.data?.data.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">Belum ada data absensi.</p>
        ) : (
          <div className="space-y-3">
            {recent.data?.data.map((a) => (
              <div key={a.id} className="rounded-xl bg-white p-4 shadow-sm">
                <div className="mb-2 flex items-center justify-between">
                  <Badge variant={attendanceBadgeVariant(a.status)}>{a.status_label}</Badge>
                  <span className="text-sm text-slate-400">{formatDate(a.date)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <p className="text-slate-400">Clock-In</p>
                    <p className="font-semibold text-slate-700">{formatTime(a.clock_in_at)}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-slate-300" />
                  <div className="text-right">
                    <p className="text-slate-400">Clock-Out</p>
                    <p className="font-semibold text-slate-700">{formatTime(a.clock_out_at)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
