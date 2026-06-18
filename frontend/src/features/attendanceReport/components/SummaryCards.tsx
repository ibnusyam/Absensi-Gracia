import { CalendarCheck, CalendarX, Clock, Plane } from 'lucide-react'
import type { AttendanceReportSummary } from '@/types/attendanceReport'

const cards = [
  { key: 'present', label: 'Hadir', icon: CalendarCheck, color: 'text-green-600', bg: 'bg-green-100' },
  { key: 'late', label: 'Telat', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-100' },
  { key: 'permit', label: 'Izin/Cuti', icon: Plane, color: 'text-sky-600', bg: 'bg-sky-100' },
  { key: 'absent', label: 'Tidak Hadir', icon: CalendarX, color: 'text-red-600', bg: 'bg-red-100' },
] as const

export function SummaryCards({ summary }: { summary: AttendanceReportSummary }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map(({ key, label, icon: Icon, color, bg }) => (
        <div key={key} className="flex items-center gap-3 rounded-xl bg-white p-4 shadow-sm">
          <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${bg}`}>
            <Icon className={`h-6 w-6 ${color}`} />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-800">{summary[key]}</p>
            <p className="text-sm text-slate-500">{label}</p>
          </div>
        </div>
      ))}
    </div>
  )
}
