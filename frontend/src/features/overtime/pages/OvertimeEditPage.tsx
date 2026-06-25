import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Save } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Spinner, PageLoader } from '@/components/ui/spinner'
import { useOvertimeDetail, useUpdateOvertimeEmployee } from '@/features/overtime/hooks/useOvertime'
import { requestStatusVariant } from '@/lib/statusBadge'
import { formatDate } from '@/lib/utils'
import { routePaths } from '@/routes/routePaths'
import type { CompensationType, OvertimeRequestEmployee } from '@/types/overtime'

/** ISO-8601 with offset ("…T17:00:00+07:00") -> datetime-local value ("…T17:00"). */
function toLocalInput(value: string | null | undefined): string {
  if (!value) return ''
  // The backend already emits the display-timezone wall clock, so the first 16
  // chars are the correct local "YYYY-MM-DDTHH:mm".
  return value.slice(0, 16)
}

function EmployeeEditor({ employee }: { employee: OvertimeRequestEmployee }) {
  const update = useUpdateOvertimeEmployee()
  const [plannedStart, setPlannedStart] = useState(toLocalInput(employee.planned_start_at))
  const [plannedEnd, setPlannedEnd] = useState(toLocalInput(employee.planned_end_at))
  const [clockIn, setClockIn] = useState(toLocalInput(employee.session?.clock_in_at))
  const [clockOut, setClockOut] = useState(toLocalInput(employee.session?.clock_out_at))
  const [compensation, setCompensation] = useState<CompensationType>(employee.compensation_type)

  const save = () => {
    update.mutate({
      id: employee.id,
      payload: {
        planned_start_at: plannedStart || null,
        planned_end_at: plannedEnd || null,
        clock_in_at: clockIn || null,
        clock_out_at: clockOut || null,
        compensation_type: compensation,
      },
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2 text-base">
          <span>{employee.user?.name ?? `#${employee.user_id}`}</span>
          <Badge variant={compensation === 'leave' ? 'success' : 'muted'}>
            {compensation === 'leave' ? 'Ganti Hari' : 'Ganti Uang'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Rencana mulai</Label>
            <Input type="datetime-local" value={plannedStart} onChange={(e) => setPlannedStart(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Rencana selesai</Label>
            <Input type="datetime-local" value={plannedEnd} onChange={(e) => setPlannedEnd(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Aktual mulai (clock-in)</Label>
            <Input type="datetime-local" value={clockIn} onChange={(e) => setClockIn(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Aktual selesai (clock-out)</Label>
            <Input type="datetime-local" value={clockOut} onChange={(e) => setClockOut(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Kompensasi</Label>
            <Select value={compensation} onChange={(e) => setCompensation(e.target.value as CompensationType)}>
              <option value="money">Ganti Uang</option>
              <option value="leave">Ganti Hari</option>
            </Select>
          </div>
          <div className="flex items-end gap-3 text-sm text-muted-foreground">
            {employee.session?.total_hours != null && <span>{employee.session.total_hours} jam</span>}
            {compensation === 'leave' && employee.leave_days_credited > 0 && (
              <span className="text-emerald-600">+{employee.leave_days_credited} hari cuti</span>
            )}
          </div>
        </div>
        <Button onClick={save} disabled={update.isPending}>
          {update.isPending ? <Spinner className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          Simpan
        </Button>
      </CardContent>
    </Card>
  )
}

export function OvertimeEditPage() {
  const { id } = useParams<{ id: string }>()
  const detail = useOvertimeDetail(Number(id))
  const overtime = detail.data

  return (
    <div>
      <PageHeader
        title="Edit Lembur"
        description="Sesuaikan jadwal, waktu aktual, dan kompensasi tiap karyawan — termasuk setelah disetujui."
        action={
          <Link to={routePaths.overtime} className={buttonVariants({ variant: 'outline' })}>
            <ArrowLeft className="h-4 w-4" /> Kembali
          </Link>
        }
      />

      {detail.isLoading ? (
        <PageLoader />
      ) : !overtime ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Pengajuan lembur tidak ditemukan.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card>
            <CardContent className="flex flex-wrap items-center justify-between gap-2 p-4">
              <div>
                <div className="font-medium">{formatDate(overtime.overtime_date)}</div>
                <div className="text-sm text-muted-foreground">{overtime.reason}</div>
              </div>
              <Badge variant={requestStatusVariant(overtime.status)}>{overtime.status_label}</Badge>
            </CardContent>
          </Card>

          {overtime.employees?.map((emp) => <EmployeeEditor key={emp.id} employee={emp} />)}
        </div>
      )}
    </div>
  )
}
