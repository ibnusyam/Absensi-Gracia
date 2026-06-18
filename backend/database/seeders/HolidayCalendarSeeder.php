<?php

namespace Database\Seeders;

use App\Enums\HolidayType;
use App\Models\HolidayCalendar;
use Illuminate\Database\Seeder;

class HolidayCalendarSeeder extends Seeder
{
    public function run(): void
    {
        $year = now()->setTimezone(config('services.display_timezone'))->year;

        $holidays = [
            ["{$year}-01-01", 'Tahun Baru Masehi', HolidayType::National],
            ["{$year}-05-01", 'Hari Buruh', HolidayType::National],
            ["{$year}-08-17", 'Hari Kemerdekaan RI', HolidayType::National],
            ["{$year}-12-25", 'Hari Natal', HolidayType::National],
            ["{$year}-12-26", 'Cuti Bersama', HolidayType::Company],
        ];

        foreach ($holidays as [$date, $name, $type]) {
            HolidayCalendar::updateOrCreate(
                ['date' => $date],
                ['name' => $name, 'type' => $type],
            );
        }
    }
}
