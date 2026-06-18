<?php

namespace Database\Seeders;

use App\Enums\RoleSlug;
use App\Models\Department;
use App\Models\LeaveQuota;
use App\Models\Role;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $roles = Role::pluck('id', 'slug');
        $departments = Department::pluck('id', 'name');
        $itDept = $departments['Teknologi Informasi'];
        $hrDept = $departments['Sumber Daya Manusia'];

        // ---- Fixed accounts (predictable logins, password = "password") ----
        $superAdmin = $this->makeUser('Super Admin', 'superadmin@sky.test', $roles[RoleSlug::SuperAdmin->value], $itDept);
        $hrd = $this->makeUser('Hesti HRD', 'hrd@sky.test', $roles[RoleSlug::Hrd->value], $hrDept);
        $direktur = $this->makeUser('Dewi Direktur', 'direktur@sky.test', $roles[RoleSlug::Direktur->value], $hrDept);

        // One Admin Bagian per department.
        $adminByDept = [];
        foreach ($departments as $name => $deptId) {
            $slug = str($name)->slug();
            $adminByDept[$deptId] = $this->makeUser(
                "Admin {$name}",
                "admin.{$slug}@sky.test",
                $roles[RoleSlug::AdminBagian->value],
                $deptId,
            );
        }

        // 10 employees spread across departments.
        $deptIds = array_values($departments->toArray());
        $employees = collect(range(1, 10))->map(function ($i) use ($roles, $deptIds) {
            return User::factory()->create([
                'name' => fake()->name(),
                'email' => "karyawan{$i}@sky.test",
                'password' => Hash::make('password'),
                'role_id' => $roles[RoleSlug::Karyawan->value],
                'department_id' => $deptIds[($i - 1) % count($deptIds)],
            ]);
        });

        // Department managers: HRD manages HR, admins manage their departments.
        Department::where('id', $hrDept)->update(['manager_user_id' => $hrd->id]);
        foreach ($adminByDept as $deptId => $admin) {
            Department::where('id', $deptId)->whereNull('manager_user_id')
                ->update(['manager_user_id' => $admin->id]);
        }

        // Leave quotas for the current year for everyone.
        $year = now()->setTimezone(config('services.display_timezone'))->year;
        User::all()->each(function (User $user) use ($year) {
            LeaveQuota::updateOrCreate(
                ['user_id' => $user->id, 'year' => $year],
                ['total_days' => 12, 'used_days' => 0, 'remaining_days' => 12],
            );
        });
    }

    private function makeUser(string $name, string $email, int $roleId, int $deptId): User
    {
        return User::factory()->create([
            'name' => $name,
            'email' => $email,
            'password' => Hash::make('password'),
            'role_id' => $roleId,
            'department_id' => $deptId,
        ]);
    }
}
