<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Requests\Overtime\StoreOvertimeRequest;
use App\Http\Requests\Overtime\UpdateOvertimeEmployeeRequest;
use App\Enums\OvertimeStatus;
use App\Http\Resources\OvertimeRequestEmployeeResource;
use App\Http\Resources\OvertimeRequestResource;
use App\Models\OvertimeRequest;
use App\Models\OvertimeRequestEmployee;
use App\Services\OvertimeService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OvertimeRequestController extends Controller
{
    use ApiResponse;

    public function __construct(
        private readonly OvertimeService $overtimeService,
    ) {
    }

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = OvertimeRequest::with(['requester', 'department', 'employees.user', 'employees.session'])
            ->latest();

        // Default ("mine"): Admin Bagian sees what they created, everyone else sees
        // requests they take part in. The all-employees monitoring view opts in with
        // scope=all and is limited to approver/super-admin.
        $wantsAll = $request->string('scope')->value() === 'all'
            && ($user->isApprover() || $user->hasRole('super-admin'));

        if (! $wantsAll) {
            if ($user->isAdminBagian()) {
                $query->where('requested_by', $user->id);
            } else {
                $query->whereHas('employees', fn ($q) => $q->where('user_id', $user->id));
            }
        }

        // Pengajuan bucket: only requests still moving through approval.
        $query->when(
            $request->boolean('in_process') && ! $request->filled('status'),
            fn ($q) => $q->whereIn('status', [OvertimeStatus::Pending, OvertimeStatus::ApprovedByHrd]),
        );

        $query->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->when($request->filled('department_id'), fn ($q) => $q->where('department_id', $request->integer('department_id')))
            ->when($request->filled('date_from'), fn ($q) => $q->whereDate('overtime_date', '>=', $request->date('date_from')))
            ->when($request->filled('date_to'), fn ($q) => $q->whereDate('overtime_date', '<=', $request->date('date_to')));

        $paginated = $query->paginate($request->integer('per_page', 15));

        return $this->respondPaginated(OvertimeRequestResource::collection($paginated));
    }

    public function store(StoreOvertimeRequest $request): JsonResponse
    {
        $overtime = $this->overtimeService->create($request->user(), $request->validated());

        return $this->respondCreated(new OvertimeRequestResource($overtime), 'Pengajuan lembur dibuat.');
    }

    public function show(OvertimeRequest $overtimeRequest): JsonResponse
    {
        $overtimeRequest->load([
            'requester',
            'department',
            'employees.user',
            'employees.session',
            'approvalLogs.approver',
        ]);

        return $this->respondSuccess(new OvertimeRequestResource($overtimeRequest), 'OK');
    }

    /**
     * Admin correction of one employee's overtime row (planned schedule, actual
     * clocked times, compensation type) — allowed even after full approval.
     */
    public function updateEmployee(
        UpdateOvertimeEmployeeRequest $request,
        OvertimeRequestEmployee $overtimeRequestEmployee,
    ): JsonResponse {
        $pivot = $this->overtimeService->adminUpdateEmployee(
            $overtimeRequestEmployee,
            $request->user(),
            $request->validated(),
        );

        return $this->respondSuccess(
            new OvertimeRequestEmployeeResource($pivot),
            'Data lembur karyawan diperbarui.',
        );
    }
}
