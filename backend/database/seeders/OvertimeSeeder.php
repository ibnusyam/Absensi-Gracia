<?php

namespace Database\Seeders;

use App\Enums\ApprovalAction;
use App\Enums\ApprovalStage;
use App\Enums\OvertimeStatus;
use App\Enums\RoleSlug;
use App\Models\ApprovalLog;
use App\Models\LeaveQuota;
use App\Models\OvertimeRequest;
use App\Models\OvertimeRequestEmployee;
use App\Models\OvertimeSession;
use App\Models\User;
use App\Services\OvertimeService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

/**
 * Seeds overtime requests covering every stage AND every compensation type so the
 * feature can be inspected end-to-end. Each employee carries their own planned
 * start/end and compensation choice (uang / hari). Completed sessions run through
 * the real OvertimeService so hours, the tiered pay calc, and the "ganti hari"
 * leave-credit are genuinely exercised.
 *
 * Scenarios (current month, one department):
 *   A. Pending                       — menunggu approval HRD (waktu beda per karyawan).
 *   B. Disetujui HRD                 — menunggu approval Direktur.
 *   C. Disetujui penuh, sesi kosong  — campuran kompensasi uang & hari, siap clock-in.
 *   D. Disetujui penuh, berjalan     — satu sesi sedang clock-in.
 *   E. Selesai (HARI KERJA, uang)    — tarif 1,5× / 2×.
 *   F. Selesai (HARI LIBUR, uang)    — tarif 2× / 3×.
 *   G. Selesai (HARI LIBUR, hari)    — 8 jam → +2 hari cuti / karyawan.
 *   H. Selesai (HARI KERJA, hari)    — 4 jam → +0,5 hari cuti.
 */
class OvertimeSeeder extends Seeder
{
    public function run(): void
    {
        $tz = config('services.display_timezone');

        $hrd = User::whereHas('role', fn ($q) => $q->where('slug', RoleSlug::Hrd->value))->first();
        $direktur = User::whereHas('role', fn ($q) => $q->where('slug', RoleSlug::Direktur->value))->first();

        // Pick an admin-bagian whose department has at least 2 employees to batch.
        $admin = User::whereHas('role', fn ($q) => $q->where('slug', RoleSlug::AdminBagian->value))
            ->get()
            ->first(fn (User $a) => $this->employeesIn($a->department_id)->count() >= 2);

        if (! $admin || ! $hrd || ! $direktur) {
            $this->command?->warn('OvertimeSeeder dilewati: butuh admin-bagian (dengan ≥2 karyawan), HRD, dan Direktur.');

            return;
        }

        $this->cleanup();

        $employees = $this->employeesIn($admin->department_id)->values();
        $a = $employees[0];
        $b = $employees[1];

        $service = app(OvertimeService::class);

        // Recent weekday (workday tier) and most recent Saturday (holiday tier), both this month.
        $workday = now($tz)->copy();
        while ($workday->isWeekend()) {
            $workday->subDay();
        }
        $holiday = now($tz)->copy()->previous(Carbon::SATURDAY);

        // A. Pending — different start/end per employee (showcases per-person times).
        $this->build($service, $admin, $workday, 'Kejar target rilis sprint.', [
            ['user' => $a, 'start' => '17:00', 'end' => '20:00', 'comp' => 'money'],
            ['user' => $b, 'start' => '18:30', 'end' => '22:00', 'comp' => 'money'],
        ]);

        // B. Approved by HRD — awaiting Director.
        $reqB = $this->build($service, $admin, $workday, 'Maintenance server malam.', [
            ['user' => $a, 'start' => '18:00', 'end' => '21:00', 'comp' => 'money'],
            ['user' => $b, 'start' => '18:00', 'end' => '21:00', 'comp' => 'money'],
        ]);
        $this->stampApproval($reqB, $hrd, ApprovalStage::Hrd, OvertimeStatus::ApprovedByHrd);

        // C. Fully approved, sessions empty — mixed compensation, ready to clock in.
        $reqC = $this->build($service, $admin, $workday, 'Persiapan demo klien besok.', [
            ['user' => $a, 'start' => '17:30', 'end' => '20:30', 'comp' => 'money'],
            ['user' => $b, 'start' => '19:00', 'end' => '23:00', 'comp' => 'leave'],
        ]);
        $this->fullyApprove($reqC, $hrd, $direktur);

        // D. Fully approved, one session currently running (clock-in only).
        $reqD = $this->build($service, $admin, $workday, 'Perbaikan bug produksi.', [
            ['user' => $a, 'start' => '17:00', 'end' => '19:30', 'comp' => 'money'],
        ]);
        $this->fullyApprove($reqD, $hrd, $direktur);
        $this->clockInOnly($reqD, 90); // started 1.5 hours ago

        // E. Completed on a WORKDAY, paid (~2.5h → 1,5× first hour, 2× rest).
        $reqE = $this->build($service, $admin, $workday, 'Stock opname akhir bulan.', [
            ['user' => $a, 'start' => '17:00', 'end' => '19:30', 'comp' => 'money'],
            ['user' => $b, 'start' => '17:00', 'end' => '19:30', 'comp' => 'money'],
        ]);
        $this->fullyApprove($reqE, $hrd, $direktur);
        $this->complete($service, $reqE, 2.5);

        // F. Completed on a HOLIDAY, paid (~9h → 2× first 8h, 3× rest).
        $reqF = $this->build($service, $admin, $holiday, 'Lembur akhir pekan pemeliharaan.', [
            ['user' => $a, 'start' => '08:00', 'end' => '17:00', 'comp' => 'money'],
            ['user' => $b, 'start' => '08:00', 'end' => '17:00', 'comp' => 'money'],
        ]);
        $this->fullyApprove($reqF, $hrd, $direktur);
        $this->complete($service, $reqF, 9.0);

        // G. Completed on a HOLIDAY, "ganti hari" — 8h → +2 leave days each.
        $reqG = $this->build($service, $admin, $holiday, 'Lembur libur (ganti hari).', [
            ['user' => $a, 'start' => '08:00', 'end' => '16:00', 'comp' => 'leave'],
            ['user' => $b, 'start' => '08:00', 'end' => '16:00', 'comp' => 'leave'],
        ]);
        $this->fullyApprove($reqG, $hrd, $direktur);
        $this->complete($service, $reqG, 8.0);

        // H. Completed on a WORKDAY, "ganti hari" — 4h → +0,5 leave day.
        $reqH = $this->build($service, $admin, $workday, 'Lembur hari kerja (ganti hari).', [
            ['user' => $a, 'start' => '17:00', 'end' => '21:00', 'comp' => 'leave'],
        ]);
        $this->fullyApprove($reqH, $hrd, $direktur);
        $this->complete($service, $reqH, 4.0);

        $this->command?->info("OvertimeSeeder selesai untuk departemen #{$admin->department_id} (admin: {$admin->email}).");
    }

