<?php

namespace Database\Seeders;

use App\Enums\RoleSlug;
use App\Models\EmployeeOffPeriod;
use App\Models\User;
use Illuminate\Database\Seeder;

/**
 * Demo data for the "dirumahkan / nonaktif sementara" (off period) feature so it
 * has both a closed past period and an open-ended current one to inspect.
 * Faker-free and idempotent (clears prior demo rows first).
 */
class OffPeriodSeeder extends Seeder
{
    public function run(): void
    {
        $tz = config('services.display_timezone');
        $today = now()->setTimezone($tz)->startOfDay();

        $hrd = User::whereHas('role', fn ($q) => $q->where('slug', RoleSlug::Hrd->value))->first();

        $employees = User::whereHas('role', fn ($q) => $q->where('slug', RoleSlug::Karyawan->value))
            ->orderByDesc('id') // avoid the first three (jenjang outsourcing demo)
            ->take(2)
            ->get();

        if ($employees->count() < 2) {
            $this->command?->warn('OffPeriodSeeder dilewati: butuh >=2 karyawan.');

            return;
        }

        EmployeeOffPeriod::query()->delete();

        // A. Closed period in the past (sudah aktif kembali).
        EmployeeOffPeriod::create([
            'user_id' => $employees[0]->id,
            'start_date' => $today->copy()->subMonths(3)->toDateString(),
            'end_date' => $today->copy()->subMonths(2)->toDateString(),
            'reason' => 'Dirumahkan sementara (efisiensi shift).',
            'created_by' => $hrd?->id,
        ]);

        // B. Open-ended period, currently active (end_date null).
        EmployeeOffPeriod::create([
            'user_id' => $employees[1]->id,
            'start_date' => $today->copy()->subWeek()->toDateString(),
            'end_date' => null,
            'reason' => 'Cuti di luar tanggungan, menunggu konfirmasi.',
            'created_by' => $hrd?->id,
        ]);

        $this->command?->info('OffPeriodSeeder selesai: 1 periode selesai, 1 periode terbuka (aktif).');
    }
}
