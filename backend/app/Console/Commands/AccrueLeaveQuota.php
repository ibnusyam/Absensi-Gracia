<?php

namespace App\Console\Commands;

use App\Models\LeaveQuota;
use App\Models\User;
use Illuminate\Console\Command;

class AccrueLeaveQuota extends Command
{
    protected $signature = 'leave:accrue
        {--days=1 : Number of days to accrue per active employee}
        {--year= : Target year (defaults to current display-timezone year)}';

    protected $description = 'Accrue monthly leave quota for every active employee';

    public function handle(): int
    {
        $days = (int) $this->option('days');
        $year = (int) ($this->option('year')
            ?: now()->setTimezone(config('services.display_timezone'))->year);

        $count = 0;

        User::where('is_active', true)->chunkById(200, function ($users) use ($days, $year, &$count) {
            foreach ($users as $user) {
                $quota = LeaveQuota::firstOrCreate(
                    ['user_id' => $user->id, 'year' => $year],
                    ['total_days' => 0, 'used_days' => 0, 'remaining_days' => 0],
                );

                $quota->total_days += $days;
                $quota->syncRemaining();
                $quota->save();

                $count++;
            }
        });

        $this->info("Accrued {$days} day(s) of leave quota for {$count} employee(s) in {$year}.");

        return self::SUCCESS;
    }
}
