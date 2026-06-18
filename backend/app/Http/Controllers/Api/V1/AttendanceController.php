<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Attendance\ClockInRequest;
use App\Http\Requests\Attendance\ClockOutRequest;
use App\Http\Requests\Attendance\IndexAttendanceRequest;
use App\Enums\AttendanceStatus;
use App\Http\Resources\AttendanceResource;
use App\Http\Resources\UserResource;
use App\Models\Attendance;
use App\Services\AttendanceService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class AttendanceController extends Controller
{
    use ApiResponse;

    public function __construct(
        private readonly AttendanceService $attendanceService,
    ) {
    }

    public function index(IndexAttendanceRequest $request): JsonResponse
    {
        $user = $request->user();

        $query = Attendance::with(['location', 'user'])->latest('date');

        // Employees can only see their own records; approvers/admins can filter.
        if (! $user->isApprover() && ! $user->hasAnyRole(['super-admin'])) {
            $query->where('user_id', $user->id);
        } elseif ($request->filled('user_id')) {
            $query->where('user_id', $request->integer('user_id'));
        }

        $query->when($request->filled('date_from'), fn ($q) => $q->whereDate('date', '>=', $request->date('date_from')))
            ->when($request->filled('date_to'), fn ($q) => $q->whereDate('date', '<=', $request->date('date_to')))
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')));

        $paginated = $query->paginate($request->integer('per_page', 15));

        return $this->respondPaginated(AttendanceResource::collection($paginated));
    }

    public function clockIn(ClockInRequest $request): JsonResponse
    {
        $attendance = $this->attendanceService->clockIn(
            $request->user(),
            (float) $request->input('latitude'),
            (float) $request->input('longitude'),
            $request->file('selfie'),
        );

        return $this->respondCreated(new AttendanceResource($attendance), 'Clock-in berhasil.');
    }

    public function clockOut(ClockOutRequest $request): JsonResponse
    {
        $attendance = $this->attendanceService->clockOut(
            $request->user(),
            (float) $request->input('latitude'),
            (float) $request->input('longitude'),
            $request->file('selfie'),
        );

        return $this->respondSuccess(new AttendanceResource($attendance), 'Clock-out berhasil.');
    }

    /**
     * Daily attendance report across all active employees (HR/admin view).
     */
    public function report(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'date' => ['nullable', 'date'],
            'department_id' => ['nullable', 'integer', 'exists:departments,id'],
        ]);

        $tz = config('services.display_timezone');
        $date = isset($validated['date'])
            ? Carbon::parse($validated['date'], $tz)->toDateString()
            : now()->setTimezone($tz)->toDateString();

        $report = $this->attendanceService->dailyReport(
            $request->user(),
            $date,
            $validated['department_id'] ?? null,
        );

        $rows = collect($report['rows'])->map(fn (array $row) => [
            'user' => new UserResource($row['user']),
            'status' => $row['status'],
            'status_label' => AttendanceStatus::from($row['status'])->label(),
            'attendance' => $row['attendance'] ? new AttendanceResource($row['attendance']) : null,
        ]);

        return $this->respondSuccess([
            'date' => $report['date'],
            'is_holiday' => $report['is_holiday'],
            'summary' => $report['summary'],
            'rows' => $rows,
        ], 'OK');
    }

    public function today(Request $request): JsonResponse
    {
        $attendance = $this->attendanceService->todayAttendance($request->user());

        return $this->respondSuccess(
            $attendance ? new AttendanceResource($attendance) : null,
            'OK',
        );
    }

    public function summary(Request $request): JsonResponse
    {
        $month = (int) $request->integer('month', (int) now()->setTimezone(config('services.display_timezone'))->month);
        $year = (int) $request->integer('year', (int) now()->setTimezone(config('services.display_timezone'))->year);

        $summary = $this->attendanceService->monthlySummary($request->user(), $month, $year);

        return $this->respondSuccess($summary, 'OK');
    }
}
