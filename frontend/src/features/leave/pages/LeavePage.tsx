import { useState, type FormEvent } from 'react'
import { Plane, Plus, Trash2, X } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Spinner, PageLoader } from '@/components/ui/spinner'
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
  reason: '',
}

export function LeavePage() {
  const quota = useLeaveQuota()
  const list = useLeaveList({ per_page: 20 })
  const createLeave = useCreateLeave()
  const cancelLeave = useCancelLeave()

  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [attachment, setAttachment] = useState<File | null>(null)

  const reset = () => {
    setForm(emptyForm)
    setAttachment(null)
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    await createLeave.mutateAsync({ ...form, attachment })
    reset()
    setShowForm(false)
  }

  return (
    <div>
      <PageHeader
        title="Cuti"
        description="Ajukan dan pantau pengajuan cuti Anda."
        action={
          <Button onClick={() => setShowForm((v) => !v)}>
            {showForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showForm ? 'Tutup' : 'Ajukan Cuti'}
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Plane className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Sisa cuti tahun ini</p>
              <p className="text-2xl font-bold">{quota.data?.remaining_days ?? '-'}</p>
              <p className="text-xs text-muted-foreground">
                dari {quota.data?.total_days ?? 0} hari ({quota.data?.used_days ?? 0} terpakai)
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {showForm && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Pengajuan Cuti Baru</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="type">Jenis Cuti</Label>
                <Select
                  id="type"
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
              <div className="space-y-2">
                <Label htmlFor="attachment">Lampiran (opsional)</Label>
                <Input
                  id="attachment"
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  onChange={(e) => setAttachment(e.target.files?.[0] ?? null)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="start_date">Tanggal Mulai</Label>
                <Input
                  id="start_date"
                  type="date"
                  required
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_date">Tanggal Selesai</Label>
                <Input
                  id="end_date"
                  type="date"
                  required
                  min={form.start_date || undefined}
                  value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="reason">Alasan</Label>
                <Textarea
                  id="reason"
                  required
                  maxLength={1000}
                  placeholder="Jelaskan alasan pengajuan cuti…"
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={createLeave.isPending}>
                  {createLeave.isPending && <Spinner className="h-4 w-4" />}
                  Kirim Pengajuan
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Riwayat Pengajuan</CardTitle>
        </CardHeader>
        <CardContent>
          {list.isLoading ? (
            <PageLoader />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="py-2 pr-4 font-medium">Jenis</th>
                    <th className="py-2 pr-4 font-medium">Mulai</th>
                    <th className="py-2 pr-4 font-medium">Selesai</th>
                    <th className="py-2 pr-4 font-medium">Hari</th>
                    <th className="py-2 pr-4 font-medium">Status</th>
                    <th className="py-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {list.data?.data.map((l) => (
                    <tr key={l.id} className="border-b last:border-0">
                      <td className="py-2 pr-4">{l.type_label}</td>
                      <td className="py-2 pr-4">{formatDate(l.start_date)}</td>
                      <td className="py-2 pr-4">{formatDate(l.end_date)}</td>
                      <td className="py-2 pr-4">{l.total_days}</td>
                      <td className="py-2 pr-4">
                        <Badge variant={requestStatusVariant(l.status)}>{l.status_label}</Badge>
                      </td>
                      <td className="py-2 text-right">
                        {l.status === 'pending' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={cancelLeave.isPending}
                            onClick={() => cancelLeave.mutate(l.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                            Batalkan
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {list.data?.data.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-muted-foreground">
                        Belum ada pengajuan cuti.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
