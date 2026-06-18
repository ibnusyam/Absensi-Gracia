<?php

namespace Database\Seeders;

use App\Enums\ApprovalAction;
use App\Enums\ApprovalStage;
use App\Enums\OvertimeStatus;
use App\Enums\RoleSlug;
use App\Models\ApprovalLog;
use App\Models\OvertimeRequest;
use App\Models\OvertimeRequestEmployee;
use App\Models\OvertimeSession;
use App\Models\User;
use App\Services\OvertimeService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

/**
 * Seeds overtime requests covering every stage of the flow so the feature can be
 * inspected end-to-end. Uses the real OvertimeService so hours and the tiered
 * pay calculation (spec §3.4) are genuinely exercised, not faked.
 *
 * Scenarios created (for one department):
 *   A. Pending           — menunggu approval HRD.
 *   B. Disetujui HRD      — menunggu approval Direktur.
 *   C. Disetujui penuh    — sesi kosong, siap di-clock-in karyawan.
 *   D. Disetujui penuh    — satu sesi sedang berjalan (clock-in saja).
 *   E. Disetujui penuh    — selesai di hari KERJA  (tarif 1,5× / 2×).
 *   F. Disetujui penuh    — selesai di hari LIBUR  (tarif 2× / 3×).
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

        $employees = $this->employeesIn($admin->department_id);
        $pair = $employees->take(2);          // 2 employees for batch scenarios
        $one = $employees->take(1);           // 1 employee for the "running" scenario

        $service = app(OvertimeService::class);

        // Recent weekday (for workday tier) and most recent Saturday (for holiday tier).
        $workday = now($tz)->copy();
        while ($workday->isWeekend()) {
            $workday->subDay();
        }
        $holiday = now($tz)->copy()->previous(Carbon::SATURDAY);

        // A. Pending — awaiting HRD.
        $this->build($service, $admin, $pair, $workday, '17:00', '20:00', 'Kejar target rilis sprint.');

        // B. Approved by HRD — awaiting Director.
        $reqB = $this->build($service, $admin, $pair, $workday, '18:00', '21:00', 'Maintenance server malam.');
        $this->stampApproval($reqB, $hrd, ApprovalStage::Hrd, OvertimeStatus::ApprovedByHrd);

        // C. Fully approved, sessions still empty — ready for an employee to clock in.
        $reqC = $this->build($service, $admin, $pair, $workday, '17:30', '20:30', 'Persiapan demo klien besok.');
        $this->fullyApprove($reqC, $hrd, $direktur);

        // D. Fully approved, one session currently running (clock-in only).
        $reqD = $this->build($service, $admin, $one, $workday, '17:00', '19:30', 'Perbaikan bug produksi.');
        $this->fullyApprove($reqD, $hrd, $direktur);
        $this->clockInOnly($reqD, 90); // started 1.5 hours ago

        // E. Fully approved, completed on a WORKDAY (~2.5h → 1,5× first hour, 2× rest).
        $reqE = $this->build($service, $admin, $pair, $workday, '17:00', '20:00', 'Stock opname akhir bulan.');
        $this->fullyApprove($reqE, $hrd, $direktur);
        $this->clockOut($service, $reqE, 2.5);

        // F. Fully approved, completed on a HOLIDAY/weekend (~9h → 2× first 8h, 3× rest).
        $reqF = $this->build($service, $admin, $pair, $holiday, '08:00', '17:00', 'Lembur akhir pekan pemeliharaan.');
        $this->fullyApprove($reqF, $hrd, $direktur);
        $this->clockOut($service, $reqF, 9.0);

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

    /** Create a pending request (with empty sessions) via the real service. */
    private function build(
        OvertimeService $service,
        User $admin,
        $employees,
        Carbon $date,
        string $start,
        string $end,
        string $reason,
    ): OvertimeRequest {
        return $service->create($admin, [
            'overtime_date' => $date->toDateString(),
            'planned_start' => $start,
            'planned_end' => $end,
            'reason' => $reason,
            'employee_ids' => $employees->pluck('id')->all(),
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
     * Complete all sessions of a request by setting clock-in to N hours ago, then
     * running the real sessionClockOut so total_hours + tiered pay are computed.
     */
    private function clockOut(OvertimeService $service, OvertimeRequest $request, float $hours): void
    {
        $request->load(['employees.user', 'employees.session']);

        foreach ($request->employees as $employee) {
            $session = $employee->session;
            if (! $session || ! $employee->user) {
                continue;
            }

            $session->clock_in_at = now()->subMinutes((int) round($hours * 60));
            $session->save();

            $service->sessionClockOut($session, $employee->user);
        }
    }

    /** Remove previously seeded overtime data so the seeder is re-runnable. */
    private function cleanup(): void
    {
        $morph = (new OvertimeRequest)->getMorphClass();
        ApprovalLog::where('approvable_type', $morph)->delete();

        OvertimeSession::query()->delete();
        OvertimeRequestEmployee::query()->delete();
        OvertimeRequest::query()->delete();
    }
}
