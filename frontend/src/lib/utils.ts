import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Format an ISO datetime (already in display TZ from the API) for the UI. */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '-'
  const d = new Date(value)
  return d.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export function formatTime(value: string | null | undefined): string {
  if (!value) return '-'
  return new Date(value).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '-'
  // Date-only strings (Y-m-d) are parsed as UTC midnight; render in id-ID.
  const d = new Date(value.length <= 10 ? `${value}T00:00:00` : value)
  return d.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function formatCurrency(value: number | null | undefined): string {
  if (value == null) return '-'
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value)
}

/** Current month as a "YYYY-MM" string, suitable for <input type="month">. */
export function currentMonthValue(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

/**
 * Resolve a "YYYY-MM" value into its numeric parts and first/last calendar days.
 * Falls back to the current month when the value is empty/invalid.
 */
export function monthBounds(value: string): {
  month: number
  year: number
  from: string
  to: string
} {
  const [y, m] = (value || currentMonthValue()).split('-').map(Number)
  const year = y || new Date().getFullYear()
  const month = m || new Date().getMonth() + 1
  const lastDay = new Date(year, month, 0).getDate()
  const pad = (n: number) => String(n).padStart(2, '0')
  return {
    month,
    year,
    from: `${year}-${pad(month)}-01`,
    to: `${year}-${pad(month)}-${pad(lastDay)}`,
  }
}

/** Human-readable month label, e.g. "Juni 2026", from a "YYYY-MM" value. */
export function formatMonthLabel(value: string): string {
  const { month, year } = monthBounds(value)
  return new Date(year, month - 1, 1).toLocaleDateString('id-ID', {
    month: 'long',
    year: 'numeric',
  })
}

/**
 * Actual worked duration between clock-in and clock-out (no break deduction).
 * Returns e.g. "8j 30m", or "-" when not yet clocked out.
 */
export function formatWorkDuration(
  start: string | null | undefined,
  end: string | null | undefined,
): string {
  if (!start || !end) return '-'
  const ms = new Date(end).getTime() - new Date(start).getTime()
  if (!Number.isFinite(ms) || ms <= 0) return '-'
  const totalMinutes = Math.round(ms / 60000)
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  return m === 0 ? `${h}j` : `${h}j ${m}m`
}
