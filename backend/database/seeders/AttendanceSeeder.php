<?php

namespace Database\Seeders;

use App\Enums\AttendanceStatus;
use App\Enums\RoleSlug;
use App\Models\Attendance;
use App\Models\HolidayCalendar;
use App\Models\User;
use App\Models\WorkLocation;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

class AttendanceSeeder extends Seeder
{
    public function run(): void
    {
        $tz = config('services.display_timezone');
        $location = WorkLocation::active()->first();

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

                // Clock in some time in the morning; everyone who shows up is Hadir.
                $clockInLocal = Carbon::parse($day->toDateString().' 07:00:00', $tz)
                    ->addMinutes(random_int(0, 90));
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
                        'status' => AttendanceStatus::Present,
                    ],
                );
            }
        }
    }
}
