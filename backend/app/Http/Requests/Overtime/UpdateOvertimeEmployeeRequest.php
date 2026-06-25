<?php

namespace App\Http\Requests\Overtime;

use App\Enums\CompensationType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Admin correction of a single overtime employee row: planned schedule, actual
 * clocked times, and/or compensation type. All fields optional (partial update);
 * authorization and status rules are enforced in OvertimeService.
 */
class UpdateOvertimeEmployeeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'planned_start_at' => ['sometimes', 'nullable', 'date'],
            'planned_end_at' => ['sometimes', 'nullable', 'date', 'after:planned_start_at'],
            'clock_in_at' => ['sometimes', 'nullable', 'date'],
            'clock_out_at' => ['sometimes', 'nullable', 'date', 'after:clock_in_at'],
            'compensation_type' => ['sometimes', Rule::enum(CompensationType::class)],
        ];
    }
}
