import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/layout/PageHeader'
import { RequestDetailView, type RequestKind } from '@/features/requests/components/RequestDetailView'

export function RequestDetailPage({ kind }: { kind: RequestKind }) {
  const { id } = useParams()
  const navigate = useNavigate()
  const requestId = Number(id)
  const title = kind === 'leave' ? 'Detail Pengajuan Cuti' : 'Detail Pengajuan Lembur'

  return (
    <div>
      <PageHeader
        title={title}
        description="Rincian pengajuan dan riwayat persetujuannya."
        action={
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" /> Kembali
          </Button>
        }
      />
      {Number.isFinite(requestId) && requestId > 0 ? (
        <RequestDetailView kind={kind} id={requestId} />
      ) : (
        <p className="py-10 text-center text-sm text-muted-foreground">Pengajuan tidak ditemukan.</p>
      )}
    </div>
  )
}
