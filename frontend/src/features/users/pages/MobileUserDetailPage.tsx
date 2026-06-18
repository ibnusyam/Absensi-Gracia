import { useParams } from 'react-router-dom'
import { MobileHeader } from '@/components/mobile/MobileHeader'
import { UserDetailView } from '@/features/users/components/UserDetailView'

export function MobileUserDetailPage() {
  const { id } = useParams()
  const userId = Number(id)

  return (
    <div className="pb-8">
      <MobileHeader title="Detail Karyawan" />
      <div className="p-4">
        {Number.isFinite(userId) ? (
          <UserDetailView userId={userId} />
        ) : (
          <p className="py-10 text-center text-sm text-slate-400">Karyawan tidak ditemukan.</p>
        )}
      </div>
    </div>
  )
}
