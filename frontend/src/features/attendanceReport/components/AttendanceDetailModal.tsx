import { X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { attendanceBadgeVariant } from '@/lib/statusBadge'
import { formatDate, formatTime, formatWorkDuration } from '@/lib/utils'
import type { AttendanceReportRow } from '@/types/attendanceReport'

function Photo({ label, url, time }: { label: string; url: string | null; time: string }) {
  return (
    <div className="flex-1">
      <p className="mb-1 text-xs font-medium text-slate-500">
        {label} · {time}
      </p>
      {url ? (
        <img src={url} alt={label} className="h-40 w-full rounded-lg border object-cover" />
      ) : (
        <div className="flex h-40 w-full items-center justify-center rounded-lg border border-dashed text-xs text-slate-400">
          Tidak ada foto
        </div>
      )}
    </div>
  )
}

export function AttendanceDetailModal({
  row,
  onClose,
}: {
  row: AttendanceReportRow
  onClose: () => void
}) {
  const a = row.attendance

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-start justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-slate-800">{row.user.name}</h2>
            <p className="text-sm text-slate-500">
              {row.user.department?.name ?? '-'}
              {row.user.employee_id && ` · ${row.user.employee_id}`}
            </p>
          </div>
          <button onClick={onClose} aria-label="Tutup" className="rounded-full p-1 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4 flex items-center gap-3">
          <Badge variant={attendanceBadgeVariant(row.status)}>{row.status_label}</Badge>
          {a && <span className="text-sm text-slate-500">{formatDate(a.date)}</span>}
        </div>

        {a ? (
          <>
            <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-slate-500">Clock In</p>
                <p className="font-semibold text-slate-800">{formatTime(a.clock_in_at)}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-slate-500">Clock Out</p>
                <p className="font-semibold text-slate-800">{formatTime(a.clock_out_at)}</p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-slate-500">Jam Kerja (aktual)</p>
                <p className="font-semibold text-slate-800">
                  {formatWorkDuration(a.clock_in_at, a.clock_out_at)}
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <p className="text-slate-500">Lokasi</p>
                <p className="font-semibold text-slate-800">{a.location?.name ?? '-'}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <Photo label="Selfie Masuk" url={a.selfie_url} time={formatTime(a.clock_in_at)} />
              <Photo label="Selfie Keluar" url={a.selfie_out_url} time={formatTime(a.clock_out_at)} />
            </div>

            {a.note && <p className="mt-3 text-sm text-slate-500">Catatan: {a.note}</p>}
          </>
        ) : (
          <p className="py-8 text-center text-sm text-slate-400">
            Tidak ada data absensi untuk tanggal ini.
          </p>
        )}
      </div>
    </div>
  )
}
