import { useParams } from 'react-router-dom'
import { MobileHeader } from '@/components/mobile/MobileHeader'
import { RequestDetailView, type RequestKind } from '@/features/requests/components/RequestDetailView'

export function MobileRequestDetailPage({ kind }: { kind: RequestKind }) {
  const { id } = useParams()
  const requestId = Number(id)
  const title = kind === 'leave' ? 'Detail Cuti' : 'Detail Lembur'

  return (
    <div className="pb-8">
      <MobileHeader title={title} />
      <div className="p-4">
        {Number.isFinite(requestId) && requestId > 0 ? (
          <RequestDetailView kind={kind} id={requestId} />
        ) : (
          <p className="py-10 text-center text-sm text-slate-400">Pengajuan tidak ditemukan.</p>
        )}
      </div>
    </div>
  )
}
