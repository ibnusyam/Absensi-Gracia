<?php

namespace App\Exceptions;

use Exception;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Thrown by Services when a business rule fails (e.g. outside geofence,
 * insufficient leave quota). Renders as the standard error envelope.
 * Defaults to HTTP 422 to mirror validation-style failures.
 */
class BusinessRuleException extends Exception
{
    public function __construct(
        string $message,
        protected int $status = 422,
        protected ?array $errors = null,
    ) {
        parent::__construct($message);
    }

    public static function make(string $message, int $status = 422, ?array $errors = null): self
    {
        return new self($message, $status, $errors);
    }

    public function render(Request $request): ?JsonResponse
    {
        if (! ($request->is('api/*') || $request->expectsJson())) {
            return null;
        }

        $payload = [
            'success' => false,
            'message' => $this->getMessage(),
        ];

        if ($this->errors !== null) {
            $payload['errors'] = $this->errors;
        }

        return response()->json($payload, $this->status);
    }
}
