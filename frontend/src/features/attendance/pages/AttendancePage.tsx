import { useRef, useState } from 'react'
import { LogIn, LogOut, MapPin } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Spinner, PageLoader } from '@/components/ui/spinner'
import {
  useTodayAttendance,
  useClockIn,
  useClockOut,
  useAttendanceList,
} from '@/features/attendance/hooks/useAttendance'
import { useGeolocation } from '@/hooks/useGeolocation'
import { toast } from '@/components/ui/toast'
import { attendanceBadgeVariant } from '@/lib/statusBadge'
import { formatDate, formatTime } from '@/lib/utils'

export function AttendancePage() {
  const today = useTodayAttendance()
  const list = useAttendanceList({ per_page: 15 })
  const clockIn = useClockIn()
  const clockOut = useClockOut()
  const geo = useGeolocation()
  const fileRef = useRef<HTMLInputElement>(null)
  const [selfie, setSelfie] = useState<File | null>(null)

  const t = today.data
  const hasClockedIn = Boolean(t?.clock_in_at)
  const hasClockedOut = Boolean(t?.clock_out_at)
  const busy = clockIn.isPending || clockOut.isPending || geo.loading

  const handleClockIn = async () => {
    try {
      const coords = await geo.request()
      await clockIn.mutateAsync({ ...coords, selfie })
      setSelfie(null)
      if (fileRef.current) fileRef.current.value = ''
    } catch (e) {
      if (e instanceof Error && geo.error) toast.error(geo.error)
    }
  }

  const handleClockOut = async () => {
    try {
      const coords = await geo.request()
      await clockOut.mutateAsync({ ...coords, selfie })
      setSelfie(null)
      if (fileRef.current) fileRef.current.value = ''
    } catch (e) {
      if (e instanceof Error && geo.error) toast.error(geo.error)
    }
  }

  return (
    <div>
      <PageHeader title="Absensi" description="Lakukan clock-in dan clock-out harian Anda." />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" /> Absen Hari Ini
          </CardTitle>
        </CardHeader>
        <CardContent>
          {today.isLoading ? (
            <PageLoader />
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-6">
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  {t ? (
                    <Badge variant={attendanceBadgeVariant(t.status)}>{t.status_label}</Badge>
                  ) : (
                    <Badge variant="muted">Belum absen</Badge>
                  )}
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Clock In</p>
                  <p className="font-medium">{formatTime(t?.clock_in_at)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Clock Out</p>
                  <p className="font-medium">{formatTime(t?.clock_out_at)}</p>
                </div>
              </div>

              {(t?.selfie_url || t?.selfie_out_url) && (
                <div className="flex flex-wrap gap-4">
                  {t?.selfie_url && (
                    <figure className="space-y-1">
                      <img
                        src={t.selfie_url}
                        alt="Selfie clock in"
                        className="h-24 w-24 rounded-lg border object-cover"
                      />
                      <figcaption className="text-center text-xs text-muted-foreground">Clock In</figcaption>
                    </figure>
                  )}
                  {t?.selfie_out_url && (
                    <figure className="space-y-1">
                      <img
                        src={t.selfie_out_url}
                        alt="Selfie clock out"
                        className="h-24 w-24 rounded-lg border object-cover"
                      />
                      <figcaption className="text-center text-xs text-muted-foreground">Clock Out</figcaption>
                    </figure>
                  )}
                </div>
              )}

              {!hasClockedOut && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">
                    Selfie {hasClockedIn ? 'clock out' : 'clock in'} (opsional)
                  </label>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    capture="user"
                    onChange={(e) => setSelfie(e.target.files?.[0] ?? null)}
                    className="block w-full text-sm text-muted-foreground file:mr-4 file:rounded-md file:border-0 file:bg-primary/10 file:px-4 file:py-2 file:text-sm file:font-medium file:text-primary"
                  />
                </div>
              )}

              <div className="flex gap-3">
                {!hasClockedIn && (
                  <Button onClick={handleClockIn} disabled={busy}>
                    {busy ? <Spinner className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
                    Clock In
                  </Button>
                )}
                {hasClockedIn && !hasClockedOut && (
                  <Button variant="success" onClick={handleClockOut} disabled={busy}>
                    {busy ? <Spinner className="h-4 w-4" /> : <LogOut className="h-4 w-4" />}
                    Clock Out
                  </Button>
                )}
                {hasClockedIn && hasClockedOut && (
                  <p className="text-sm text-muted-foreground">
                    Absensi hari ini sudah lengkap. Sampai jumpa besok!
                  </p>
                )}
              </div>

              {geo.error && <p className="text-xs text-destructive">{geo.error}</p>}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Riwayat Absensi</CardTitle>
        </CardHeader>
        <CardContent>
          {list.isLoading ? (
            <PageLoader />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">Tanggal</th>
                    <th className="py-2 pr-4 font-medium">Masuk</th>
                    <th className="py-2 pr-4 font-medium">Keluar</th>
                    <th className="py-2 pr-4 font-medium">Telat</th>
                    <th className="py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {list.data?.data.map((a) => (
                    <tr key={a.id} className="border-b last:border-0">
                      <td className="py-2 pr-4">{formatDate(a.date)}</td>
                      <td className="py-2 pr-4">{formatTime(a.clock_in_at)}</td>
                      <td className="py-2 pr-4">{formatTime(a.clock_out_at)}</td>
                      <td className="py-2 pr-4">{a.late_minutes ? `${a.late_minutes} mnt` : '-'}</td>
                      <td className="py-2">
                        <Badge variant={attendanceBadgeVariant(a.status)}>{a.status_label}</Badge>
                      </td>
                    </tr>
                  ))}
                  {list.data?.data.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-muted-foreground">
                        Belum ada data absensi.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
