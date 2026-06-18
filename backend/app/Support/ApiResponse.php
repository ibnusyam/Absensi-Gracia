<?php

namespace App\Support;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Pagination\AbstractPaginator;

/**
 * Shared helpers that produce the application's standard JSON envelopes:
 *   success:    { success, message, data }
 *   paginated:  { success, message, data, meta }
 *   error:      { success, message, errors? }
 */
trait ApiResponse
{
    protected function respondSuccess(mixed $data = null, string $message = 'OK', int $status = 200): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => $message,
            'data' => $data,
        ], $status);
    }

    protected function respondCreated(mixed $data = null, string $message = 'Created'): JsonResponse
    {
        return $this->respondSuccess($data, $message, 201);
    }

    protected function respondError(string $message, int $status = 400, ?array $errors = null): JsonResponse
    {
        $payload = [
            'success' => false,
            'message' => $message,
        ];

        if ($errors !== null) {
            $payload['errors'] = $errors;
        }

        return response()->json($payload, $status);
    }

    /**
     * Wrap a paginated resource collection (or LengthAwarePaginator) into the
     * standard envelope, lifting pagination details into `meta`.
     */
    protected function respondPaginated(
        AnonymousResourceCollection|AbstractPaginator $paginated,
        string $message = 'OK'
    ): JsonResponse {
        if ($paginated instanceof AnonymousResourceCollection) {
            $resource = $paginated->resource;
            $data = $paginated->resolve();
        } else {
            $resource = $paginated;
            $data = $paginated->items();
            $data = JsonResource::collection($data)->resolve();
        }

        return response()->json([
            'success' => true,
            'message' => $message,
            'data' => $data,
            'meta' => [
                'current_page' => $resource->currentPage(),
                'last_page' => $resource->lastPage(),
                'per_page' => $resource->perPage(),
                'total' => $resource->total(),
            ],
        ]);
    }
}
