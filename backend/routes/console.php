<?php

use App\Console\Commands\AccrueLeaveQuota;
use App\Console\Commands\MarkAbsentees;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Accrue 1 leave day to every active employee on the first day of each month.
Schedule::command(AccrueLeaveQuota::class)
    ->monthlyOn(1, '00:05')
    ->timezone(config('services.display_timezone'));

// Mark absentees at the end of each working day.
Schedule::command(MarkAbsentees::class)
    ->dailyAt('23:30')
    ->weekdays()
    ->timezone(config('services.display_timezone'));
