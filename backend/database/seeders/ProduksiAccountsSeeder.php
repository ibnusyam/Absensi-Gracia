<?php

namespace Database\Seeders;

use App\Enums\RoleSlug;
use App\Models\Department;
use App\Models\LeaveQuota;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class ProduksiAccountsSeeder extends Seeder
{
    /**
     * Akun operasional departemen Produksi:
     * - 1 Admin Bagian (rini) + 5 karyawan (Karyawan 1..5).
     * Idempotent: aman dijalankan ulang (updateOrCreate by email).
     */
    public function run(): void
    {
        $roles = Role::pluck('id', 'slug');
        $produksiId = Department::where('name', 'Produksi')->value('id');

        if ($produksiId === null) {
            $this->command->error('Departemen "Produksi" tidak ditemukan. Jalankan DepartmentSeeder dulu.');

            return;
        }

        // Admin Bagian "rini" untuk Produksi.
        $rini = $this->makeUser(
            'Rini',
            'rini@gracia.co.id',
            $roles[RoleSlug::AdminBagian->value],
            $produksiId,
            'PRD-RINI',
        );

        // 5 karyawan Produksi: "Karyawan 1".."Karyawan 5".
        $users = collect([$rini]);
        foreach (range(1, 5) as $i) {
            $users->push($this->makeUser(
                "Karyawan {$i}",
                "karyawan{$i}@gracia.co.id",
                $roles[RoleSlug::Karyawan->value],
                $produksiId,
                sprintf('PRD-%03d', $i),
            ));
        }

        // Jatah cuti tahun berjalan supaya pengajuan cuti berfungsi.
        $year = now()->setTimezone(config('services.display_timezone'))->year;
        $users->each(function (User $user) use ($year) {
            $quota = LeaveQuota::updateOrCreate(
                ['user_id' => $user->id, 'year' => $year],
                ['total_days' => 12, 'used_days' => 0, 'remaining_days' => 12],
            );
            $quota->ledgers()->delete();
            $quota->logChange(12, "Kuota awal tahun {$year}");
        });

        $this->command->info('Akun Produksi siap: rini@gracia.co.id + karyawan1..5@gracia.co.id (password: "password").');
    }

    private function makeUser(string $name, string $email, int $roleId, int $deptId, string $employeeId): User
    {
        return User::updateOrCreate(
            ['email' => $email],
            [
                'name' => $name,
                'password' => Hash::make('password'),
                'role_id' => $roleId,
                'department_id' => $deptId,
                'employee_id' => $employeeId,
                'is_active' => true,
                'email_verified_at' => now(),
            ],
        );
    }
}
