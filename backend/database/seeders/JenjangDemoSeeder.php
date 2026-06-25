<?php

namespace Database\Seeders;

use App\Enums\AttendanceStatus;
use App\Enums\Jenjang;
use App\Enums\RoleSlug;
use App\Models\Attendance;
use App\Models\HolidayCalendar;
use App\Models\User;
use App\Models\WorkLocation;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

/**
 * Demo data for the "jenjang" (employment tier) feature so the accrual rule is
 * visible end-to-end on a completed 21->20 cycle:
 *   - 2 outsourcing employees with near-perfect attendance  -> WILL accrue.
 *   - 1 outsourcing employee with many absences (<21 masuk)  -> WILL NOT accrue.
 *   - Everyone else stays "karyawan" (accrues unconditionally).
 *
 * Idempotent: only sets jenjang + overwrites these employees' cycle attendance.
 * It does NOT run the accrual itself (that is a one-shot scheduled job) so
 * re-seeding never inflates quotas. Run `php artisan leave:accrue` after seeding.
 */
class JenjangDemoSeeder extends Seeder
{
    public function run(): void
    {
        $tz = config('services.display_timezone');
        $location = WorkLocation::active()->first();

        $employees = User::whereHas('role', fn ($q) => $q->where('slug', RoleSlug::Karyawan->value))
            ->orderBy('id')
            ->get();

        if ($employees->count() < 4) {
            $this->command?->warn('JenjangDemoSeeder dilewati: butuh >=4 karyawan.');

            return;
        }

        // Reset everyone to karyawan first so re-runs stay deterministic.
        User::query()->update(['jenjang' => Jenjang::Karyawan->value]);

        $goodA = $employees[0];
        $goodB = $employees[1];
        $bad = $employees[2];

        foreach ([$goodA, $goodB, $bad] as $u) {
            $u->update(['jenjang' => Jenjang::Outsourcing->value]);
        }

        // Completed cycle ending on the most recent 20th.
        $today = now()->setTimezone($tz);
        $end = $today->day > 20
            ? $today->copy()->startOfMonth()->day(20)
            : $today->copy()->subMonthNoOverflow()->startOfMonth()->day(20);
        $start = $end->copy()->subMonthNoOverflow()->addDay();

        $holidays = HolidayCalendar::whereDate('date', '>=', $start->toDateString())
            ->whereDate('date', '<=', $end->toDateString())
            ->pluck('date')
            ->map(fn ($d) => Carbon::parse($d)->toDateString())
            ->flip();

        // Working days in the cycle (Mon-Sat counted, holidays excluded) so the
        // "good" outsourcing employees comfortably exceed the >20 threshold.
        $workingDays = [];
        for ($c = $start->copy(); $c->lte($end); $c->addDay()) {
            if ($c->isSunday() || $holidays->has($c->toDateString())) {
                continue;
            }
            $workingDays[] = $c->copy();
        }

        // GOOD employees: present every working day. BAD: only the first 12 days.
        $this->seedPresence($goodA, $workingDays, count($workingDays), $location);
        $this->seedPresence($goodB, $workingDays, count($workingDays), $location);
        $this->seedPresence($bad, $workingDays, 12, $location);

        $this->command?->info(sprintf(
            'JenjangDemoSeeder: outsourcing %s & %s hadir %d hari (memenuhi), %s hadir 12 hari (tidak). Siklus %s s/d %s. Jalankan: php artisan leave:accrue',
            $goodA->name, $goodB->name, count($workingDays), $bad->name,
            $start->toDateString(), $end->toDateString(),
        ));
    }

    /** Mark the user Present for the first $presentCount working days, Absent after. */
    private function seedPresence(User $user, array $workingDays, int $presentCount, ?WorkLocation $location): void
    {
        foreach ($workingDays as $i => $day) {
            if ($i < $presentCount) {
                $clockIn = $day->copy()->setTime(7, 5)->setTimezone('UTC');
                Attendance::updateOrCreate(
                    ['user_id' => $user->id, 'date' => $day->toDateString()],
                    [
                        'clock_in_at' => $clockIn,
                        'clock_out_at' => $clockIn->copy()->addHours(8)->addMinutes(30),
                        'location_id' => $location?->id,
                        'status' => AttendanceStatus::Present,
                        'late_minutes' => null,
                    ],
                );
            } else {
                Attendance::updateOrCreate(
                    ['user_id' => $user->id, 'date' => $day->toDateString()],
                    ['status' => AttendanceStatus::Absent, 'note' => 'Tanpa keterangan', 'clock_in_at' => null, 'clock_out_at' => null],
                );
            }
        }
    }
}
