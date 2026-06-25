import { useState, type FormEvent } from 'react'
import { Plane, Plus, Trash2, X } from 'lucide-react'
import { MobileHeader } from '@/components/mobile/MobileHeader'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Spinner } from '@/components/ui/spinner'
import {
  useLeaveList,
  useLeaveQuota,
  useCreateLeave,
  useCancelLeave,
} from '@/features/leave/hooks/useLeave'
import { requestStatusVariant } from '@/lib/statusBadge'
import { formatDate } from '@/lib/utils'
import type { LeaveType } from '@/types/leave'

const leaveTypeOptions: { value: LeaveType; label: string }[] = [
  { value: 'annual', label: 'Cuti Tahunan' },
  { value: 'sick', label: 'Sakit' },
  { value: 'emergency', label: 'Darurat' },
  { value: 'unpaid', label: 'Tanpa Gaji' },
]

const emptyForm = {
  type: 'annual' as LeaveType,
  start_date: '',
  end_date: '',
  half_day: false,
  reason: '',
}

export function MobileLeavePage() {
  const quota = useLeaveQuota()
  const list = useLeaveList({ per_page: 20 })
  const createLeave = useCreateLeave()
  const cancelLeave = useCancelLeave()

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [attachment, setAttachment] = useState<File | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const end_date = form.half_day ? form.start_date : form.end_date
    await createLeave.mutateAsync({ ...form, end_date, attachment })
    setForm(emptyForm)
    setAttachment(null)
    setShowForm(false)
  }

  return (
    <div className="pb-8">
      <MobileHeader
        title="Cuti"
        action={
          <button onClick={() => setShowForm((v) => !v)} aria-label="Ajukan cuti" className="p-1">
            {showForm ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
          </button>
        }
      />

      <div className="space-y-3 p-4">
        <div className="flex items-center gap-3 rounded-2xl bg-white p-4 shadow-sm">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sky-100">
            <Plane className="h-6 w-6 text-sky-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-800">{quota.data?.remaining_days ?? '-'}</p>
            <p className="text-sm text-slate-500">
              Sisa cuti dari {quota.data?.total_days ?? 0} hari
            </p>
          </div>
        </div>

        {showForm && (
          <form onSubmit={submit} className="space-y-3 rounded-2xl bg-white p-4 shadow-sm">
            <div className="space-y-1">
              <Label htmlFor="m-type">Jenis Cuti</Label>
              <Select
                id="m-type"
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as LeaveType })}
              >
                {leaveTypeOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="m-duration">Durasi</Label>
              <Select
                id="m-duration"
                value={form.half_day ? 'half' : 'full'}
                onChange={(e) => setForm({ ...form, half_day: e.target.value === 'half' })}
              >
                <option value="full">Hari penuh</option>
                <option value="half">Setengah hari (0,5)</option>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="m-start">{form.half_day ? 'Tanggal' : 'Mulai'}</Label>
                <Input
                  id="m-start"
                  type="date"
                  required
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                />
              </div>
              {!form.half_day && (
                <div className="space-y-1">
                  <Label htmlFor="m-end">Selesai</Label>
                  <Input
                    id="m-end"
                    type="date"
                    required
                    min={form.start_date || undefined}
                    value={form.end_date}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                  />
                </div>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="m-reason">Alasan</Label>
              <Textarea
                id="m-reason"
                required
                maxLength={1000}
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="m-att">Lampiran (opsional)</Label>
              <Input
                id="m-att"
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                onChange={(e) => setAttachment(e.target.files?.[0] ?? null)}
              />
            </div>
            <Button type="submit" disabled={createLeave.isPending} className="w-full">
              {createLeave.isPending && <Spinner className="h-4 w-4" />}
              Kirim Pengajuan
            </Button>
          </form>
        )}

        <h2 className="pt-2 text-sm font-semibold text-slate-500">Riwayat Pengajuan</h2>
        {list.isLoading ? (
          <div className="flex justify-center py-8">
            <Spinner className="h-6 w-6 text-sky-500" />
          </div>
        ) : list.data?.data.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-400">Belum ada pengajuan cuti.</p>
        ) : (
          list.data?.data.map((l) => (
            <div key={l.id} className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="mb-1 flex items-center justify-between">
                <span className="font-semibold text-slate-800">{l.type_label}</span>
                <Badge variant={requestStatusVariant(l.status)}>{l.status_label}</Badge>
              </div>
              <p className="text-sm text-slate-500">
                {formatDate(l.start_date)} – {formatDate(l.end_date)} · {l.total_days} hari
              </p>
              <p className="mt-1 text-sm text-slate-600">{l.reason}</p>
              {l.status === 'pending' && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  disabled={cancelLeave.isPending}
                  onClick={() => cancelLeave.mutate(l.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" /> Batalkan
                </Button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
