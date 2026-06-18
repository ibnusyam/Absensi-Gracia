import type { BadgeProps } from '@/components/ui/badge'

type Variant = NonNullable<BadgeProps['variant']>

export function attendanceBadgeVariant(status: string): Variant {
  switch (status) {
    case 'present':
      return 'success'
    case 'late':
      return 'warning'
    case 'absent':
      return 'destructive'
    case 'permit':
    case 'holiday':
      return 'muted'
    default:
      return 'default'
  }
}

export function requestStatusVariant(status: string): Variant {
  switch (status) {
    case 'approved':
    case 'approved_by_director':
      return 'success'
    case 'pending':
    case 'approved_by_hrd':
      return 'warning'
    case 'rejected':
    case 'cancelled':
      return 'destructive'
    default:
      return 'muted'
  }
}
