<?php

namespace App\Console\Commands;

use App\Enums\LeaveStatus;
use App\Enums\LeaveType;
use App\Models\LeaveQuota;
use App\Models\LeaveQuotaLedger;
use App\Models\LeaveRequest;
use App\Models\OvertimeRequestEmployee;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Reconstruct an approximate quota history for quotas that predate the ledger
 * feature: an opening balance, one credit per overtime "ganti hari", and one
 * debit per approved annual leave. Idempotent — quotas that already have ledger
 * rows are left untouched.
 */
class BackfillLeaveQuotaLedger extends Command
{
    protected $signature = 'leave:backfill-ledger {--fresh : Wipe existing ledger rows and rebuild all}';

    protected $description = 'Reconstruct leave quota history for quotas created before the ledger existed';

    public function handle(): int
    {
        $tz = config('services.display_timezone');

        if ($this->option('fresh')) {
            LeaveQuotaLedger::query()->delete();
            $this->warn('Semua riwayat kuota lama dihapus, membangun ulang.');
        }

        $built = 0;
        $skipped = 0;

        LeaveQuota::with('user')->chunkById(100, function ($quotas) use ($tz, &$built, &$skipped) {
            foreach ($quotas as $quota) {
                if ($quota->ledgers()->exists()) {
                    $skipped++;

                    continue;
                }

                $events = $this->collectEvents($quota, $tz);
                $overtimeCredits = array_sum(array_map(fn ($e) => max($e['delta'], 0) > 0 && $e['kind'] === 'overtime' ? $e['delta'] : 0, $events));

                // Opening balance so the running total ends at remaining_days.
                $opening = round((float) $quota->total_days - $overtimeCredits, 1);

                // Sort the real events chronologically; opening always comes first.
                usort($events, fn ($a, $b) => $a['date']->timestamp <=> $b['date']->timestamp);

                DB::transaction(function () use ($quota, $opening, $events) {
                    $balance = $opening;
                    $this->insert($quota, $quota->created_at ?? now(), $opening, "Saldo awal kuota tahun {$quota->year}", null);

                    foreach ($events as $e) {
                        $balance = round($balance + $e['delta'], 1);
                        $this->insert($quota, $e['date'], $e['delta'], $e['reason'], $e['source'], $balance);
                    }
                });

                $built++;
            }
        });

        $this->info("Riwayat dibangun untuk {$built} kuota, dilewati {$skipped} (sudah ada riwayat).");

        return self::SUCCESS;
    }

    /** @return array<int, array{date: Carbon, delta: float, reason: string, source: ?\Illuminate\Database\Eloquent\Model, kind: string}> */
    private function collectEvents(LeaveQuota $quota, string $tz): array
    {
        $events = [];

        // Credits from overtime converted to leave days ("ganti hari").
        $pivots = OvertimeRequestEmployee::with(['overtimeRequest', 'session'])
            ->where('user_id', $quota->user_id)
            ->where('leave_days_credited', '>', 0)
            ->get();

        foreach ($pivots as $pivot) {
            $rawStart = $pivot->planned_start_at
                ?? $pivot->session?->clock_in_at
                ?? $pivot->overtimeRequest?->overtime_date;
            if (! $rawStart) {
                continue;
            }
            $start = ($rawStart instanceof Carbon ? $rawStart->copy() : Carbon::parse($rawStart))->setTimezone($tz);
            if ($start->year !== (int) $quota->year) {
                continue;
            }
            $events[] = [
                'date' => $start,
                'delta' => (float) $pivot->leave_days_credited,
                'reason' => "Kompensasi lembur ganti hari ({$start->format('d/m/Y')})",
                'source' => $pivot->overtimeRequest,
                'kind' => 'overtime',
            ];
        }

        // Debits from approved annual leave (the only quota-consuming type).
        $leaves = LeaveRequest::with('approvalLogs')
            ->where('user_id', $quota->user_id)
            ->where('type', LeaveType::Annual)
            ->where('status', LeaveStatus::Approved)
            ->get()
            ->filter(fn (LeaveRequest $l) => (int) Carbon::parse($l->start_date)->year === (int) $quota->year);

        foreach ($leaves as $leave) {
            $when = $leave->approvalLogs->sortByDesc('acted_at')->first()?->acted_at
                ?? $leave->updated_at
                ?? Carbon::parse($leave->start_date);
            $start = Carbon::parse($leave->start_date)->format('d/m/Y');
            $end = Carbon::parse($leave->end_date)->format('d/m/Y');
            $range = $start === $end ? $start : "{$start} s/d {$end}";
            $events[] = [
                'date' => $when instanceof Carbon ? $when : Carbon::parse($when),
                'delta' => -(float) $leave->total_days,
                'reason' => "Cuti disetujui ({$range})",
                'source' => $leave,
                'kind' => 'leave',
            ];
        }

        return $events;
    }

    private function insert(
        LeaveQuota $quota,
        Carbon $date,
        float $delta,
        string $reason,
        $source,
        ?float $balance = null,
    ): void {
        $entry = new LeaveQuotaLedger([
            'leave_quota_id' => $quota->id,
            'delta' => round($delta, 1),
            'balance' => $balance ?? round((float) $delta, 1),
            'reason' => $reason,
            'source_type' => $source?->getMorphClass(),
            'source_id' => $source?->getKey(),
        ]);
        $entry->forceFill(['created_at' => $date, 'updated_at' => $date]);
        $entry->timestamps = false;
        $entry->save();
    }
}
