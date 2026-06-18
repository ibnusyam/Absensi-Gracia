<?php

namespace App\Console\Commands;

use App\Enums\AttendanceStatus;
use App\Enums\LeaveStatus;
use App\Models\Attendance;
use App\Models\HolidayCalendar;
use App\Models\LeaveRequest;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

class MarkAbsentees extends Command
{
    protected $signature = 'attendance:mark-absentees
        {--date= : Target date (Y-m-d), defaults to today in display timezone}';

    protected $description = 'Mark active employees with no attendance record as absent (skips weekends, holidays, approved leave)';

    public function handle(): int
    {
        $tz = config('services.display_timezone');
        $date = $this->option('date')
            ? Carbon::parse($this->option('date'), $tz)
            : now()->setTimezone($tz);

        $dateString = $date->toDateString();

        if ($date->isWeekend()) {
            $this->info("{$dateString} is a weekend — nothing to do.");

            return self::SUCCESS;
        }

        if (HolidayCalendar::whereDate('date', $dateString)->exists()) {
            $this->info("{$dateString} is a holiday — nothing to do.");

            return self::SUCCESS;
        }

        // Users who already have an attendance row for the date.
        $hasAttendance = Attendance::whereDate('date', $dateString)->pluck('user_id')->flip();

        // Users on approved leave covering the date.
        $onLeave = LeaveRequest::where('status', LeaveStatus::Approved)
            ->whereDate('start_date', '<=', $dateString)
            ->whereDate('end_date', '>=', $dateString)
            ->pluck('user_id')
            ->flip();

        $marked = 0;

        User::where('is_active', true)->chunkById(200, function ($users) use ($dateString, $hasAttendance, $onLeave, &$marked) {
            foreach ($users as $user) {
                if ($hasAttendance->has($user->id)) {
                    continue;
                }

                $status = $onLeave->has($user->id) ? AttendanceStatus::Permit : AttendanceStatus::Absent;

                Attendance::create([
                    'user_id' => $user->id,
                    'date' => $dateString,
                    'status' => $status,
                    'note' => $status === AttendanceStatus::Permit ? 'Cuti disetujui' : 'Ditandai otomatis oleh sistem',
                ]);

                $marked++;
            }
        });

        $this->info("Marked {$marked} employee(s) for {$dateString}.");

        return self::SUCCESS;
    }
}
