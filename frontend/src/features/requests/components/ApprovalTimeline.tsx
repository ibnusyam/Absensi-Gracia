import { Check, Clock, FileText, X } from 'lucide-react'
import { cn, formatDateTime } from '@/lib/utils'
import type { ApprovalLog } from '@/types/approval'

interface ApprovalTimelineProps {
  /** When the request was submitted (created_at). */
  submittedAt: string
  /** Who submitted it (employee or requester name). */
  submittedBy?: string | null
  /** Approval/rejection steps, oldest first. */
  logs: ApprovalLog[]
  /** Label for the still-pending next step, or null when the request is finished. */
  pendingLabel?: string | null
}

type Tone = 'sky' | 'green' | 'red' | 'muted'

const TONE: Record<Tone, { ring: string; icon: string }> = {
  sky: { ring: 'border-sky-500 bg-sky-50 text-sky-600', icon: 'text-sky-600' },
  green: { ring: 'border-emerald-500 bg-emerald-50 text-emerald-600', icon: 'text-emerald-600' },
  red: { ring: 'border-red-500 bg-red-50 text-red-600', icon: 'text-red-600' },
  muted: { ring: 'border-slate-300 bg-slate-50 text-slate-400', icon: 'text-slate-400' },
}

function Node({
  tone,
  icon,
  title,
  meta,
  notes,
  isLast,
}: {
  tone: Tone
  icon: React.ReactNode
  title: string
  meta?: string | null
  notes?: string | null
  isLast: boolean
}) {
  return (
    <li className="relative flex gap-3 pb-5 last:pb-0">
      {/* Connector line */}
      {!isLast && <span className="absolute left-[15px] top-8 h-[calc(100%-1.5rem)] w-px bg-slate-200" />}
      <span
        className={cn(
          'relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2',
          TONE[tone].ring,
        )}
      >
        {icon}
      </span>
      <div className="pt-0.5">
        <p className="text-sm font-medium text-slate-800">{title}</p>
        {meta && <p className="text-xs text-muted-foreground">{meta}</p>}
        {notes && (
          <p className="mt-1 rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600">“{notes}”</p>
        )}
      </div>
    </li>
  )
}

/**
 * Vertical timeline of a request's lifecycle: submitted, then each approval/
 * rejection step (who, when, notes), and finally the pending next step if any.
 */
export function ApprovalTimeline({ submittedAt, submittedBy, logs, pendingLabel }: ApprovalTimelineProps) {
  const hasPending = Boolean(pendingLabel)
  const lastIndex = logs.length + (hasPending ? 1 : 0)

  return (
    <ol className="m-0 list-none p-0">
      <Node
        tone="sky"
        icon={<FileText className="h-4 w-4" />}
        title="Diajukan"
        meta={[submittedBy ? `oleh ${submittedBy}` : null, formatDateTime(submittedAt)]
          .filter(Boolean)
          .join(' · ')}
        isLast={lastIndex === 0}
      />

      {logs.map((log, i) => {
        const approved = log.action === 'approved'
        return (
          <Node
            key={log.id}
            tone={approved ? 'green' : 'red'}
            icon={approved ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
            title={`${log.stage_label ?? 'Persetujuan'} — ${log.action_label}`}
            meta={[log.approver?.name ? `oleh ${log.approver.name}` : null, formatDateTime(log.acted_at)]
              .filter(Boolean)
              .join(' · ')}
            notes={log.notes}
            isLast={i + 1 === lastIndex}
          />
        )
      })}

      {hasPending && (
        <Node
          tone="muted"
          icon={<Clock className="h-4 w-4" />}
          title={pendingLabel as string}
          isLast
        />
      )}
    </ol>
  )
}
