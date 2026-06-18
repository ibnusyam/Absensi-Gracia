import { NavLink } from 'react-router-dom'
import { CalendarClock } from 'lucide-react'
import { visibleNavGroups } from './navItems'
import { useAuthStore } from '@/features/auth/stores/authStore'
import { cn } from '@/lib/utils'

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const user = useAuthStore((s) => s.user)
  const slug = user?.role?.slug

  const groups = visibleNavGroups(slug)

  return (
    <aside className="flex h-full w-64 flex-col border-r border-border bg-card">
      <div className="flex h-16 items-center gap-2 border-b border-border px-6">
        <CalendarClock className="h-6 w-6 text-primary" />
        <span className="text-lg font-bold">Absensi SKY</span>
      </div>

      <nav className="flex-1 space-y-4 p-4">
        {groups.map((group, i) => (
          <div key={group.title ?? `group-${i}`} className="space-y-1">
            {group.title && (
              <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                {group.title}
              </p>
            )}
            {group.items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                  )
                }
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="border-t border-border p-4 text-xs text-muted-foreground">
        {user?.department?.name ?? 'Tanpa Departemen'}
      </div>
    </aside>
  )
}
