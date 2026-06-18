<?php

namespace App\Services;

use App\Enums\AttendanceStatus;
use App\Enums\LeaveStatus;
use App\Exceptions\BusinessRuleException;
use App\Models\Attendance;
use App\Models\HolidayCalendar;
use App\Models\LeaveRequest;
use App\Models\User;
use App\Models\WorkLocation;
use App\Models\WorkSchedule;
use Carbon\CarbonImmutable;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class AttendanceService
{
    public function __construct(
        private readonly GeofenceService $geofence,
        private readonly AuditService $audit,
    ) {
    }

    private function displayTz(): string
    {
        return config('services.display_timezone', 'Asia/Jakarta');
    }

    /**
     * The "today" used for attendance bookkeeping, in the display timezone.
     */
    public function today(): Carbon
    {
        return now()->setTimezone($this->displayTz())->startOfDay();
    }

    public function todayAttendance(User $user): ?Attendance
    {
        return Attendance::with('location')
            ->where('user_id', $user->id)
            ->whereDate('date', $this->today()->toDateString())
            ->first();
    }

    /**
     * Clock in: geofence check, lateness evaluation, selfie storage.
     */
    public function clockIn(User $user, float $lat, float $lng, ?UploadedFile $selfie): Attendance
    {
        $date = $this->today()->toDateString();

        $existing = Attendance::where('user_id', $user->id)
            ->whereDate('date', $date)
            ->first();

        if ($existing && $existing->clock_in_at) {
            throw new BusinessRuleException('Anda sudah melakukan clock-in hari ini.', 422);
        }

        $location = $this->activeLocation();
        $this->geofence->assertWithinRadius($location, $lat, $lng);

        [$status, $lateMinutes] = $this->evaluateLateness(now());

        $selfiePath = null;
        if ($selfie) {
            $selfiePath = $selfie->store("selfies/{$user->id}", 'public');
        }

        return DB::transaction(function () use (
            $user, $date, $location, $lat, $lng, $selfiePath, $status, $lateMinutes, $existing
        ) {
            $attendance = $existing ?? new Attendance(['user_id' => $user->id, 'date' => $date]);

            $attendance->fill([
                'clock_in_at' => now(), // stored UTC
                'location_id' => $location->id,
                'clock_in_lat' => $lat,
                'clock_in_lng' => $lng,
                'selfie_path' => $selfiePath,
                'status' => $status,
                'late_minutes' => $lateMinutes,
            ]);
            $attendance->save();

            $this->audit->created($attendance);

            return $attendance->load('location');
        });
    }

    /**
     * Clock out: geofence check only (no lateness), stamp clock_out_at.
     */
    public function clockOut(User $user, float $lat, float $lng, ?UploadedFile $selfie = null): Attendance
    {
        $attendance = $this->todayAttendance($user);

        if (! $attendance || ! $attendance->clock_in_at) {
            throw new BusinessRuleException('Anda belum melakukan clock-in hari ini.', 422);
        }

        if ($attendance->clock_out_at) {
            throw new BusinessRuleException('Anda sudah melakukan clock-out hari ini.', 422);
        }

        $location = $this->activeLocation();
        $this->geofence->assertWithinRadius($location, $lat, $lng);

        $old = $attendance->getAttributes();
        $attendance->clock_out_at = now();
        $attendance->clock_out_lat = $lat;
        $attendance->clock_out_lng = $lng;
        if ($selfie) {
            $attendance->selfie_out_path = $selfie->store("selfies/{$user->id}", 'public');
        }
        $attendance->save();

        $this->audit->updated($attendance, $old);

        return $attendance->load('location');
    }

    /**
     * Monthly recap of attendance statuses for a user.
     *
     * @return array{month:int, year:int, total_days:int, present:int, late:int, absent:int, permit:int, holiday:int, total_late_minutes:int}
     */
    public function monthlySummary(User $user, int $month, int $year): array
    {
        $start = CarbonImmutable::create($year, $month, 1, 0, 0, 0, $this->displayTz());
        $end = $start->endOfMonth();

        $rows = Attendance::where('user_id', $user->id)
            ->whereBetween('date', [$start->toDateString(), $end->toDateString()])
            ->get();

        $counts = [
            'present' => 0,
            'late' => 0,
            'absent' => 0,
            'permit' => 0,
            'holiday' => 0,
        ];

        $totalLate = 0;

        foreach ($rows as $row) {
            $key = $row->status->value;
            if (array_key_exists($key, $counts)) {
                $counts[$key]++;
            }
            $totalLate += (int) $row->late_minutes;
        }

        return [
            'month' => $month,
            'year' => $year,
            'total_days' => $rows->count(),
            ...$counts,
            'total_late_minutes' => $totalLate,
        ];
    }

    /**
     * Daily attendance roster: every active employee (optionally scoped to a
     * department) paired with their attendance status for the given date.
     * Employees with no record are derived as Permit (approved leave),
     * Holiday (weekend/holiday) or Absent.
     *
     * @return array{date:string, is_holiday:bool, summary:array<string,int>, rows:array<int,array{user:User, attendance:?Attendance, status:string}>}
     */
    public function dailyReport(User $actor, string $dateString, ?int $departmentId): array
    {
        $tz = $this->displayTz();
        $date = Carbon::parse($dateString, $tz)->startOfDay();
        $dateStr = $date->toDateString();

        // Admin Bagian is restricted to their own department.
        if ($actor->isAdminBagian()) {
            $departmentId = $actor->department_id;
        }

        $users = User::with(['department', 'role'])
            ->where('is_active', true)
            ->when($departmentId, fn ($q) => $q->where('department_id', $departmentId))
            ->orderBy('name')
            ->get();

        $userIds = $users->pluck('id');

        $attendances = Attendance::with('location')
            ->whereIn('user_id', $userIds)
            ->whereDate('date', $dateStr)
            ->get()
            ->keyBy('user_id');

        $onLeave = LeaveRequest::where('status', LeaveStatus::Approved)
            ->whereIn('user_id', $userIds)
            ->whereDate('start_date', '<=', $dateStr)
            ->whereDate('end_date', '>=', $dateStr)
            ->pluck('user_id')
            ->flip();

        $isHoliday = HolidayCalendar::whereDate('date', $dateStr)->exists();
        $isWeekend = $date->isWeekend();

        $counts = ['present' => 0, 'late' => 0, 'permit' => 0, 'absent' => 0, 'holiday' => 0];
        $rows = [];

        foreach ($users as $user) {
            $attendance = $attendances->get($user->id);

            if ($attendance) {
                $status = $attendance->status->value;
            } elseif ($onLeave->has($user->id)) {
                $status = AttendanceStatus::Permit->value;
            } elseif ($isWeekend || $isHoliday) {
                $status = AttendanceStatus::Holiday->value;
            } else {
                $status = AttendanceStatus::Absent->value;
            }

            if (array_key_exists($status, $counts)) {
                $counts[$status]++;
            }

            $rows[] = [
                'user' => $user,
                'attendance' => $attendance,
                'status' => $status,
            ];
        }

        return [
            'date' => $dateStr,
            'is_holiday' => $isHoliday || $isWeekend,
            'summary' => [
                'total' => $users->count(),
                ...$counts,
            ],
            'rows' => $rows,
        ];
    }

    /**
     * Resolve the single active work location.
     */
    public function activeLocation(): WorkLocation
    {
        $location = WorkLocation::active()->first();

        if (! $location) {
            throw new BusinessRuleException('Belum ada lokasi kerja aktif yang dikonfigurasi.', 422);
        }

        return $location;
    }

    /**
     * Compare a UTC clock-in moment against the active schedule's deadline
     * (interpreted in the display timezone) to decide present vs. late.
     *
     * @return array{0: AttendanceStatus, 1: int|null}
     */
    private function evaluateLateness(Carbon $clockInUtc): array
    {
        $schedule = WorkSchedule::first();

        if (! $schedule) {
            return [AttendanceStatus::Present, null];
        }

        $tz = $this->displayTz();
        $local = $clockInUtc->copy()->setTimezone($tz);

        $deadline = Carbon::parse($local->toDateString().' '.$schedule->clock_in_deadline, $tz);
        $threshold = $deadline->copy()->addMinutes((int) $schedule->late_tolerance_minutes);

        if ($local->greaterThan($threshold)) {
            // Minutes counted from the deadline itself (excluding tolerance grace).
            $lateMinutes = $deadline->diffInMinutes($local);

            return [AttendanceStatus::Late, (int) $lateMinutes];
        }

        return [AttendanceStatus::Present, null];
    }
}
