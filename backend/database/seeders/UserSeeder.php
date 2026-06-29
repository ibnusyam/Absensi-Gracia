<?php

namespace Database\Seeders;

use App\Enums\Jenjang;
use App\Enums\RoleSlug;
use App\Models\Department;
use App\Models\LeaveQuota;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Faker-free demo users (safe to run on production, where fakerphp is absent).
 *
 * Builds a coherent Indonesian org:
 *   - Fixed super-admin logins: superadmin@sky.test & ibnu@gracia.co.id.
 *   - HRD + Direktur.
 *   - One Admin Bagian per department.
 *   - A curated list of karyawan spread across departments, each with a rich
 *     profile so the detail page is fully populated.
 *
 * All passwords are "password".
 */
class UserSeeder extends Seeder
{
    public function run(): void
    {
        $roles = Role::pluck('id', 'slug');
        $departments = Department::pluck('id', 'name');
        $itDept = $departments['Teknologi Informasi'];
        $hrDept = $departments['Sumber Daya Manusia'];

        // ---- Fixed accounts (predictable logins, password = "password") ----
        $this->makeUser('Super Admin', 'superadmin@sky.test', $roles[RoleSlug::SuperAdmin->value], $itDept, 'SKY-001');
        $this->makeUser('Ibnu Syambodo', 'ibnu@gracia.co.id', $roles[RoleSlug::SuperAdmin->value], $itDept, 'SKY-002');
        $hrd = $this->makeUser('Hesti Wulandari', 'hrd@sky.test', $roles[RoleSlug::Hrd->value], $hrDept, 'SKY-010');
        $this->makeUser('Dewi Anggraini', 'direktur@sky.test', $roles[RoleSlug::Direktur->value], $hrDept, 'SKY-011');

        // One Admin Bagian per department.
        $adminByDept = [];
        $adminNo = 1;
        foreach ($departments as $name => $deptId) {
            $slug = Str::slug($name);
            $adminByDept[$deptId] = $this->makeUser(
                "Admin {$name}",
                "admin.{$slug}@sky.test",
                $roles[RoleSlug::AdminBagian->value],
                $deptId,
                'ADM-'.str_pad((string) $adminNo++, 3, '0', STR_PAD_LEFT),
            );
        }

        // Curated karyawan. Departments referenced by name so they stay in sync
        // with DepartmentSeeder. The first three become "outsourcing" for the
        // jenjang demo (handled by JenjangDemoSeeder).
        $karyawan = [
            ['Budi Santoso', 'Produksi', 'L', 'Islam', 'SMA', '-'],
            ['Siti Nurhaliza', 'Produksi', 'P', 'Islam', 'SMK', 'Farmasi'],
            ['Ahmad Fauzi', 'Produksi', 'L', 'Islam', 'D3', 'Teknik Kimia'],
            ['Dewi Lestari', 'Quality Control', 'P', 'Kristen', 'S1', 'Farmasi'],
            ['Rian Hidayat', 'Quality Control', 'L', 'Islam', 'S1', 'Kimia'],
            ['Putri Maharani', 'Quality Control', 'P', 'Hindu', 'D3', 'Analis Kimia'],
            ['Eko Prasetyo', 'Gudang', 'L', 'Islam', 'SMA', '-'],
            ['Wulan Sari', 'Gudang', 'P', 'Islam', 'SMK', 'Logistik'],
            ['Agus Setiawan', 'Marketing', 'L', 'Kristen', 'S1', 'Manajemen'],
            ['Maya Anggraini', 'Marketing', 'P', 'Islam', 'S1', 'Komunikasi'],
            ['Fajar Nugroho', 'Keuangan', 'L', 'Islam', 'S1', 'Akuntansi'],
            ['Indah Permata', 'Keuangan', 'P', 'Katolik', 'D3', 'Akuntansi'],
            ['Rizki Ramadhan', 'Teknologi Informasi', 'L', 'Islam', 'S1', 'Informatika'],
            ['Nani Suryani', 'Sumber Daya Manusia', 'P', 'Islam', 'S1', 'Psikologi'],
        ];

        $kota = ['Jakarta', 'Bandung', 'Surabaya', 'Semarang', 'Yogyakarta', 'Bekasi', 'Depok', 'Bogor'];
        $jabatan = ['Staff', 'Operator', 'Senior Staff', 'Pelaksana'];

        foreach ($karyawan as $i => [$name, $deptName, $gender, $agama, $pendidikan, $jurusan]) {
            $no = $i + 1;
            $this->makeEmployee([
                'name' => $name,
                'email' => 'karyawan'.$no.'@sky.test',
                'role_id' => $roles[RoleSlug::Karyawan->value],
                'department_id' => $departments[$deptName],
                'employee_id' => 'EMP-'.str_pad((string) $no, 3, '0', STR_PAD_LEFT),
                'phone' => '0812'.str_pad((string) (3340000 + $no * 137), 8, '0', STR_PAD_LEFT),
                'joined_at' => now()->subYears(($i % 5) + 1)->subMonths($i % 11)->toDateString(),
                'jenis_kelamin' => $gender,
                'agama' => $agama,
                'pendidikan' => $pendidikan,
                'jurusan' => $jurusan === '-' ? null : $jurusan,
                'tempat_lahir' => $kota[$i % count($kota)],
                'tanggal_lahir' => Carbon::create(1985 + ($i % 15), ($i % 12) + 1, ($i % 27) + 1)->toDateString(),
                'alamat' => 'Jl. Melati No. '.($no * 3).', '.$kota[$i % count($kota)],
                'no_ktp' => '32'.str_pad((string) (71010000000000 + $no * 7654321), 14, '0', STR_PAD_LEFT),
                'status_pernikahan' => $i % 3 === 0 ? 'Belum Menikah' : 'Menikah',
                'jumlah_tanggungan' => $i % 4,
                'nama_jabatan' => $jabatan[$i % count($jabatan)].' '.$deptName,
                'status_karir' => 'Tetap',
            ]);
        }

        // Department managers: HRD manages HR, admins manage their departments.
        Department::where('id', $hrDept)->update(['manager_user_id' => $hrd->id]);
        foreach ($adminByDept as $deptId => $admin) {
            Department::where('id', $deptId)->whereNull('manager_user_id')
                ->update(['manager_user_id' => $admin->id]);
        }

        // Leave quotas for the current year for everyone.
        $year = now()->setTimezone(config('services.display_timezone'))->year;
        User::all()->each(function (User $user) use ($year) {
            $quota = LeaveQuota::updateOrCreate(
                ['user_id' => $user->id, 'year' => $year],
                ['total_days' => 12, 'used_days' => 0, 'remaining_days' => 12],
            );
            // Reset history then record the opening balance so the Riwayat Kuota
            // shows where the 12 days came from. Runs before Leave/Overtime
            // seeders, which append their own debit/credit lines.
            $quota->ledgers()->delete();
            $quota->logChange(12, "Kuota awal tahun {$year}");
        });
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
                'email_verified_at' => now(),
                'is_active' => true,
                'jenjang' => Jenjang::Karyawan->value,
                'joined_at' => now()->subYears(3)->toDateString(),
            ],
        );
    }

    /** @param  array<string,mixed>  $attributes */
    private function makeEmployee(array $attributes): User
    {
        return User::updateOrCreate(
            ['email' => $attributes['email']],
            array_merge([
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
                'is_active' => true,
                'jenjang' => Jenjang::Karyawan->value,
            ], $attributes),
        );
    }
}
