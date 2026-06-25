<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            RoleSeeder::class,
            DepartmentSeeder::class,
            WorkLocationSeeder::class,
            WorkScheduleSeeder::class,
            HolidayCalendarSeeder::class,
            UserSeeder::class,
            AttendanceSeeder::class,
            OvertimeSeeder::class,
            LeaveSeeder::class,
            JenjangDemoSeeder::class,
        ]);
    }
}
