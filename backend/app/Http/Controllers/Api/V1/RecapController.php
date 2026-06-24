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

    /** Approved leave overlapping the selected date range. */
    public function leave(Request $request): JsonResponse
    {
        [$start, $end] = $this->dateRange($request);
        $departmentId = $request->integer('department_id');

        $leaves = LeaveRequest::with('user.department')
            ->where('status', LeaveStatus::Approved)
            // Overlaps the range: starts on/before range end AND ends on/after range start.
            ->whereDate('start_date', '<=', $end->toDateString())
            ->whereDate('end_date', '>=', $start->toDateString())
            ->when($departmentId, fn ($q) => $q->whereHas(
                'user',
                fn ($u) => $u->where('department_id', $departmentId),
            ))
            ->orderBy('start_date')
            ->get();

        return $this->respondSuccess([
            'period' => ['start_date' => $start->toDateString(), 'end_date' => $end->toDateString()],
            'summary' => [
                'total_requests' => $leaves->count(),
                'total_people' => $leaves->pluck('user_id')->unique()->count(),
                'total_days' => (int) $leaves->sum('total_days'),
            ],
            'data' => LeaveRequestResource::collection($leaves),
        ], 'OK');
    }

    /**
     * Completed overtime over the selected date range, accumulated PER EMPLOYEE:
     * each employee's hours (and tiered breakdown) are summed across every session
     * in the range, with the individual sessions kept under `sessions` for drill-down.
     */
    public function overtime(Request $request): JsonResponse
    {
        [$start, $end] = $this->dateRange($request);
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
        $totalSessions = 0;
        /** @var array<int|string, array<string, mixed>> $employees keyed by user_id */
        $employees = [];

        foreach ($sessions as $session) {
            $req = $session->requestEmployee->overtimeRequest;
            $isHoliday = $this->overtimeService->isHoliday($req->overtime_date);
            $hours = (float) $session->total_hours;
            $tiers = $this->overtimeService->tierHours($hours, $isHoliday);
            $date = $req->overtime_date->toDateString();

            foreach ($tiers as $multiplier => $tierHours) {
                $hoursByMultiplier[$multiplier] = round(($hoursByMultiplier[$multiplier] ?? 0) + $tierHours, 2);
            }
            $totalHours += $hours;
            $totalSessions++;

            // Key by user_id; fall back to name for the (unexpected) null-user case.
            $userId = $session->requestEmployee->user_id;
            $key = $userId ?? 'name:'.($session->requestEmployee->user?->name ?? $session->id);

            if (! isset($employees[$key])) {
                $employees[$key] = [
                    'user_id' => $userId,
                    'employee_name' => $session->requestEmployee->user?->name,
                    'department_name' => $req->department?->name,
                    'total_hours' => 0.0,
                    'session_count' => 0,
                    'tiers' => [],
                    'dates' => [],
                    'sessions' => [],
                ];
            }

            $employees[$key]['total_hours'] = round($employees[$key]['total_hours'] + $hours, 2);
            $employees[$key]['session_count']++;
            $employees[$key]['dates'][$date] = true;
            foreach ($tiers as $multiplier => $tierHours) {
                $employees[$key]['tiers'][$multiplier] = round(($employees[$key]['tiers'][$multiplier] ?? 0) + $tierHours, 2);
            }
            $employees[$key]['sessions'][] = [
                'session_id' => $session->id,
                'overtime_date' => $date,
                'is_holiday' => $isHoliday,
                'total_hours' => $hours,
                'tiers' => $tiers,
            ];
        }

        // Finalise each employee row: count distinct days, sort tiers & sessions.
        $rows = [];
        foreach ($employees as $emp) {
            uksort($emp['tiers'], fn ($a, $b) => (float) $a <=> (float) $b);
            usort($emp['sessions'], fn ($a, $b) => strcmp($a['overtime_date'], $b['overtime_date']));
            $emp['day_count'] = count($emp['dates']);
            unset($emp['dates']);
            $rows[] = $emp;
        }

        // Stable display: employees A→Z, tier keys numerically (1.5, 2, 3).
        usort($rows, fn ($a, $b) => strcmp((string) $a['employee_name'], (string) $b['employee_name']));
        uksort($hoursByMultiplier, fn ($a, $b) => (float) $a <=> (float) $b);

        return $this->respondSuccess([
            'period' => ['start_date' => $start->toDateString(), 'end_date' => $end->toDateString()],
            'summary' => [
                'total_sessions' => $totalSessions,
                'total_employees' => count($rows),
                'total_hours' => round($totalHours, 2),
                'hours_by_multiplier' => $hoursByMultiplier,
            ],
            'data' => $rows,
        ], 'OK');
    }

    /**
     * Resolve the [start, end] Carbon boundaries of the requested free date range,
     * defaulting to the current month in the display timezone when omitted.
     *
     * @return array{0: Carbon, 1: Carbon}
     */
    private function dateRange(Request $request): array
    {
        $tz = config('services.display_timezone');
        $now = now()->setTimezone($tz);

        $request->validate([
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'department_id' => ['nullable', 'integer', 'exists:departments,id'],
        ]);

        $start = $request->filled('start_date')
            ? Carbon::parse($request->string('start_date'), $tz)->startOfDay()
            : $now->copy()->startOfMonth();

        $end = $request->filled('end_date')
            ? Carbon::parse($request->string('end_date'), $tz)->startOfDay()
            : $now->copy()->endOfMonth();

        return [$start, $end];
    }
}
