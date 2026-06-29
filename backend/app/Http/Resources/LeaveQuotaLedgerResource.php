<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class LeaveQuotaLedgerResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            // Signed change in available days (+ added, - used).
            'delta' => (float) $this->delta,
            // Remaining balance right after this change.
            'balance' => (float) $this->balance,
            'reason' => $this->reason,
            'created_at' => optional($this->created_at)->toIso8601String(),
        ];
    }
}
