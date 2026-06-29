<?php

namespace App\Services;

use App\Enums\CompensationType;
use App\Enums\OvertimeStatus;
use App\Exceptions\BusinessRuleException;
use App\Models\HolidayCalendar;
use App\Models\OvertimeRequest;
use App\Models\OvertimeRequestEmployee;
use App\Models\OvertimeSession;
use App\Models\User;
use Illuminate\Http\UploadedFile;
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
        private readonly LeaveService $leaveService,
    ) {
    }

    /**
     * Create a batch overtime request (one request, many employees). Each employee
     * carries their own planned start/end and compensation choice, plus an empty
     * session ready to be clocked once the request is fully approved.
     *
     * @param  array{overtime_date:string, reason:string, employees:array<int,array{user_id:int, planned_start_at?:string, planned_end_at?:string, compensation_type?:string}>}  $data
     */
    public function create(User $requester, array $data): OvertimeRequest
    {
        $departmentId = $requester->department_id;

        if (! $departmentId) {
            throw new BusinessRuleException('Pengaju lembur belum tergabung dalam departemen.', 422);
        }

        $employees = collect($data['employees'])
            ->keyBy(fn ($e) => (int) $e['user_id'])
            ->all();
        $employeeIds = array_keys($employees);

        // Employees must belong to the requester's department.
        $validCount = User::whereIn('id', $employeeIds)
            ->where('department_id', $departmentId)
            ->count();

        if ($validCount !== count($employeeIds)) {
            throw new BusinessRuleException('Sebagian karyawan tidak berada di departemen Anda.', 422);
        }

        return DB::transaction(function () use ($requester, $departmentId, $employees, $data) {
            $request = OvertimeRequest::create([
                'requested_by' => $requester->id,
                'department_id' => $departmentId,
                'overtime_date' => $data['overtime_date'],
                'reason' => $data['reason'],
                'status' => OvertimeStatus::Pending,
            ]);

            foreach ($employees as $userId => $emp) {
                $pivot = OvertimeRequestEmployee::create([
                    'overtime_request_id' => $request->id,
                    'user_id' => $userId,
                    'planned_start_at' => $this->toUtc($emp['planned_start_at'] ?? null),
                    'planned_end_at' => $this->toUtc($emp['planned_end_at'] ?? null),
                    'compensation_type' => $emp['compensation_type'] ?? CompensationType::Money->value,
                ]);

                OvertimeSession::create([
                    'overtime_request_employee_id' => $pivot->id,
                ]);
            }

            $this->audit->created($request);

            return $request->load(['employees.user', 'employees.session']);
        });
    }

    /**
     * Interpret an incoming local datetime string (display timezone, e.g. from a
     * datetime-local input) and convert it to UTC for storage. Null passes through.
     */
    private function toUtc(?string $value): ?Carbon
    {
        if ($value === null || $value === '') {
            return null;
        }

        return Carbon::parse($value, config('services.display_timezone'))->utc();
    }

    /**
     * Leave days earned when an employee opts to convert overtime into leave
     * ("ganti hari"). Counted only in whole 4-hour blocks (rounded down):
     *  - Holiday/weekend overtime: 1 leave day per 4 hours.
     *  - Workday overtime:        0.5 leave day per 4 hours.
     */
    public function computeLeaveDays(float $hours, bool $isHoliday): float
    {
        $blocks = (int) floor($hours / 4);

        return $blocks * ($isHoliday ? 1.0 : 0.5);
    }

    /**
     * Reconcile the leave-day credit for one overtime employee row against the
     * current state. Idempotent: the difference from what was already credited is
     * applied to the annual quota, so it supports edits and compensation changes
     * (including reversals when hours drop or the type switches back to money).
     */
    public function settleLeaveCompensation(OvertimeRequestEmployee $pivot): void
    {
        $pivot->loadMissing(['overtimeRequest', 'session', 'user']);
        $request = $pivot->overtimeRequest;
        $session = $pivot->session;

        $hours = $session?->total_hours !== null ? (float) $session->total_hours : null;

        // Eligible only when fully approved, the session is finished, and the
        // employee chose to convert to leave days.
        $eligible = $request
            && $request->status->isFullyApproved()
            && $pivot->compensation_type === CompensationType::Leave
            && $hours !== null
            && $pivot->user;

        // Resolve the employee's overtime start in the display timezone so the
        // holiday lookup and quota year use the local calendar date.
        $tz = config('services.display_timezone');
        $rawStart = $pivot->planned_start_at ?? $session?->clock_in_at ?? $request?->overtime_date;
        $start = ($rawStart instanceof Carbon ? $rawStart->copy() : Carbon::parse($rawStart))->setTimezone($tz);

        $target = $eligible
            ? $this->computeLeaveDays($hours, $this->isHoliday($start))
            : 0.0;

        $credited = (float) $pivot->leave_days_credited;
        $delta = round($target - $credited, 1);

        if ($delta === 0.0) {
            return;
        }

        DB::transaction(function () use ($pivot, $start, $delta, $target) {
            $year = $start->year;
            $quota = $this->leaveService->quotaFor($pivot->user, $year);
            $quota->total_days = (float) $quota->total_days + $delta;
            $quota->syncRemaining();
            $quota->save();

            $tanggal = $start->format('d/m/Y');
            $reason = $delta >= 0
                ? "Kompensasi lembur ganti hari ({$tanggal})"
                : "Penyesuaian kompensasi lembur ganti hari ({$tanggal})";
            $quota->logChange($delta, $reason, $pivot->overtimeRequest);

            $pivot->leave_days_credited = $target;
            $pivot->save();
        });
    }

    public function sessionClockIn(
        OvertimeSession $session,
        User $user,
        float $lat,
        float $lng,
        ?UploadedFile $selfie,
    ): OvertimeSession {
        $this->assertOwnedAndApproved($session, $user);

        if ($session->clock_in_at) {
            throw new BusinessRuleException('Sesi lembur sudah dimulai.', 422);
        }

        $session->clock_in_at = now();
        $session->clock_in_lat = $lat;
        $session->clock_in_lng = $lng;
        if ($selfie) {
            $session->selfie_path = $selfie->store("overtime-selfies/{$user->id}", 'public');
        }
        $session->save();

        return $session;
    }

    /**
     * Clock out an overtime session and compute hours + compensation.
     */
    public function sessionClockOut(
        OvertimeSession $session,
        User $user,
        float $lat,
        float $lng,
        ?UploadedFile $selfie,
    ): OvertimeSession {
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
        $session->clock_out_lat = $lat;
        $session->clock_out_lng = $lng;
        if ($selfie) {
            $session->selfie_out_path = $selfie->store("overtime-selfies/{$user->id}", 'public');
        }
        $session->save();

        // Credit leave days if this employee chose "ganti hari".
        $this->settleLeaveCompensation($session->requestEmployee);

        return $session;
    }

    /**
     * Admin correction of one employee's overtime row: their planned schedule,
     * the actual clocked times, and/or the compensation type. Allowed at any
     * status except rejected, including after full approval (overtime is dynamic).
     * Recomputes worked hours and re-settles any leave-day credit.
     *
     * @param  array{planned_start_at?:?string, planned_end_at?:?string, clock_in_at?:?string, clock_out_at?:?string, compensation_type?:string}  $data
     */
    public function adminUpdateEmployee(OvertimeRequestEmployee $pivot, User $actor, array $data): OvertimeRequestEmployee
    {
        $pivot->loadMissing(['overtimeRequest', 'session']);
        $request = $pivot->overtimeRequest;

        $owns = $request && $request->requested_by === $actor->id;
        if (! $owns && ! $actor->hasRole('super-admin')) {
            throw new BusinessRuleException('Anda tidak berwenang mengubah lembur ini.', 403);
        }

        if ($request && $request->status === OvertimeStatus::Rejected) {
            throw new BusinessRuleException('Pengajuan lembur yang ditolak tidak dapat diubah.', 422);
        }

        return DB::transaction(function () use ($pivot, $data) {
            if (array_key_exists('planned_start_at', $data)) {
                $pivot->planned_start_at = $this->toUtc($data['planned_start_at']);
            }
            if (array_key_exists('planned_end_at', $data)) {
                $pivot->planned_end_at = $this->toUtc($data['planned_end_at']);
            }
            if (array_key_exists('compensation_type', $data)) {
                $pivot->compensation_type = $data['compensation_type'];
            }
            $pivot->save();

            // Actual clocked times live on the session and drive worked hours.
            $session = $pivot->session;
            if ($session && (array_key_exists('clock_in_at', $data) || array_key_exists('clock_out_at', $data))) {
                if (array_key_exists('clock_in_at', $data)) {
                    $session->clock_in_at = $this->toUtc($data['clock_in_at']);
                }
                if (array_key_exists('clock_out_at', $data)) {
                    $session->clock_out_at = $this->toUtc($data['clock_out_at']);
                }

                $session->total_hours = ($session->clock_in_at && $session->clock_out_at)
                    ? round($session->clock_in_at->floatDiffInHours($session->clock_out_at), 2)
                    : null;
                $session->save();
            }

            $this->settleLeaveCompensation($pivot->fresh(['overtimeRequest', 'session', 'user']));

            return $pivot->load(['user', 'session', 'overtimeRequest']);
        });
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
