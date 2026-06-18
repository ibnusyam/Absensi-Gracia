<?php

namespace App\Http\Resources;

use App\Http\Resources\Concerns\FormatsTimestamps;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OvertimeSessionResource extends JsonResource
{
    use FormatsTimestamps;

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'overtime_request_employee_id' => $this->overtime_request_employee_id,
            'clock_in_at' => $this->displayDateTime($this->clock_in_at),
            'clock_out_at' => $this->displayDateTime($this->clock_out_at),
            'total_hours' => $this->total_hours !== null ? (float) $this->total_hours : null,
        ];
    }
}
