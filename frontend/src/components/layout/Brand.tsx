import { cn } from '@/lib/utils'

/**
 * App wordmark: Gracia Pharmindo logo + "Absensi Gracia" label.
 * Temporary placeholder mark — swap /logo-gracia.svg when the official
 * PT Gracia Pharmindo artwork is available.
 */
export function Brand({
  className,
  iconClassName,
  showText = true,
}: {
  className?: string
  iconClassName?: string
  showText?: boolean
}) {
  return (
    <span className={cn('flex items-center gap-2', className)}>
      <img
        src="/logo-gracia.svg"
        alt="Gracia Pharmindo"
        className={cn('h-8 w-8 shrink-0', iconClassName)}
      />
      {showText && <span className="text-lg font-bold">Absensi Gracia</span>}
    </span>
  )
}
