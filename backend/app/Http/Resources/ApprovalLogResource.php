<?php

namespace App\Http\Resources;

use App\Enums\ApprovalStage;
use App\Http\Resources\Concerns\FormatsTimestamps;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ApprovalLogResource extends JsonResource
{
    use FormatsTimestamps;

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'stage' => $this->stage,
            'stage_label' => ApprovalStage::tryFrom($this->stage)?->label(),
            'approver_id' => $this->approver_id,
            'approver' => new UserResource($this->whenLoaded('approver')),
            'action' => $this->action->value,
            'action_label' => $this->action->label(),
            'notes' => $this->notes,
            'acted_at' => $this->displayDateTime($this->acted_at),
        ];
    }
}
