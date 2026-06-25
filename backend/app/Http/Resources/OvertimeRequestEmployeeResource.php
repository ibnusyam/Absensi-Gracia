<?php

namespace App\Http\Resources;

use App\Http\Resources\Concerns\FormatsTimestamps;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OvertimeRequestEmployeeResource extends JsonResource
{
    use FormatsTimestamps;

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'overtime_request_id' => $this->overtime_request_id,
            'user_id' => $this->user_id,
            'planned_start_at' => $this->displayDateTime($this->planned_start_at),
            'planned_end_at' => $this->displayDateTime($this->planned_end_at),
            'compensation_type' => $this->compensation_type->value,
            'compensation_label' => $this->compensation_type->label(),
            'leave_days_credited' => (float) $this->leave_days_credited,
            'user' => new UserResource($this->whenLoaded('user')),
            'session' => new OvertimeSessionResource($this->whenLoaded('session')),
        ];
    }
}
