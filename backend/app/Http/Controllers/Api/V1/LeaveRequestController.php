<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\LeaveStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Leave\StoreLeaveRequest;
use App\Http\Resources\LeaveQuotaResource;
use App\Http\Resources\LeaveRequestResource;
use App\Models\LeaveRequest;
use App\Services\LeaveService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

class LeaveRequestController extends Controller
{
    use ApiResponse;

    public function __construct(
        private readonly LeaveService $leaveService,
    ) {
    }

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = LeaveRequest::with('user.department')->latest();

        // Default ("mine") returns only the caller's own requests — even for HRD,
        // whose personal Cuti page must stay personal. The all-employees monitoring
        // view explicitly opts in with scope=all and requires approver/super-admin.
        $wantsAll = $request->string('scope')->value() === 'all'
            && ($user->isApprover() || $user->hasRole('super-admin'));

        if ($wantsAll) {
            $query->when($request->filled('user_id'), fn ($q) => $q->where('user_id', $request->integer('user_id')))
                ->when($request->filled('department_id'), fn ($q) => $q->whereHas(
                    'user',
                    fn ($u) => $u->where('department_id', $request->integer('department_id')),
                ));
        } else {
            $query->where('user_id', $user->id);
        }

        // Pengajuan bucket: only requests still awaiting a decision.
        $query->when(
            $request->boolean('in_process') && ! $request->filled('status'),
            fn ($q) => $q->where('status', LeaveStatus::Pending),
        );

        $query->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->when($request->filled('type'), fn ($q) => $q->where('type', $request->string('type')))
            ->when($request->filled('date_from'), fn ($q) => $q->whereDate('start_date', '>=', $request->date('date_from')))
            ->when($request->filled('date_to'), fn ($q) => $q->whereDate('end_date', '<=', $request->date('date_to')));

        $paginated = $query->paginate($request->integer('per_page', 15));

        return $this->respondPaginated(LeaveRequestResource::collection($paginated));
    }

    public function store(StoreLeaveRequest $request): JsonResponse
    {
        $leave = $this->leaveService->create(
            $request->user(),
            $request->validated(),
            $request->file('attachment'),
        );

        return $this->respondCreated(new LeaveRequestResource($leave), 'Pengajuan cuti dibuat.');
    }

    public function show(Request $request, LeaveRequest $leaveRequest): JsonResponse
    {
        $this->authorizeView($request, $leaveRequest);

        $leaveRequest->load(['user', 'approvalLogs.approver']);

        return $this->respondSuccess(new LeaveRequestResource($leaveRequest), 'OK');
    }

    public function destroy(Request $request, LeaveRequest $leaveRequest): JsonResponse
    {
        $this->authorizeView($request, $leaveRequest);

        $leave = $this->leaveService->cancel($leaveRequest);

        return $this->respondSuccess(new LeaveRequestResource($leave), 'Pengajuan cuti dibatalkan.');
    }

    public function quota(Request $request): JsonResponse
    {
        $year = (int) now()->setTimezone(config('services.display_timezone'))->year;
        $quota = $this->leaveService->quotaFor($request->user(), $year);

        return $this->respondSuccess(new LeaveQuotaResource($quota), 'OK');
    }

    private function authorizeView(Request $request, LeaveRequest $leave): void
    {
        $user = $request->user();

        if ($leave->user_id !== $user->id && ! $user->isApprover() && ! $user->hasRole('super-admin')) {
            throw new AccessDeniedHttpException('Anda tidak berwenang atas pengajuan ini.');
        }
    }
}
