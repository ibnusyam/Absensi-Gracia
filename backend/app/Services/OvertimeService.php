<?php

namespace App\Services;

use App\Enums\OvertimeStatus;
use App\Exceptions\BusinessRuleException;
use App\Models\HolidayCalendar;
use App\Models\OvertimeRequest;
use App\Models\OvertimeRequestEmployee;
use App\Models\OvertimeSession;
use App\Models\User;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class OvertimeService
{
    // Overtime hour-tier multipliers per company regulation (spec §3.4). Used to
    // break worked hours into tiers for the recap; monetary pay is not stored.
    private const WORKDAY_FIRST_HOUR = 1.5;   // first 1 hour on a workday
    private const WORKDAY_REST = 2.0;         // 2nd hour onward on a workday
    private const HOLIDAY_FIRST_8 = 2.0;      // first 8 hours on a holiday/weekend
    private const HOLIDAY_REST = 3.0;         // 9th hour onward on a holiday/weekend

    public function __construct(
        private readonly AuditService $audit,
    ) {
    }

    /**
     * Create a batch overtime request (one request, many employees), each with
     * an empty session ready to be clocked once the request is fully approved.
     *
     * @param  array{overtime_date:string, planned_start:string, planned_end:string, reason:string, employee_ids:int[]}  $data
     */
    public function create(User $requester, array $data): OvertimeRequest
    {
        $departmentId = $requester->department_id;

        if (! $departmentId) {
            throw new BusinessRuleException('Pengaju lembur belum tergabung dalam departemen.', 422);
        }

        $employeeIds = array_values(array_unique($data['employee_ids']));

        // Employees must belong to the requester's department.
        $validCount = User::whereIn('id', $employeeIds)
            ->where('department_id', $departmentId)
            ->count();

        if ($validCount !== count($employeeIds)) {
            throw new BusinessRuleException('Sebagian karyawan tidak berada di departemen Anda.', 422);
        }

        return DB::transaction(function () use ($requester, $departmentId, $employeeIds, $data) {
            $request = OvertimeRequest::create([
                'requested_by' => $requester->id,
                'department_id' => $departmentId,
                'overtime_date' => $data['overtime_date'],
                'planned_start' => $data['planned_start'],
                'planned_end' => $data['planned_end'],
                'reason' => $data['reason'],
                'status' => OvertimeStatus::Pending,
            ]);

            foreach ($employeeIds as $userId) {
                $pivot = OvertimeRequestEmployee::create([
                    'overtime_request_id' => $request->id,
                    'user_id' => $userId,
                ]);

                OvertimeSession::create([
                    'overtime_request_employee_id' => $pivot->id,
                ]);
            }

            $this->audit->created($request);

            return $request->load(['employees.user', 'employees.session']);
        });
    }

    public function sessionClockIn(OvertimeSession $session, User $user): OvertimeSession
    {
        $this->assertOwnedAndApproved($session, $user);

        if ($session->clock_in_at) {
            throw new BusinessRuleException('Sesi lembur sudah dimulai.', 422);
        }

        $session->clock_in_at = now();
        $session->save();

        return $session;
    }

    /**
     * Clock out an overtime session and compute hours + compensation.
     */
    public function sessionClockOut(OvertimeSession $session, User $user): OvertimeSession
    {
        $this->assertOwnedAndApproved($session, $user);

        if (! $session->clock_in_at) {
            throw new BusinessRuleException('Sesi lembur belum dimulai.', 422);
        }

        if ($session->clock_out_at) {
            throw new BusinessRuleException('Sesi lembur sudah selesai.', 422);
        }

        $clockOut = now();
        // Fractional hours between clock-in and clock-out.
        $totalHours = round($session->clock_in_at->floatDiffInHours($clockOut), 2);

        $session->clock_out_at = $clockOut;
        $session->total_hours = $totalHours;
        $session->save();

        return $session;
    }

    /**
     * Whether the given date counts as a holiday for overtime pay purposes:
     * weekends, plus any date recorded in the holiday calendar.
     */
    public function isHoliday(Carbon|string $date): bool
    {
        $day = $date instanceof Carbon ? $date->copy() : Carbon::parse($date);

        if ($day->isWeekend()) {
            return true;
        }

        return HolidayCalendar::whereDate('date', $day->toDateString())->exists();
    }

    /**
     * Split the worked hours into pay tiers (spec §3.4), pro-rated for fractions:
     *  - Workday:         first 1h at 1.5x, the rest at 2x.
     *  - Holiday/weekend: first 8h at 2x, the rest at 3x.
     *
     * @return array<string,float> hours keyed by multiplier, e.g. ['1.5'=>1, '2'=>1.5]
     */
    public function tierHours(float $hours, bool $isHoliday): array
    {
        if ($hours <= 0) {
            return [];
        }

        [$firstMultiplier, $restMultiplier, $cap] = $isHoliday
            ? [self::HOLIDAY_FIRST_8, self::HOLIDAY_REST, 8.0]
            : [self::WORKDAY_FIRST_HOUR, self::WORKDAY_REST, 1.0];

        $tiers = [];
        $first = min($hours, $cap);
        $rest = max($hours - $cap, 0.0);

        if ($first > 0) {
            $tiers[(string) $firstMultiplier] = round($first, 2);
        }
        if ($rest > 0) {
            $tiers[(string) $restMultiplier] = round($rest, 2);
        }

        return $tiers;
    }

    private function assertOwnedAndApproved(OvertimeSession $session, User $user): void
    {
        $session->loadMissing('requestEmployee.overtimeRequest');
        $pivot = $session->requestEmployee;

        if (! $pivot || $pivot->user_id !== $user->id) {
            throw new BusinessRuleException('Sesi lembur ini bukan milik Anda.', 403);
        }

        if (! $pivot->overtimeRequest->status->isFullyApproved()) {
            throw new BusinessRuleException('Pengajuan lembur belum disetujui sepenuhnya.', 422);
        }
    }
}
