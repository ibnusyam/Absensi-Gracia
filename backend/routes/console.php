<?php

use App\Console\Commands\AccrueLeaveQuota;
use App\Console\Commands\MarkAbsentees;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Accrue leave quota for the completed 21->20 office cycle, evaluated on the 21st.
// Karyawan: +1 unconditionally. Outsourcing: +1 only when present on >20 cycle days.
Schedule::command(AccrueLeaveQuota::class)
    ->monthlyOn(21, '00:05')
    ->timezone(config('services.display_timezone'));

// Mark absentees at the end of each working day.
Schedule::command(MarkAbsentees::class)
    ->dailyAt('23:30')
    ->weekdays()
    ->timezone(config('services.display_timezone'));
