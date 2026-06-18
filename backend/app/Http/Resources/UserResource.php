<?php

namespace App\Http\Resources;

use App\Http\Resources\Concerns\FormatsTimestamps;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

class UserResource extends JsonResource
{
    use FormatsTimestamps;

    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'employee_id' => $this->employee_id,
            'phone' => $this->phone,
            'avatar_url' => $this->avatar_path ? Storage::disk('public')->url($this->avatar_path) : null,
            'joined_at' => $this->displayDate($this->joined_at),
            'is_active' => (bool) $this->is_active,
            'department_id' => $this->department_id,
            'role_id' => $this->role_id,
            'department' => new DepartmentResource($this->whenLoaded('department')),
            'role' => new RoleResource($this->whenLoaded('role')),
        ];
    }
}
