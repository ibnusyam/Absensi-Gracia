<?php

namespace Database\Seeders;

use App\Models\WorkSchedule;
use Illuminate\Database\Seeder;

class WorkScheduleSeeder extends Seeder
{
    public function run(): void
    {
        // Single global schedule. Update the existing row in place (rather than
        // keying on name) so re-seeding never leaves a stale duplicate behind —
        // lateness logic reads WorkSchedule::first().
        $schedule = WorkSchedule::query()->orderBy('id')->first() ?? new WorkSchedule();

        $schedule->fill([
            'name' => 'Reguler 07:30 - 16:00',
            'clock_in_start' => '06:00:00',   // boleh clock-in mulai jam 6 (yang masuk lebih awal)
            'clock_in_deadline' => '07:30:00', // batas masuk
            'late_tolerance_minutes' => 0,     // tanpa toleransi: telat jika clock-in lewat 07:30
            'clock_out_time' => '16:00:00',
        ])->save();
    }
}
