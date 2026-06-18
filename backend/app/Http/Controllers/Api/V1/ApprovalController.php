<?php

namespace App\Http\Controllers\Api\V1;

use App\Enums\ApprovalAction;
use App\Http\Controllers\Controller;
use App\Http\Requests\Approval\ApprovalActionRequest;
use App\Http\Resources\LeaveRequestResource;
use App\Http\Resources\OvertimeRequestResource;
use App\Models\LeaveRequest;
use App\Models\OvertimeRequest;
use App\Services\ApprovalService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

class ApprovalController extends Controller
{
    use ApiResponse;

    public function __construct(
        private readonly ApprovalService $approvalService,
    ) {
    }

    public function pending(Request $request): JsonResponse
    {
        $pending = $this->approvalService->pendingFor($request->user());

        return $this->respondSuccess([
            'overtime' => OvertimeRequestResource::collection($pending['overtime'])->resolve(),
            'leave' => LeaveRequestResource::collection($pending['leave'])->resolve(),
        ], 'OK');
    }

    public function act(ApprovalActionRequest $request, string $type, int $id): JsonResponse
    {
        $approvable = match ($type) {
            'overtime' => OvertimeRequest::findOrFail($id),
            'leave' => LeaveRequest::findOrFail($id),
            default => throw new NotFoundHttpException('Tipe approval tidak dikenal.'),
        };

        $result = $this->approvalService->act(
            $approvable,
            $request->user(),
            ApprovalAction::from($request->string('action')->value()),
            $request->input('notes'),
        );

        $resource = $result instanceof OvertimeRequest
            ? new OvertimeRequestResource($result)
            : new LeaveRequestResource($result);

        return $this->respondSuccess($resource, 'Approval diproses.');
    }
}
