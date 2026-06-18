<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\OvertimeSessionResource;
use App\Models\OvertimeSession;
use App\Services\OvertimeService;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OvertimeSessionController extends Controller
{
    use ApiResponse;

    public function __construct(
        private readonly OvertimeService $overtimeService,
    ) {
    }

    public function clockIn(Request $request, OvertimeSession $overtimeSession): JsonResponse
    {
        $session = $this->overtimeService->sessionClockIn($overtimeSession, $request->user());

        return $this->respondSuccess(new OvertimeSessionResource($session), 'Clock-in lembur berhasil.');
    }

    public function clockOut(Request $request, OvertimeSession $overtimeSession): JsonResponse
    {
        $session = $this->overtimeService->sessionClockOut($overtimeSession, $request->user());

        return $this->respondSuccess(new OvertimeSessionResource($session), 'Clock-out lembur berhasil.');
    }
}
