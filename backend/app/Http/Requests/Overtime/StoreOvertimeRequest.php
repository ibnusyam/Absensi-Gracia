<?php

namespace App\Http\Requests\Overtime;

use Illuminate\Foundation\Http\FormRequest;

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
            'planned_start' => ['required', 'date_format:H:i'],
            'planned_end' => ['required', 'date_format:H:i', 'after:planned_start'],
            'reason' => ['required', 'string', 'max:1000'],
            'employee_ids' => ['required', 'array', 'min:1'],
            'employee_ids.*' => ['integer', 'distinct', 'exists:users,id'],
        ];
    }
}
