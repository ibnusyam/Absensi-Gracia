import { LogOut, Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/features/auth/stores/authStore'
import { useLogout } from '@/features/auth/hooks/useAuth'

export function Header({ onMenu }: { onMenu?: () => void }) {
  const user = useAuthStore((s) => s.user)
  const logout = useLogout()

  return (
    <header className="flex h-16 items-center justify-between border-b border-border bg-card px-4 md:px-6">
      <button onClick={onMenu} className="md:hidden text-muted-foreground" aria-label="Menu">
        <Menu className="h-6 w-6" />
      </button>

      <div className="hidden md:block" />

      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-sm font-medium leading-tight">{user?.name}</p>
          <p className="text-xs text-muted-foreground">{user?.email}</p>
        </div>
        {user?.role && <Badge>{user.role.name}</Badge>}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
          aria-label="Logout"
        >
          <LogOut className="h-5 w-5" />
        </Button>
      </div>
    </header>
  )
}
