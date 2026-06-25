<?php

namespace App\Http\Resources;

use App\Http\Resources\Concerns\FormatsTimestamps;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class LeaveRequestResource extends JsonResource
{
    use FormatsTimestamps;

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'type' => $this->type->value,
            'type_label' => $this->type->label(),
            'start_date' => $this->displayDate($this->start_date),
            'end_date' => $this->displayDate($this->end_date),
            'half_day' => (bool) $this->half_day,
            'total_days' => (float) $this->total_days,
            'reason' => $this->reason,
            'attachment_url' => $this->attachment_path ? Storage::disk('public')->url($this->attachment_path) : null,
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'created_at' => $this->displayDateTime($this->created_at),
            'user' => new UserResource($this->whenLoaded('user')),
            'approval_logs' => ApprovalLogResource::collection($this->whenLoaded('approvalLogs')),
        ];
    }
}
