import type { LeaveType } from '@/types/leave'

/** The three leave request types offered to employees. */
export const leaveTypeOptions: { value: LeaveType; label: string }[] = [
  { value: 'annual', label: 'Cuti Ganti Hari' },
  { value: 'unpaid', label: 'Cuti Potong Gaji' },
  { value: 'sick', label: 'Izin/Sakit' },
]

export interface LeaveTypeNote {
  text: string
  /** True when the note warns about salary being cut — render it as a warning. */
  warn: boolean
}

/**
 * Contextual note shown under the leave-type picker. "Izin/Sakit" depends on
 * whether the requester is outsourcing staff (they get salary cut).
 */
export function leaveTypeNote(type: LeaveType, isOutsourcing: boolean): LeaveTypeNote {
  switch (type) {
    case 'annual':
      return {
        text: 'Memotong kuota cuti tahunan. Tidak bisa diajukan bila sisa kuota tidak cukup.',
        warn: false,
      }
    case 'unpaid':
      return {
        text: 'Untuk cuti tanpa sisa kuota. Tidak memotong kuota — tercatat sebagai potong gaji.',
        warn: true,
      }
    case 'sick':
      return isOutsourcing
        ? { text: 'Status outsourcing: izin/sakit tercatat sebagai potong gaji.', warn: true }
        : { text: 'Tidak memotong gaji maupun kuota cuti.', warn: false }
  }
}
