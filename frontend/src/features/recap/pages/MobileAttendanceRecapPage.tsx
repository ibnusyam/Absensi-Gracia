import { AttendanceRecapPage } from './AttendanceRecapPage'

/**
 * The attendance recap is a wide horizontally-scrollable grid; the desktop page
 * already degrades gracefully on small screens, so we reuse it directly.
 */
export function MobileAttendanceRecapPage() {
  return <AttendanceRecapPage />
}
