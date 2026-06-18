import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/layout/PageHeader'
import { UserDetailView } from '@/features/users/components/UserDetailView'

export function UserDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const userId = Number(id)

  return (
    <div>
      <PageHeader
        title="Detail Karyawan"
        description="Biodata, riwayat cuti, dan lembur karyawan."
        action={
          <Button variant="outline" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" /> Kembali
          </Button>
        }
      />
      {Number.isFinite(userId) ? (
        <UserDetailView userId={userId} />
      ) : (
        <p className="py-10 text-center text-sm text-muted-foreground">Karyawan tidak ditemukan.</p>
      )}
    </div>
  )
}
