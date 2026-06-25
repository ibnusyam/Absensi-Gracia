<?php

namespace Database\Seeders;

use App\Enums\AttendanceStatus;
use App\Enums\RoleSlug;
use App\Models\Attendance;
use App\Models\HolidayCalendar;
use App\Models\User;
use App\Models\WorkLocation;
use App\Models\WorkSchedule;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

class AttendanceSeeder extends Seeder
{
    public function run(): void
    {
        $tz = config('services.display_timezone');
        $location = WorkLocation::active()->first();

        // Mirror the real lateness rule so seeded data matches the schedule.
        $schedule = WorkSchedule::first();
        $deadline = $schedule?->clock_in_deadline ?? '07:30:00';
        $tolerance = (int) ($schedule?->late_tolerance_minutes ?? 0);

        $users = User::whereHas('role', fn ($q) => $q->whereIn('slug', [
            RoleSlug::Karyawan->value,
            RoleSlug::AdminBagian->value,
        ]))->get();

        // Whole current month, from the 1st up to today (skip weekends & holidays).
        $today = now()->setTimezone($tz)->startOfDay();
        $cursor = $today->copy()->startOfMonth();

        $holidays = HolidayCalendar::whereDate('date', '>=', $cursor->toDateString())
            ->whereDate('date', '<=', $today->toDateString())
            ->pluck('date')
            ->map(fn ($d) => Carbon::parse($d)->toDateString())
            ->flip();

        for (; $cursor->lte($today); $cursor->addDay()) {
            if ($cursor->isWeekend() || $holidays->has($cursor->toDateString())) {
                continue;
            }
            $day = $cursor->copy();

            foreach ($users as $user) {
                // ~10% absent.
                if (random_int(1, 100) <= 10) {
                    Attendance::updateOrCreate(
                        ['user_id' => $user->id, 'date' => $day->toDateString()],
                        ['status' => AttendanceStatus::Absent, 'note' => 'Tanpa keterangan'],
                    );

                    continue;
                }

                $late = random_int(1, 100) <= 25;

                $deadlineLocal = Carbon::parse($day->toDateString().' '.$deadline, $tz);
                $threshold = $deadlineLocal->copy()->addMinutes($tolerance);

                if ($late) {
                    // Clock in after the tolerance threshold -> Terlambat.
                    $clockInLocal = $threshold->copy()->addMinutes(random_int(1, 80));
                    $lateMinutes = (int) $deadlineLocal->diffInMinutes($clockInLocal);
                } else {
                    // Clock in up to 40 minutes before the deadline -> Hadir.
                    $clockInLocal = $deadlineLocal->copy()->subMinutes(random_int(0, 40));
                    $lateMinutes = null;
                }

                $clockIn = $clockInLocal->copy()->setTimezone('UTC');
                $clockOut = (clone $clockIn)->addHours(8)->addMinutes(30 + random_int(0, 30));

                Attendance::updateOrCreate(
                    ['user_id' => $user->id, 'date' => $day->toDateString()],
                    [
                        'clock_in_at' => $clockIn,
                        'clock_out_at' => $clockOut,
                        'location_id' => $location?->id,
                        'clock_in_lat' => $location?->latitude,
                        'clock_in_lng' => $location?->longitude,
                        'status' => $late ? AttendanceStatus::Late : AttendanceStatus::Present,
                        'late_minutes' => $lateMinutes ? (int) $lateMinutes : null,
                    ],
                );
            }
        }
    }
}
