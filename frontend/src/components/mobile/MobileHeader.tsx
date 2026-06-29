import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

/** Blue top bar with a back button and centered title (mockup style). */
export function MobileHeader({ title, action }: { title: string; action?: ReactNode }) {
  const navigate = useNavigate()
  return (
    <header className="sticky top-0 z-20 flex items-center gap-2 bg-violet-700 px-3 py-4 text-white shadow-sm">
      <button
        type="button"
        onClick={() => navigate(-1)}
        aria-label="Kembali"
        className="rounded-full p-1 transition-colors hover:bg-white/20"
      >
        <ArrowLeft className="h-6 w-6" />
      </button>
      <h1 className="flex-1 text-center text-lg font-semibold">{title}</h1>
      <div className="flex w-8 justify-end">{action}</div>
    </header>
  )
}
