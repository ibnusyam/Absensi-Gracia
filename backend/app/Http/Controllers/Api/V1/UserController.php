<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\LeaveQuotaResource;
use App\Http\Resources\LeaveRequestResource;
use App\Http\Resources\OvertimeRequestResource;
use App\Http\Resources\UserResource;
use App\Models\LeaveQuota;
use App\Models\LeaveRequest;
use App\Models\OvertimeRequest;
use App\Models\User;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

class UserController extends Controller
{
    use ApiResponse;

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = User::with(['role', 'department'])->orderBy('name');

        // Admin Bagian is locked to their own department, no matter what is requested.
        if ($user->isAdminBagian()) {
            $query->where('department_id', $user->department_id);
        }

        $query->when($request->filled('department_id'), fn ($q) => $q->where('department_id', $request->integer('department_id')))
            ->when($request->filled('role_id'), fn ($q) => $q->where('role_id', $request->integer('role_id')))
            ->when($request->filled('is_active'), fn ($q) => $q->where('is_active', $request->boolean('is_active')))
            ->when($request->filled('search'), function ($q) use ($request) {
                $term = '%'.$request->string('search').'%';
                $q->where(fn ($sub) => $sub->where('name', 'like', $term)
                    ->orWhere('email', 'like', $term)
                    ->orWhere('employee_id', 'like', $term));
            });

        $paginated = $query->paginate($request->integer('per_page', 15));

        return $this->respondPaginated(UserResource::collection($paginated));
    }

    /**
     * Employee detail: biodata + leave quota + leave & overtime history.
     */
    public function show(Request $request, User $user): JsonResponse
    {
        $actor = $request->user();

        // Admin Bagian may only inspect employees in their own department.
        if ($actor->isAdminBagian() && $user->department_id !== $actor->department_id) {
            throw new AccessDeniedHttpException('Anda hanya dapat melihat karyawan di departemen Anda.');
        }

        $user->load(['role', 'department']);

        $year = (int) now()->setTimezone(config('services.display_timezone'))->year;
        $quota = LeaveQuota::firstWhere(['user_id' => $user->id, 'year' => $year]);

        $leaves = LeaveRequest::where('user_id', $user->id)->latest()->limit(50)->get();

        $overtimes = OvertimeRequest::with(['department', 'requester', 'employees.user', 'employees.session'])
            ->whereHas('employees', fn ($q) => $q->where('user_id', $user->id))
            ->latest()
            ->limit(50)
            ->get();

        return $this->respondSuccess([
            'user' => new UserResource($user),
            'leave_quota' => $quota ? new LeaveQuotaResource($quota) : null,
            'leave_requests' => LeaveRequestResource::collection($leaves),
            'overtime_requests' => OvertimeRequestResource::collection($overtimes),
        ], 'OK');
    }
}
