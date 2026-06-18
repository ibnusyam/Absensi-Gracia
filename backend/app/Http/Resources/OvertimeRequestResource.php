<?php

namespace App\Http\Resources;

use App\Http\Resources\Concerns\FormatsTimestamps;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OvertimeRequestResource extends JsonResource
{
    use FormatsTimestamps;

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'requested_by' => $this->requested_by,
            'department_id' => $this->department_id,
            'overtime_date' => $this->displayDate($this->overtime_date),
            'planned_start' => $this->planned_start,
            'planned_end' => $this->planned_end,
            'reason' => $this->reason,
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'created_at' => $this->displayDateTime($this->created_at),
            'requester' => new UserResource($this->whenLoaded('requester')),
            'department' => new DepartmentResource($this->whenLoaded('department')),
            'employees' => OvertimeRequestEmployeeResource::collection($this->whenLoaded('employees')),
            'approval_logs' => ApprovalLogResource::collection($this->whenLoaded('approvalLogs')),
        ];
    }
}
