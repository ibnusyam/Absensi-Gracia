<?php

namespace App\Http\Resources;

use App\Http\Resources\Concerns\FormatsTimestamps;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

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
            'clock_in_lat' => $this->clock_in_lat !== null ? (float) $this->clock_in_lat : null,
            'clock_in_lng' => $this->clock_in_lng !== null ? (float) $this->clock_in_lng : null,
            'clock_out_lat' => $this->clock_out_lat !== null ? (float) $this->clock_out_lat : null,
            'clock_out_lng' => $this->clock_out_lng !== null ? (float) $this->clock_out_lng : null,
            'selfie_url' => $this->selfie_path ? Storage::disk('public')->url($this->selfie_path) : null,
            'selfie_out_url' => $this->selfie_out_path ? Storage::disk('public')->url($this->selfie_out_path) : null,
        ];
    }
}
