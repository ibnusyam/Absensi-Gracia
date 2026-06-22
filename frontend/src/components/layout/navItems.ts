import {
  LayoutDashboard,
  CalendarCheck,
  ClipboardList,
  Plane,
  Clock,
  CheckSquare,
  Inbox,
  BarChart3,
  CalendarRange,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { routePaths } from '@/routes/routePaths'
import type { RoleSlug } from '@/types/user'

export interface NavItem {
  label: string
  path: string
  icon: LucideIcon
  roles?: RoleSlug[] // undefined => all authenticated users
}

export interface NavGroup {
  /** Section heading. Undefined => ungrouped (e.g. Dashboard), rendered without a header. */
  title?: string
  items: NavItem[]
}

const ADMIN_ROLES: RoleSlug[] = ['super-admin', 'hrd', 'direktur', 'admin-bagian']

/**
 * Menu is split into two clear segments:
 *  - "Mandiri": self-service every user has (own attendance, leave, overtime).
 *  - "Monitoring & Approval": admin/approver tooling for overseeing other people.
 */
export const navGroups: NavGroup[] = [
  {
    items: [{ label: 'Dashboard', path: routePaths.dashboard, icon: LayoutDashboard }],
  },
  {
    title: 'Mandiri',
    items: [
      { label: 'Absensi', path: routePaths.attendance, icon: CalendarCheck },
      { label: 'Cuti', path: routePaths.leave, icon: Plane },
      { label: 'Lembur', path: routePaths.overtime, icon: Clock },
    ],
  },
  {
    title: 'Monitoring & Approval',
    items: [
      {
        label: 'Laporan Absensi',
        path: routePaths.attendanceReport,
        icon: ClipboardList,
        roles: ADMIN_ROLES,
      },
      {
        label: 'Pengajuan Karyawan',
        path: routePaths.requests,
        icon: Inbox,
        roles: ['super-admin', 'hrd', 'direktur'],
      },
      {
        label: 'Rekap Absensi',
        path: routePaths.attendanceRecap,
        icon: CalendarRange,
        roles: ['super-admin', 'hrd', 'direktur'],
      },
      {
        label: 'Rekap Cuti & Lembur',
        path: routePaths.recap,
        icon: BarChart3,
        roles: ['super-admin', 'hrd', 'direktur'],
      },
      {
        label: 'Approval',
        path: routePaths.approvals,
        icon: CheckSquare,
        roles: ['hrd', 'direktur'],
      },
      {
        label: 'Karyawan',
        path: routePaths.users,
        icon: Users,
        roles: ADMIN_ROLES,
      },
    ],
  },
]

/** Flattened list of every nav item, kept for consumers that don't need grouping. */
export const navItems: NavItem[] = navGroups.flatMap((g) => g.items)

/** Groups with items filtered by the user's role; empty groups are dropped. */
export function visibleNavGroups(slug?: RoleSlug): NavGroup[] {
  return navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => !item.roles || (slug && item.roles.includes(slug))),
    }))
    .filter((group) => group.items.length > 0)
}
