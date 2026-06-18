import { useEffect, useRef, useState } from 'react'
import { Building2, CalendarClock, MapPin, ScanFace } from 'lucide-react'
import { MobileHeader } from '@/components/mobile/MobileHeader'
import { LocationMap, type LatLng } from '@/components/mobile/LocationMap'
import { Spinner } from '@/components/ui/spinner'
import {
  useTodayAttendance,
  useClockIn,
  useClockOut,
} from '@/features/attendance/hooks/useAttendance'
import { useGeolocation } from '@/hooks/useGeolocation'
import { useWorkLocations } from '@/hooks/useWorkLocations'
import { toast } from '@/components/ui/toast'
import { formatTime } from '@/lib/utils'

function formatLongDate(d: Date) {
  return d.toLocaleDateString('id-ID', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function MobileAttendancePage() {
  const today = useTodayAttendance()
  const clockIn = useClockIn()
  const clockOut = useClockOut()
  const geo = useGeolocation()
  const locations = useWorkLocations()
  const fileRef = useRef<HTMLInputElement>(null)
  const pendingRef = useRef<'in' | 'out'>('in')
  const [position, setPosition] = useState<LatLng | null>(null)

  // Grab the current position once so the map can show the user pin.
  useEffect(() => {
    geo
      .request()
      .then((c) => setPosition({ lat: c.latitude, lng: c.longitude }))
      .catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const t = today.data
  const hasClockedIn = Boolean(t?.clock_in_at)
  const hasClockedOut = Boolean(t?.clock_out_at)
  const busy = clockIn.isPending || clockOut.isPending || geo.loading

  const loc = locations.data?.find((l) => l.is_active) ?? locations.data?.[0]
  const work = loc
    ? { lat: Number(loc.latitude), lng: Number(loc.longitude), radius: loc.radius_meters, name: loc.name }
    : null

  // Open the front camera; the captured photo is submitted as the selfie for
  // whichever action (clock-in / clock-out) triggered it.
  const triggerCamera = (action: 'in' | 'out') => {
    pendingRef.current = action
    fileRef.current?.click()
  }

  const onSelfieCaptured = async (file: File | null) => {
    try {
      const coords = await geo.request()
      setPosition({ lat: coords.latitude, lng: coords.longitude })
      if (pendingRef.current === 'in') {
        await clockIn.mutateAsync({ ...coords, selfie: file })
      } else {
        await clockOut.mutateAsync({ ...coords, selfie: file })
      }
    } catch {
      if (geo.error) toast.error(geo.error)
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="pb-24">
      <MobileHeader title="Absensi" />

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        capture="user"
        className="hidden"
        onChange={(e) => onSelfieCaptured(e.target.files?.[0] ?? null)}
      />

      <div className="space-y-3 p-4">
        {/* Date + shift */}
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <CalendarClock className="h-6 w-6 text-slate-700" />
            <p className="text-lg font-bold text-slate-800">{formatLongDate(new Date())}</p>
          </div>
          <p className="mt-2 text-slate-600">
            Shift: <span className="font-bold">OFF</span>
          </p>
        </div>

        {/* Clock in location */}
        <div className="rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <Building2 className="h-6 w-6 text-slate-700" />
            <div>
              <p className="text-slate-600">Lokasi Clock In</p>
              <p className="font-bold text-slate-800">{loc?.name ?? 'WFH / Anywhere'}</p>
            </div>
          </div>
        </div>

        {/* Map */}
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="flex items-center gap-2 bg-emerald-400 px-4 py-2 text-white">
            <MapPin className="h-4 w-4" />
            <span className="font-medium">Lokasi Saat Ini</span>
          </div>
          <LocationMap position={position} work={work} height={200} />
        </div>

        {/* Actual start / end */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border-2 border-emerald-500 bg-white p-4 text-center shadow-sm">
            <p className="font-semibold text-emerald-600">Mulai Aktual</p>
            <p className="mt-1 text-2xl font-bold tracking-wider text-slate-800">
              {hasClockedIn ? formatTime(t?.clock_in_at) : '--:--'}
            </p>
          </div>
          <div className="rounded-2xl border-2 border-red-500 bg-white p-4 text-center shadow-sm">
            <p className="font-semibold text-red-600">Selesai Aktual</p>
            <p className="mt-1 text-2xl font-bold tracking-wider text-slate-800">
              {hasClockedOut ? formatTime(t?.clock_out_at) : '--:--'}
            </p>
          </div>
        </div>

        {/* Selfies taken at clock-in / clock-out */}
        {(t?.selfie_url || t?.selfie_out_url) && (
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="mb-2 text-sm font-medium text-slate-600">Foto Selfie</p>
            <div className="flex gap-3">
              <div className="flex-1">
                <p className="mb-1 text-xs text-slate-500">Clock In</p>
                {t?.selfie_url ? (
                  <img src={t.selfie_url} alt="Selfie clock in" className="h-32 w-full rounded-xl object-cover" />
                ) : (
                  <div className="flex h-32 items-center justify-center rounded-xl border border-dashed text-xs text-slate-400">
                    Belum ada
                  </div>
                )}
              </div>
              <div className="flex-1">
                <p className="mb-1 text-xs text-slate-500">Clock Out</p>
                {t?.selfie_out_url ? (
                  <img src={t.selfie_out_url} alt="Selfie clock out" className="h-32 w-full rounded-xl object-cover" />
                ) : (
                  <div className="flex h-32 items-center justify-center rounded-xl border border-dashed text-xs text-slate-400">
                    Belum ada
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom action */}
      <div className="sticky bottom-0 border-t bg-white p-3">
        {!hasClockedIn && (
          <button
            type="button"
            disabled={busy}
            onClick={() => triggerCamera('in')}
            className="flex w-full items-center justify-center gap-3 rounded-xl bg-sky-500 py-4 text-lg font-semibold text-white disabled:opacity-60"
          >
            {busy ? <Spinner className="h-6 w-6" /> : <ScanFace className="h-6 w-6" />}
            Clock In
          </button>
        )}
        {hasClockedIn && !hasClockedOut && (
          <button
            type="button"
            disabled={busy}
            onClick={() => triggerCamera('out')}
            className="flex w-full items-center justify-center gap-3 rounded-xl bg-emerald-500 py-4 text-lg font-semibold text-white disabled:opacity-60"
          >
            {busy ? <Spinner className="h-6 w-6" /> : <ScanFace className="h-6 w-6" />}
            Clock Out
          </button>
        )}
        {hasClockedIn && hasClockedOut && (
          <p className="py-3 text-center text-sm text-slate-500">
            Absensi hari ini sudah lengkap. Sampai jumpa besok!
          </p>
        )}
      </div>
    </div>
  )
}
