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
        // Money-compensation pay tiers (1.5×/2×/3×), annotated by the controller's
        // show() for the detail view. Null/absent in list contexts.
        $rawTiers = is_array($this->pay_tiers) ? $this->pay_tiers : [];
        $payTiers = [];
        $weighted = 0.0;
        foreach ($rawTiers as $multiplier => $hours) {
            $payTiers[] = ['multiplier' => (float) $multiplier, 'hours' => (float) $hours];
            $weighted += (float) $hours * (float) $multiplier;
        }

        return [
            'id' => $this->id,
            'overtime_request_id' => $this->overtime_request_id,
            'user_id' => $this->user_id,
            'planned_start_at' => $this->displayDateTime($this->planned_start_at),
            'planned_end_at' => $this->displayDateTime($this->planned_end_at),
            'compensation_type' => $this->compensation_type->value,
            'compensation_label' => $this->compensation_type->label(),
            'leave_days_credited' => (float) $this->leave_days_credited,
            'is_holiday' => is_bool($this->is_holiday) ? $this->is_holiday : null,
            'pay_tiers' => $payTiers,
            'weighted_hours' => $payTiers === [] ? null : round($weighted, 2),
            'user' => new UserResource($this->whenLoaded('user')),
            'session' => new OvertimeSessionResource($this->whenLoaded('session')),
        ];
    }
}
