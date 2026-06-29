<?php

namespace Database\Seeders;

use App\Enums\ApprovalAction;
use App\Enums\ApprovalStage;
use App\Enums\LeaveStatus;
use App\Enums\LeaveType;
use App\Enums\RoleSlug;
use App\Models\ApprovalLog;
use App\Models\LeaveQuota;
use App\Models\LeaveRequest;
use App\Models\User;
use App\Services\LeaveService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Seeds leave requests in every state so both menus have data this month:
 *   - Approved  -> shows up in the monthly "Rekap" (cuti).
 *   - Pending   -> shows up in "Pengajuan Karyawan" (cuti).
 *   - Rejected  -> finalised, kept for completeness.
 *
 * Dates land on weekdays in the current month so each request has working days.
 */
class LeaveSeeder extends Seeder
{
    public function run(): void
    {
        $tz = config('services.display_timezone');
        $monthStart = now()->setTimezone($tz)->startOfMonth();

        $hrd = User::whereHas('role', fn ($q) => $q->where('slug', RoleSlug::Hrd->value))->first();

        $employees = User::whereHas('role', fn ($q) => $q->where('slug', RoleSlug::Karyawan->value))
            ->get();

        $weekdays = $this->weekdaysInMonth($monthStart);

        if (! $hrd || $employees->count() < 4 || count($weekdays) < 12) {
            $this->command?->warn('LeaveSeeder dilewati: butuh HRD, ≥4 karyawan, dan cukup hari kerja di bulan ini.');

            return;
        }

        $this->cleanup();

        $service = app(LeaveService::class);

        // ---- Approved (muncul di Rekap) ----
        $this->approve($service, $hrd, $this->make($service, $employees[0], LeaveType::Annual, $weekdays[2], $weekdays[3], 'Liburan keluarga.'));
        $this->approve($service, $hrd, $this->make($service, $employees[1], LeaveType::Sick, $weekdays[4], $weekdays[4], 'Demam, istirahat.'));
        $this->approve($service, $hrd, $this->make($service, $employees[2], LeaveType::Annual, $weekdays[5], $weekdays[7], 'Acara pernikahan saudara.'));
        // Setengah hari, disetujui — 0,5 hari.
        $this->approve($service, $hrd, $this->make($service, $employees[3], LeaveType::Annual, $weekdays[6], $weekdays[6], 'Urusan bank, setengah hari.', true));

        // ---- Pending (muncul di Pengajuan Karyawan) ----
        $this->make($service, $employees[3], LeaveType::Annual, $weekdays[9], $weekdays[10], 'Urusan pribadi.');
        $this->make($service, $employees[0], LeaveType::Sick, $weekdays[11], $weekdays[11], 'Keperluan mendadak.');
        // Setengah hari, menunggu — 0,5 hari.
        $this->make($service, $employees[2], LeaveType::Annual, $weekdays[10], $weekdays[10], 'Kontrol dokter, setengah hari.', true);

        // ---- Rejected (finalised) ----
        $this->reject($service, $hrd, $this->make($service, $employees[1], LeaveType::Unpaid, $weekdays[8], $weekdays[8], 'Cuti tanpa bayaran.'));

        $this->command?->info('LeaveSeeder selesai: 4 disetujui (1 setengah hari), 3 menunggu (1 setengah hari), 1 ditolak (bulan ini).');
    }

    /** Build a pending leave request via the real service. */
    private function make(
        LeaveService $service,
        User $user,
        LeaveType $type,
        Carbon $start,
        Carbon $end,
        string $reason,
        bool $halfDay = false,
    ): LeaveRequest {
        return $service->create($user, [
            'type' => $type,
            'start_date' => $start->toDateString(),
            'end_date' => $end->toDateString(),
            'half_day' => $halfDay,
            'reason' => $reason,
        ]);
    }

    private function approve(LeaveService $service, User $hrd, LeaveRequest $leave): void
    {
        $leave->update(['status' => LeaveStatus::Approved]);
        $service->applyApprovedQuota($leave);
        $this->log($leave, $hrd, ApprovalAction::Approved);
    }

    private function reject(LeaveService $service, User $hrd, LeaveRequest $leave): void
    {
        $leave->update(['status' => LeaveStatus::Rejected]);
        $this->log($leave, $hrd, ApprovalAction::Rejected);
    }

    private function log(LeaveRequest $leave, User $approver, ApprovalAction $action): void
    {
        ApprovalLog::create([
            'approvable_type' => $leave->getMorphClass(),
            'approvable_id' => $leave->getKey(),
            'stage' => ApprovalStage::Hrd->value,
            'approver_id' => $approver->id,
            'action' => $action,
            'notes' => null,
            'acted_at' => now(),
        ]);
    }

    /** All weekday dates in the given month. */
    private function weekdaysInMonth(Carbon $monthStart): array
    {
        $days = [];
        $cursor = $monthStart->copy();
        while ($cursor->month === $monthStart->month) {
            if (! $cursor->isWeekend()) {
                $days[] = $cursor->copy();
            }
            $cursor->addDay();
        }

        return $days;
    }

    /** Remove previously seeded leave data and restore quota usage so re-runs are clean. */
    private function cleanup(): void
    {
        ApprovalLog::where('approvable_type', (new LeaveRequest)->getMorphClass())->delete();
        LeaveRequest::query()->delete();
        LeaveQuota::query()->update(['used_days' => 0, 'remaining_days' => DB::raw('total_days')]);
    }
}
