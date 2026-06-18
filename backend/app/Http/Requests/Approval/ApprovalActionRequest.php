<?php

namespace App\Http\Requests\Approval;

use App\Enums\ApprovalAction;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ApprovalActionRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'action' => ['required', Rule::enum(ApprovalAction::class)],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