    /** Active karyawan belonging to a department. */
    private function employeesIn(?int $departmentId)
    {
        if (! $departmentId) {
            return collect();
        }

        return User::where('department_id', $departmentId)
            ->whereHas('role', fn ($q) => $q->where('slug', RoleSlug::Karyawan->value))
            ->get();
    }

    /**
     * Create a pending request (empty sessions) via the real service.
     *
     * @param  array<int,array{user:User,start:string,end:string,comp:string}>  $specs
     */
    private function build(OvertimeService $service, User $admin, Carbon $date, string $reason, array $specs): OvertimeRequest
    {
        $d = $date->toDateString();

        return $service->create($admin, [
            'overtime_date' => $d,
            'reason' => $reason,
            'employees' => array_map(fn (array $s) => [
                'user_id' => $s['user']->id,
                'planned_start_at' => "{$d} {$s['start']}",
                'planned_end_at' => "{$d} {$s['end']}",
                'compensation_type' => $s['comp'],
            ], $specs),
        ]);
    }

    private function fullyApprove(OvertimeRequest $request, User $hrd, User $direktur): void
    {
        $this->stampApproval($request, $hrd, ApprovalStage::Hrd, OvertimeStatus::ApprovedByHrd);
        $this->stampApproval($request, $direktur, ApprovalStage::Director, OvertimeStatus::ApprovedByDirector);
    }

    /** Advance status and record an approval log (mirrors ApprovalService, minus FCM). */
    private function stampApproval(
        OvertimeRequest $request,
        User $approver,
        ApprovalStage $stage,
        OvertimeStatus $status,
    ): void {
        $request->update(['status' => $status]);

        ApprovalLog::create([
            'approvable_type' => $request->getMorphClass(),
            'approvable_id' => $request->getKey(),
            'stage' => $stage->value,
            'approver_id' => $approver->id,
            'action' => ApprovalAction::Approved,
            'notes' => null,
            'acted_at' => now(),
        ]);
    }

    /** Mark one session as currently running (clock-in only, started N minutes ago). */
    private function clockInOnly(OvertimeRequest $request, int $minutesAgo): void
    {
        $session = $request->employees()->with('session')->first()?->session;
        if ($session) {
            $session->clock_in_at = now()->subMinutes($minutesAgo);
            $session->save();
        }
    }

    /**
     * Complete every session of a request: anchor the actual times to each
     * employee's planned start, set worked hours, then settle leave compensation
     * through the real service (credits "ganti hari" leave days).
     */
    private function complete(OvertimeService $service, OvertimeRequest $request, float $hours): void
    {
        $request->load(['employees.session']);

        foreach ($request->employees as $pivot) {
            $session = $pivot->session;
            if (! $session) {
                continue;
            }

            $start = $pivot->planned_start_at?->copy() ?? now()->subHours((int) $hours);
            $session->clock_in_at = $start;
            $session->clock_out_at = $start->copy()->addMinutes((int) round($hours * 60));
            $session->total_hours = $hours;
            $session->save();

            $service->settleLeaveCompensation($pivot->fresh(['overtimeRequest', 'session', 'user']));
        }
    }

    /**
     * Remove previously seeded overtime data so the seeder is re-runnable, first
     * reversing any leave days credited so quotas don't drift across re-runs.
     */
    private function cleanup(): void
    {
        OvertimeRequestEmployee::where('leave_days_credited', '>', 0)
            ->get()
            ->each(function (OvertimeRequestEmployee $pivot) {
                $year = ($pivot->planned_start_at ?? now())->year;
                $quota = LeaveQuota::where('user_id', $pivot->user_id)->where('year', $year)->first();
                if ($quota) {
                    $quota->total_days = (float) $quota->total_days - (float) $pivot->leave_days_credited;
                    $quota->syncRemaining();
                    $quota->save();
                }
            });

        $morph = (new OvertimeRequest)->getMorphClass();
        ApprovalLog::where('approvable_type', $morph)->delete();
        \App\Models\LeaveQuotaLedger::where('source_type', $morph)->delete();

        OvertimeSession::query()->delete();
        OvertimeRequestEmployee::query()->delete();
        OvertimeRequest::query()->delete();
    }
}
