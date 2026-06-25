<?php

namespace App\Http\Requests\Overtime;

use App\Enums\CompensationType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreOvertimeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'overtime_date' => ['required', 'date'],
            'reason' => ['required', 'string', 'max:1000'],
            // One request, many employees — each with their own planned schedule
            // (full datetime, may differ per person) and compensation choice.
            'employees' => ['required', 'array', 'min:1'],
            'employees.*.user_id' => ['required', 'integer', 'distinct', 'exists:users,id'],
            'employees.*.planned_start_at' => ['required', 'date'],
            'employees.*.planned_end_at' => ['required', 'date', 'after:employees.*.planned_start_at'],
            'employees.*.compensation_type' => ['required', Rule::enum(CompensationType::class)],
        ];
    }
}
