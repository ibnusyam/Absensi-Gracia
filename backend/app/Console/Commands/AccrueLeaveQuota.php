<?php

namespace App\Console\Commands;

use App\Enums\AttendanceStatus;
use App\Enums\Jenjang;
use App\Models\Attendance;
use App\Models\LeaveQuota;
use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

class AccrueLeaveQuota extends Command
{
    protected $signature = 'leave:accrue
        {--days=1 : Number of days to accrue per qualifying employee}
        {--min-present=20 : Outsourcing must be present on MORE than this many days in the cycle}
        {--year= : Target year override (defaults to the cycle end year)}
        {--as-of= : Reference date the run happens on (defaults to today). Used to derive the 21->20 cycle.}';

    protected $description = 'Accrue leave quota for the completed 21->20 attendance cycle';

    public function handle(): int
    {
        $tz = config('services.display_timezone');
        $asOf = $this->option('as-of')
            ? Carbon::parse($this->option('as-of'), $tz)
            : now()->setTimezone($tz);

        // Our office cycle runs the 21st of a month to the 20th of the next.
        // The just-completed cycle ends on the most recent 20th before today.
        $end = $asOf->day > 20
            ? $asOf->copy()->startOfMonth()->day(20)
            : $asOf->copy()->subMonthNoOverflow()->startOfMonth()->day(20);
        $start = $end->copy()->subMonthNoOverflow()->addDay(); // the 21st of the prior month

        $days = (int) $this->option('days');
        $minPresent = (int) $this->option('min-present');
        $year = (int) ($this->option('year') ?: $end->year);

        $this->info("Siklus {$start->toDateString()} s/d {$end->toDateString()} -> kuota tahun {$year}.");

        $karyawan = 0;
        $outsourcingPaid = 0;
        $outsourcingSkipped = 0;

        User::where('is_active', true)->chunkById(200, function ($users) use (
            $start, $end, $days, $minPresent, $year, &$karyawan, &$outsourcingPaid, &$outsourcingSkipped
        ) {
            foreach ($users as $user) {
                $jenjang = $user->jenjang ?? Jenjang::Karyawan;

                if ($jenjang === Jenjang::Outsourcing) {
                    // Present (Hadir + Terlambat) days within the cycle.
                    $present = Attendance::where('user_id', $user->id)
                        ->whereIn('status', [AttendanceStatus::Present, AttendanceStatus::Late])
                        ->whereBetween('date', [$start->toDateString(), $end->toDateString()])
                        ->count();

                    if ($present <= $minPresent) {
                        $outsourcingSkipped++;

                        continue; // did not reach >20 days masuk
                    }

                    $outsourcingPaid++;
                } else {
                    $karyawan++;
                }

                $quota = LeaveQuota::firstOrCreate(
                    ['user_id' => $user->id, 'year' => $year],
                    ['total_days' => 0, 'used_days' => 0, 'remaining_days' => 0],
                );

                $quota->total_days += $days;
                $quota->syncRemaining();
                $quota->save();
            }
        });

        $this->info("Akrual {$days} hari: karyawan {$karyawan}, outsourcing memenuhi {$outsourcingPaid}, outsourcing tidak memenuhi {$outsourcingSkipped}.");

        return self::SUCCESS;
    }
}
