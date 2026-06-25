<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LeaveQuotaResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'user_id' => $this->user_id,
            'year' => (int) $this->year,
            // Cast to float: the decimal:1 model cast yields a string otherwise.
            'total_days' => (float) $this->total_days,
            'used_days' => (float) $this->used_days,
            'remaining_days' => (float) $this->remaining_days,
        ];
    }
}
