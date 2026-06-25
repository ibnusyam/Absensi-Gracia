<?php

namespace App\Services;

use App\Enums\ApprovalAction;
use App\Enums\ApprovalStage;
use App\Enums\LeaveStatus;
use App\Enums\OvertimeStatus;
use App\Enums\RoleSlug;
use App\Exceptions\BusinessRuleException;
use App\Models\ApprovalLog;
use App\Models\LeaveRequest;
use App\Models\OvertimeRequest;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class ApprovalService
{
    public function __construct(
        private readonly LeaveService $leaveService,
        private readonly OvertimeService $overtimeService,
        private readonly FcmService $fcm,
        private readonly AuditService $audit,
    ) {
    }

    /**
     * Items awaiting the given approver based on their role and the workflow stage.
     *
     * @return array{overtime: \Illuminate\Support\Collection, leave: \Illuminate\Support\Collection}
     */
    public function pendingFor(User $approver): array
    {
        $overtimeQuery = OvertimeRequest::with(['requester', 'department', 'employees.user']);

        if ($approver->hasRole(RoleSlug::Hrd)) {
            $overtimeQuery->where('status', OvertimeStatus::Pending);
        } elseif ($approver->hasRole(RoleSlug::Direktur)) {
            $overtimeQuery->where('status', OvertimeStatus::ApprovedByHrd);
        } else {
            $overtimeQuery->whereRaw('1 = 0');
        }

        // Leave is a single HRD stage; any approver may action a pending leave.
        $leave = LeaveRequest::with('user')
            ->where('status', LeaveStatus::Pending)
            ->latest()
            ->get();

        return [
            'overtime' => $overtimeQuery->latest()->get(),
            'leave' => $leave,
        ];
    }

    /**
     * Dispatch an approval action against either an overtime or leave request.
     */
    public function act(
        Model $approvable,
        User $approver,
        ApprovalAction $action,
        ?string $notes,
    ): Model {
        if (! $approver->isApprover()) {
            throw new BusinessRuleException('Anda tidak berwenang melakukan approval.', 403);
        }

        return match (true) {
            $approvable instanceof OvertimeRequest => $this->actOnOvertime($approvable, $approver, $action, $notes),
            $approvable instanceof LeaveRequest => $this->actOnLeave($approvable, $approver, $action, $notes),
            default => throw new BusinessRuleException('Jenis approval tidak dikenal.', 422),
        };
    }

    private function actOnOvertime(
        OvertimeRequest $request,
        User $approver,
        ApprovalAction $action,
        ?string $notes,
    ): OvertimeRequest {
        // Resolve which stage this approver is allowed to act on.
        $stage = match ($request->status) {
            OvertimeStatus::Pending => ApprovalStage::Hrd,
            OvertimeStatus::ApprovedByHrd => ApprovalStage::Director,
            default => throw new BusinessRuleException('Pengajuan lembur ini sudah selesai diproses.', 422),
        };

        $requiredRole = $stage === ApprovalStage::Hrd ? RoleSlug::Hrd : RoleSlug::Direktur;
        if (! $approver->hasRole($requiredRole)) {
            throw new BusinessRuleException(
                "Tahap ini hanya dapat disetujui oleh {$requiredRole->label()}.",
                403,
            );
        }

        return DB::transaction(function () use ($request, $approver, $action, $notes, $stage) {
            $old = $request->getAttributes();

            if ($action === ApprovalAction::Rejected) {
                $request->status = OvertimeStatus::Rejected;
            } elseif ($stage === ApprovalStage::Hrd) {
                $request->status = OvertimeStatus::ApprovedByHrd;
            } else {
                $request->status = OvertimeStatus::ApprovedByDirector;
            }

            $request->save();
            $this->log($request, $approver, $stage, $action, $notes);
            $this->audit->updated($request, $old);

            // Once fully approved, credit leave days for any "ganti hari" employee
            // whose session is already finished (e.g. approved after the fact).
            if ($request->status === OvertimeStatus::ApprovedByDirector) {
                $request->load('employees.session', 'employees.user');
                foreach ($request->employees as $pivot) {
                    $this->overtimeService->settleLeaveCompensation($pivot);
                }
            }

            $this->notifyOvertimeOutcome($request, $action, $stage);

            return $request->load(['requester', 'department', 'employees.user', 'approvalLogs.approver']);
        });
    }

    private function actOnLeave(
        LeaveRequest $leave,
        User $approver,
        ApprovalAction $action,
        ?string $notes,
    ): LeaveRequest {
        if ($leave->status !== LeaveStatus::Pending) {
            throw new BusinessRuleException('Pengajuan cuti ini sudah selesai diproses.', 422);
        }

        return DB::transaction(function () use ($leave, $approver, $action, $notes) {
            $old = $leave->getAttributes();

            if ($action === ApprovalAction::Approved) {
                $leave->status = LeaveStatus::Approved;
                $leave->save();
                $this->leaveService->applyApprovedQuota($leave);
            } else {
                $leave->status = LeaveStatus::Rejected;
                $leave->save();
            }

            $this->log($leave, $approver, ApprovalStage::Hrd, $action, $notes);
            $this->audit->updated($leave, $old);

            $this->notifyLeaveOutcome($leave, $action);

            return $leave->load(['user', 'approvalLogs.approver']);
        });
    }

    private function log(
        Model $approvable,
        User $approver,
        ApprovalStage $stage,
        ApprovalAction $action,
        ?string $notes,
    ): ApprovalLog {
        return ApprovalLog::create([
            'approvable_type' => $approvable->getMorphClass(),
            'approvable_id' => $approvable->getKey(),
            'stage' => $stage->value,
            'approver_id' => $approver->id,
            'action' => $action,
            'notes' => $notes,
            'acted_at' => now(),
        ]);
    }

    private function notifyOvertimeOutcome(OvertimeRequest $request, ApprovalAction $action, ApprovalStage $stage): void
    {
        $request->loadMissing(['requester', 'employees.user']);

        if ($action === ApprovalAction::Rejected) {
            // Notify the requester that the flow stopped.
            if ($request->requester) {
                $this->fcm->notifyUser(
                    $request->requester,
                    'Pengajuan Lembur Ditolak',
                    "Pengajuan lembur tanggal {$request->overtime_date->toDateString()} ditolak.",
                    ['type' => 'overtime', 'id' => (string) $request->id],
                );
            }

            return;
        }

        if ($request->status === OvertimeStatus::ApprovedByDirector) {
            // Fully approved: notify all employees in the batch.
            $employees = $request->employees->map->user->filter();
            $this->fcm->notifyUsers(
                $employees,
                'Lembur Disetujui',
                "Lembur tanggal {$request->overtime_date->toDateString()} telah disetujui.",
                ['type' => 'overtime', 'id' => (string) $request->id],
            );
        }
    }

    private function notifyLeaveOutcome(LeaveRequest $leave, ApprovalAction $action): void
    {
        $leave->loadMissing('user');

        if (! $leave->user) {
            return;
        }

        $title = $action === ApprovalAction::Approved ? 'Cuti Disetujui' : 'Cuti Ditolak';
        $this->fcm->notifyUser(
            $leave->user,
            $title,
            "Pengajuan cuti {$leave->start_date->toDateString()} s/d {$leave->end_date->toDateString()} telah {$action->label()}.",
            ['type' => 'leave', 'id' => (string) $leave->id],
        );
    }
}
