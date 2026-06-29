import { MobileHeader } from '@/components/mobile/MobileHeader'
import { AttendanceRecapPage } from './AttendanceRecapPage'

/**
 * The attendance recap is a wide horizontally-scrollable grid; the desktop page
 * already degrades gracefully on small screens, so we reuse it directly under a
 * mobile header (gives the page a back button like the other mobile screens).
 */
export function MobileAttendanceRecapPage() {
  return (
    <>
      <MobileHeader title="Rekap Absensi" />
      <div className="p-3">
        <AttendanceRecapPage />
      </div>
    </>
  )
}
