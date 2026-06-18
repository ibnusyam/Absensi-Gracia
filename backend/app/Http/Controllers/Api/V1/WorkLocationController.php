<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\WorkLocationResource;
use App\Models\WorkLocation;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;

class WorkLocationController extends Controller
{
    use ApiResponse;

    public function index(): JsonResponse
    {
        $locations = WorkLocation::orderBy('name')->get();

        return $this->respondSuccess(WorkLocationResource::collection($locations)->resolve(), 'OK');
    }
}
