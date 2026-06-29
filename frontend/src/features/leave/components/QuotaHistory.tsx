import { ArrowDownRight, ArrowUpRight, History } from 'lucide-react'
import { Spinner } from '@/components/ui/spinner'
import { formatDateTime } from '@/lib/utils'
import { useLeaveQuotaLedger } from '@/features/leave/hooks/useLeave'

/** Returns a string like "+1" or "-0,5" for the day delta. */
function formatDelta(delta: number): string {
  const sign = delta > 0 ? '+' : ''
  return `${sign}${delta}`.replace('.', ',')
}

/**
 * Riwayat penambahan/pengurangan kuota cuti: kapan, berapa, dan karena apa.
 * Dipakai di halaman Cuti desktop & mobile.
 */
export function QuotaHistory() {
  const ledger = useLeaveQuotaLedger()
  const entries = ledger.data ?? []

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <History className="h-4 w-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-slate-700">Riwayat Kuota Cuti</h3>
      </div>

      {ledger.isLoading ? (
        <div className="flex justify-center py-6">
          <Spinner className="h-5 w-5 text-violet-700" />
        </div>
      ) : entries.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400">Belum ada perubahan kuota.</p>
      ) : (
        <ul className="space-y-2">
          {entries.map((e) => {
            const added = e.delta >= 0
            return (
              <li
                key={e.id}
                className="flex items-center gap-3 rounded-lg border border-slate-100 bg-white p-3"
              >
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                    added ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'
                  }`}
                >
                  {added ? (
                    <ArrowUpRight className="h-5 w-5" />
                  ) : (
                    <ArrowDownRight className="h-5 w-5" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-700">{e.reason}</p>
                  <p className="text-xs text-slate-400">{formatDateTime(e.created_at)}</p>
                </div>
                <div className="text-right">
                  <p
                    className={`text-sm font-bold ${added ? 'text-emerald-600' : 'text-red-600'}`}
                  >
                    {formatDelta(e.delta)} hari
                  </p>
                  <p className="text-xs text-slate-400">sisa {String(e.balance).replace('.', ',')}</p>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
