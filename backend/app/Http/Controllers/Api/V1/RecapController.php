<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\LeaveStatus;
use App\Enums\OvertimeStatus;
use App\Http\Controllers\Controller;
use App\Http\Resources\LeaveRequestResource;
use App\Models\LeaveRequest;
use App\Models\OvertimeSession;
use App\Services\AttendanceService;
use App\Services\OvertimeService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

/**
 * Monthly recap of finalised records (separate from the in-process "Pengajuan"
 * inbox): approved leave for the month, and completed overtime with a breakdown
 * of hours per pay multiplier.
 */
class RecapController extends Controller
{
    use ApiResponse;

    public function __construct(
        private readonly OvertimeService $overtimeService,
        private readonly AttendanceService $attendanceService,
    ) {
    }

    /**
     * Attendance grid over a free date range: per-employee daily status codes
     * plus totals. Used by the HRD "Rekap Absensi" menu.
     */
    public function attendance(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after_or_equal:start_date'],
            'department_id' => ['nullable', 'integer', 'exists:departments,id'],
        ]);

        $tz = config('services.display_timezone');
        $start = Carbon::parse($validated['start_date'], $tz)->startOfDay();
        $end = Carbon::parse($validated['end_date'], $tz)->startOfDay();

        if ($start->diffInDays($end) > 92) {
            return $this->respondError('Rentang tanggal maksimal 92 hari.', 422);
        }

        $matrix = $this->attendanceService->attendanceMatrix(
            $start->toDateString(),
            $end->toDateString(),
            $validated['department_id'] ?? null,
        );

        $rows = array_map(fn (array $row) => [
            'user' => [
                'id' => $row['user']->id,
                'name' => $row['user']->name,
                'employee_id' => $row['user']->employee_id,
                'department_name' => $row['user']->department?->name,
            ],
            'cells' => $row['cells'],
            'totals' => $row['totals'],
        ], $matrix['rows']);

        return $this->respondSuccess([
            'period' => [
                'start_date' => $start->toDateString(),
                'end_date' => $end->toDateString(),
            ],
            'dates' => $matrix['dates'],
            'legend' => [
                'present' => 'Hadir',
                'late' => 'Terlambat',
                'leave_annual' => 'Cuti Tahunan',
                'leave_sick' => 'Sakit',
                'leave_emergency' => 'Izin',
                'absent' => 'Alpha',
                'holiday' => 'Libur',
                'none' => '-',
            ],
            'summary' => $matrix['summary'],
            'rows' => $rows,
        ], 'OK');
    }

    /** Approved leave overlapping the selected month. */
    public function leave(Request $request): JsonResponse
    {
        [$start, $end] = $this->monthRange($request);
        $departmentId = $request->integer('department_id');

        $leaves = LeaveRequest::with('user.department')
            ->where('status', LeaveStatus::Approved)
            // Overlaps the month: starts on/before month end AND ends on/after month start.
            ->whereDate('start_date', '<=', $end->toDateString())
            ->whereDate('end_date', '>=', $start->toDateString())
            ->when($departmentId, fn ($q) => $q->whereHas(
                'user',
                fn ($u) => $u->where('department_id', $departmentId),
            ))
            ->orderBy('start_date')
            ->get();

        return $this->respondSuccess([
            'period' => ['month' => (int) $start->month, 'year' => (int) $start->year],
            'summary' => [
                'total_requests' => $leaves->count(),
                'total_people' => $leaves->pluck('user_id')->unique()->count(),
                'total_days' => (int) $leaves->sum('total_days'),
            ],
            'data' => LeaveRequestResource::collection($leaves),
        ], 'OK');
    }

    /** Completed overtime sessions for the selected month, with tiered hour totals. */
    public function overtime(Request $request): JsonResponse
    {
        [$start, $end] = $this->monthRange($request);
        $departmentId = $request->integer('department_id');

        $sessions = OvertimeSession::query()
            ->whereNotNull('clock_out_at')
            ->whereHas('requestEmployee.overtimeRequest', function ($q) use ($start, $end, $departmentId) {
                $q->where('status', OvertimeStatus::ApprovedByDirector)
                    ->whereDate('overtime_date', '>=', $start->toDateString())
                    ->whereDate('overtime_date', '<=', $end->toDateString())
                    ->when($departmentId, fn ($qq) => $qq->where('department_id', $departmentId));
            })
            ->with(['requestEmployee.user.department', 'requestEmployee.overtimeRequest.department'])
            ->get();

        $hoursByMultiplier = [];
        $totalHours = 0.0;
        $rows = [];

        foreach ($sessions as $session) {
            $req = $session->requestEmployee->overtimeRequest;
            $isHoliday = $this->overtimeService->isHoliday($req->overtime_date);
            $hours = (float) $session->total_hours;
            $tiers = $this->overtimeService->tierHours($hours, $isHoliday);

            foreach ($tiers as $multiplier => $tierHours) {
                $hoursByMultiplier[$multiplier] = round(($hoursByMultiplier[$multiplier] ?? 0) + $tierHours, 2);
            }

            $totalHours += $hours;

            $rows[] = [
                'session_id' => $session->id,
                'overtime_date' => $req->overtime_date->toDateString(),
                'is_holiday' => $isHoliday,
                'employee_name' => $session->requestEmployee->user?->name,
                'department_name' => $req->department?->name,
                'total_hours' => $hours,
                'tiers' => $tiers,
            ];
        }

        // Sort tier keys numerically (1.5, 2, 3) for stable display.
        uksort($hoursByMultiplier, fn ($a, $b) => (float) $a <=> (float) $b);

        return $this->respondSuccess([
            'period' => ['month' => (int) $start->month, 'year' => (int) $start->year],
            'summary' => [
                'total_sessions' => count($rows),
                'total_employees' => collect($rows)->pluck('employee_name')->unique()->count(),
                'total_hours' => round($totalHours, 2),
                'hours_by_multiplier' => $hoursByMultiplier,
            ],
            'data' => $rows,
        ], 'OK');
    }

    /**
     * Resolve the [start, end] Carbon boundaries of the requested month, defaulting
     * to the current month in the display timezone.
     *
     * @return array{0: Carbon, 1: Carbon}
     */
    private function monthRange(Request $request): array
    {
        $tz = config('services.display_timezone');
        $now = now()->setTimezone($tz);

        $month = (int) $request->integer('month', $now->month);
        $year = (int) $request->integer('year', $now->year);
        $month = max(1, min(12, $month));

        $start = Carbon::create($year, $month, 1, 0, 0, 0, $tz)->startOfMonth();
        $end = $start->copy()->endOfMonth();

        return [$start, $end];
    }
}
