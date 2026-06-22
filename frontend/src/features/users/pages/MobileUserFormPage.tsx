import { useNavigate, useParams } from 'react-router-dom'
import { MobileHeader } from '@/components/mobile/MobileHeader'
import { Spinner } from '@/components/ui/spinner'
import { UserFormView } from '@/features/users/components/UserFormView'
import { useUserDetail } from '@/features/users/hooks/useUsers'
import { routePaths, userDetailPath } from '@/routes/routePaths'
import type { User } from '@/types/user'

/** Create / edit employee — full page (mobile). */
export function MobileUserFormPage({ mode }: { mode: 'create' | 'edit' }) {
  const navigate = useNavigate()
  const { id } = useParams()
  const userId = mode === 'edit' ? Number(id) : null
  const detail = useUserDetail(userId)

  const goBack = () => navigate(mode === 'edit' && userId ? userDetailPath(userId) : routePaths.users)
  const onSaved = (user: User) => navigate(userDetailPath(user.id))

  return (
    <div className="pb-8">
      <MobileHeader title={mode === 'create' ? 'Tambah Karyawan' : 'Edit Karyawan'} />
      <div className="p-4">
        {mode === 'edit' && detail.isLoading ? (
          <div className="flex justify-center py-10">
            <Spinner className="h-6 w-6 text-sky-500" />
          </div>
        ) : mode === 'edit' && (detail.isError || !detail.data) ? (
          <p className="py-10 text-center text-sm text-slate-400">Gagal memuat data karyawan.</p>
        ) : (
          <UserFormView
            mode={mode}
            user={detail.data?.user}
            onSaved={onSaved}
            onCancel={goBack}
          />
        )}
      </div>
    </div>
  )
}
