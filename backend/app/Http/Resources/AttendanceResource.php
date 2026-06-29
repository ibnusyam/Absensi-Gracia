<?php

namespace App\Http\Resources;

use App\Http\Resources\Concerns\FormatsTimestamps;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class AttendanceResource extends JsonResource
{
    use FormatsTimestamps;

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'date' => $this->displayDate($this->date),
            'clock_in_at' => $this->displayDateTime($this->clock_in_at),
            'clock_out_at' => $this->displayDateTime($this->clock_out_at),
            'location_id' => $this->location_id,
            'clock_in_lat' => $this->clock_in_lat !== null ? (float) $this->clock_in_lat : null,
            'clock_in_lng' => $this->clock_in_lng !== null ? (float) $this->clock_in_lng : null,
            'clock_out_lat' => $this->clock_out_lat !== null ? (float) $this->clock_out_lat : null,
            'clock_out_lng' => $this->clock_out_lng !== null ? (float) $this->clock_out_lng : null,
            'selfie_url' => $this->selfie_path ? Storage::disk('public')->url($this->selfie_path) : null,
            'selfie_out_url' => $this->selfie_out_path ? Storage::disk('public')->url($this->selfie_out_path) : null,
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'note' => $this->note,
            'location' => new WorkLocationResource($this->whenLoaded('location')),
            'user' => new UserResource($this->whenLoaded('user')),
        ];
    }
}
