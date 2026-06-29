<?php

namespace App\Services;

use App\Enums\AttendanceStatus;
use App\Enums\LeaveStatus;
use App\Enums\LeaveType;
use App\Exceptions\BusinessRuleException;
use App\Models\Attendance;
use App\Models\EmployeeOffPeriod;
use App\Models\HolidayCalendar;
use App\Models\LeaveRequest;
use App\Models\User;
use App\Models\WorkLocation;
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
     * Clock in: geofence check and selfie storage.
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

        $selfiePath = null;
        if ($selfie) {
            $selfiePath = $selfie->store("selfies/{$user->id}", 'public');
        }

        return DB::transaction(function () use (
            $user, $date, $location, $lat, $lng, $selfiePath, $existing
        ) {
            $attendance = $existing ?? new Attendance(['user_id' => $user->id, 'date' => $date]);

            $attendance->fill([
                'clock_in_at' => now(), // stored UTC
                'location_id' => $location->id,
                'clock_in_lat' => $lat,
                'clock_in_lng' => $lng,
                'selfie_path' => $selfiePath,
                'status' => AttendanceStatus::Present,
            ]);
            $attendance->save();

            $this->audit->created($attendance);

            return $attendance->load('location');
        });
    }

    /**
     * Clock out: geofence check only, stamp clock_out_at.
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
     * @return array{month:int, year:int, total_days:int, present:int, absent:int, permit:int, holiday:int}
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
            'absent' => 0,
            'permit' => 0,
            'holiday' => 0,
        ];

        foreach ($rows as $row) {
            $key = $row->status->value;
            if (array_key_exists($key, $counts)) {
                $counts[$key]++;
            }
        }

        return [
            'month' => $month,
            'year' => $year,
            'total_days' => $rows->count(),
            ...$counts,
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

        // Employees flagged "off" on this date.
        $offUsers = EmployeeOffPeriod::whereIn('user_id', $userIds)
            ->covering($dateStr)
            ->pluck('user_id')
            ->flip();

        $counts = ['present' => 0, 'permit' => 0, 'absent' => 0, 'holiday' => 0, 'off' => 0];
        $rows = [];

        foreach ($users as $user) {
            $attendance = $attendances->get($user->id);
            $actuallyPresent = $attendance && $attendance->status === AttendanceStatus::Present;

            if ($actuallyPresent) {
                // Real clock-in always wins, even during an off period.
                $status = $attendance->status->value;
            } elseif ($offUsers->has($user->id)) {
                // "Off" overrides an auto-marked absence, leave or holiday.
                $status = AttendanceStatus::Off->value;
            } elseif ($attendance) {
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
     * Attendance status matrix across an inclusive date range for every active
     * employee (optionally scoped to a department). Each cell is a granular code
     * (present, leave_annual/sick/unpaid, absent, holiday, none)
     * so the recap can render a per-day
     * grid plus per-employee totals.
     *
     * @return array{
     *     dates: array<int,string>,
     *     rows: array<int,array{user:User, cells:array<int,string>, totals:array<string,int>}>,
     *     summary: array{total_employees:int, total_days:int}
     * }
     */
    public function attendanceMatrix(string $startString, string $endString, ?int $departmentId): array
    {
        $tz = $this->displayTz();
        // All date math below is done on plain Y-m-d strings: model date casts
        // resolve to UTC midnight while $tz is Asia/Jakarta, so comparing Carbon
        // instants directly would drop the boundary day. String compares of
        // Y-m-d are chronological and timezone-agnostic.
        $startStr = Carbon::parse($startString, $tz)->toDateString();
        $endStr = Carbon::parse($endString, $tz)->toDateString();
        $todayStr = $this->today()->toDateString();

        // Inclusive list of calendar dates in the range.
        $dates = [];
        for ($d = Carbon::parse($startStr); $d->toDateString() <= $endStr; $d->addDay()) {
            $dates[] = $d->toDateString();
        }

        $users = User::with('department')
            ->where('is_active', true)
            ->when($departmentId, fn ($q) => $q->where('department_id', $departmentId))
            ->orderBy('name')
            ->get();

        $userIds = $users->pluck('id');

        // Attendance rows keyed by "userId|Y-m-d". whereDate() (not whereBetween)
        // so a stored "Y-m-d 00:00:00" value still matches the date-only bounds.
        $attendances = Attendance::whereIn('user_id', $userIds)
            ->whereDate('date', '>=', $startStr)
            ->whereDate('date', '<=', $endStr)
            ->get()
            ->keyBy(fn (Attendance $a) => $a->user_id.'|'.$a->date->toDateString());

        // Approved leave expanded to a per-day lookup "userId|Y-m-d" => LeaveType value.
        $leaveMap = [];
        LeaveRequest::where('status', LeaveStatus::Approved)
            ->whereIn('user_id', $userIds)
            ->whereDate('start_date', '<=', $endStr)
            ->whereDate('end_date', '>=', $startStr)
            ->get(['user_id', 'type', 'start_date', 'end_date'])
            ->each(function (LeaveRequest $leave) use (&$leaveMap, $startStr, $endStr) {
                $from = max($leave->start_date->toDateString(), $startStr);
                $to = min($leave->end_date->toDateString(), $endStr);
                for ($d = Carbon::parse($from); $d->toDateString() <= $to; $d->addDay()) {
                    $leaveMap[$leave->user_id.'|'.$d->toDateString()] = $leave->type->value;
                }
            });

        // Holidays in range as a set keyed by date string.
        $holidays = HolidayCalendar::whereDate('date', '>=', $startStr)
            ->whereDate('date', '<=', $endStr)
            ->pluck('date')
            ->mapWithKeys(fn ($d) => [Carbon::parse($d)->toDateString() => true]);

        // Off periods overlapping the range, expanded to a per-day set "userId|Y-m-d".
        $offMap = [];
        EmployeeOffPeriod::whereIn('user_id', $userIds)
            ->whereDate('start_date', '<=', $endStr)
            ->where(fn ($q) => $q
                ->whereNull('end_date')
                ->orWhereDate('end_date', '>=', $startStr))
            ->get(['user_id', 'start_date', 'end_date'])
            ->each(function (EmployeeOffPeriod $off) use (&$offMap, $startStr, $endStr) {
                $from = max($off->start_date->toDateString(), $startStr);
                $to = min($off->end_date?->toDateString() ?? $endStr, $endStr);
                for ($d = Carbon::parse($from); $d->toDateString() <= $to; $d->addDay()) {
                    $offMap[$off->user_id.'|'.$d->toDateString()] = true;
                }
            });

        $rows = [];
        foreach ($users as $user) {
            $cells = [];
            $totals = [
                'present' => 0,
                'leave_annual' => 0, 'leave_sick' => 0, 'leave_emergency' => 0,
                'absent' => 0, 'holiday' => 0, 'off' => 0,
            ];

            foreach ($dates as $i => $ds) {
                $code = $this->matrixCell($user, $ds, $attendances, $leaveMap, $holidays, $offMap, $todayStr);
                $cells[$i] = $code;
                if (array_key_exists($code, $totals)) {
                    $totals[$code]++;
                }
            }

            $rows[] = ['user' => $user, 'cells' => $cells, 'totals' => $totals];
        }

        return [
            'dates' => $dates,
            'rows' => $rows,
            'summary' => [
                'total_employees' => $users->count(),
                'total_days' => count($dates),
            ],
        ];
    }

    /**
     * Resolve the granular recap code for one employee on one date. Mirrors the
     * precedence used by dailyReport()/MarkAbsentees, but distinguishes leave
     * types and marks pre-join / future workdays as "none" (no data).
     *
     * @param  \Illuminate\Support\Collection<string,Attendance>  $attendances
     * @param  array<string,string>  $leaveMap
     * @param  \Illuminate\Support\Collection<string,bool>  $holidays
     * @param  array<string,bool>  $offMap
     */
    private function matrixCell(
        User $user,
        string $ds,
        $attendances,
        array $leaveMap,
        $holidays,
        array $offMap,
        string $todayStr,
    ): string {
        $attendance = $attendances->get($user->id.'|'.$ds);
        $leaveType = $leaveMap[$user->id.'|'.$ds] ?? null;
        $isNonWorkday = Carbon::parse($ds)->isWeekend() || $holidays->has($ds);

        // Actually clocked in → reflect present even if also flagged on leave/off.
        if ($attendance && $attendance->status === AttendanceStatus::Present) {
            return $attendance->status->value;
        }

        // Within an off period → "off" overrides leave / holiday / auto-marked absence.
        if (isset($offMap[$user->id.'|'.$ds])) {
            return 'off';
        }

        // Approved leave → label by its specific type.
        if ($leaveType !== null) {
            return match ($leaveType) {
                LeaveType::Annual->value => 'leave_annual',
                LeaveType::Sick->value => 'leave_sick',
                // Unpaid ("Cuti Potong Gaji") is folded into "Izin" in the recap.
                LeaveType::Unpaid->value => 'leave_emergency',
                default => 'leave_annual',
            };
        }

        // Recorded permit (no matching leave row) / holiday / explicit absent.
        if ($attendance) {
            return match ($attendance->status) {
                AttendanceStatus::Permit => 'leave_emergency',
                AttendanceStatus::Holiday => 'holiday',
                AttendanceStatus::Absent => $isNonWorkday ? 'holiday' : 'absent',
                default => 'absent',
            };
        }

        // No record at all.
        if ($isNonWorkday) {
            return 'holiday';
        }

        // Workday with no data: outside the employee's employment window → none.
        if ($user->joined_at && $ds < $user->joined_at->toDateString()) {
            return 'none';
        }
        if ($ds > $todayStr) {
            return 'none';
        }

        return 'absent';
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
}
