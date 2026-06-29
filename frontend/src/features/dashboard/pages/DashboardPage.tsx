import { Link } from 'react-router-dom'
import { CalendarCheck, Clock, Plane } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { PageLoader } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'
import { useTodayAttendance, useAttendanceSummary } from '@/features/attendance/hooks/useAttendance'
import { useLeaveQuota } from '@/features/leave/hooks/useLeave'
import { useCurrentUser } from '@/features/auth/hooks/useAuth'
import { attendanceBadgeVariant } from '@/lib/statusBadge'
import { formatTime } from '@/lib/utils'
import { routePaths } from '@/routes/routePaths'

function StatCard({
  title,
  value,
  icon: Icon,
  hint,
}: {
  title: string
  value: string | number
  icon: typeof Clock
  hint?: string
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  )
}

export function DashboardPage() {
  const user = useCurrentUser()
  const today = useTodayAttendance()
  const summary = useAttendanceSummary()
  const quota = useLeaveQuota()

  if (today.isLoading || summary.isLoading) return <PageLoader />

  const t = today.data

  return (
    <div>
      <PageHeader
        title={`Halo, ${user?.name?.split(' ')[0] ?? 'Pengguna'} 👋`}
        description="Ringkasan aktivitas Anda hari ini."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Hadir bulan ini"
          value={summary.data?.present ?? 0}
          icon={CalendarCheck}
        />
        <StatCard
          title="Sisa cuti"
          value={quota.data?.remaining_days ?? '-'}
          icon={Plane}
          hint={`dari ${quota.data?.total_days ?? 0} hari`}
        />
        <StatCard title="Alpha bulan ini" value={summary.data?.absent ?? 0} icon={Clock} />
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Absensi Hari Ini</CardTitle>
        </CardHeader>
        <CardContent>
          {t ? (
            <div className="flex flex-wrap items-center gap-6">
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge variant={attendanceBadgeVariant(t.status)}>{t.status_label}</Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Clock In</p>
                <p className="font-medium">{formatTime(t.clock_in_at)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Clock Out</p>
                <p className="font-medium">{formatTime(t.clock_out_at)}</p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-start gap-3">
              <p className="text-sm text-muted-foreground">
                Anda belum melakukan absensi hari ini.
              </p>
              <Link to={routePaths.attendance} className={cn(buttonVariants())}>
                Absen Sekarang
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
