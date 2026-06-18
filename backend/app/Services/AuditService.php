<?php

namespace App\Services;

use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Request;

class AuditService
{
    /**
     * Record an audit entry for a model change.
     */
    public function record(
        string $event,
        Model $auditable,
        ?array $oldData = null,
        ?array $newData = null,
    ): AuditLog {
        return AuditLog::create([
            'user_id' => Auth::id(),
            'auditable_type' => $auditable->getMorphClass(),
            'auditable_id' => $auditable->getKey(),
            'event' => $event,
            'old_data' => $oldData,
            'new_data' => $newData,
            'ip_address' => Request::ip(),
        ]);
    }

    public function created(Model $auditable): AuditLog
    {
        return $this->record('created', $auditable, null, $auditable->getAttributes());
    }

    public function updated(Model $auditable, array $oldData): AuditLog
    {
        return $this->record('updated', $auditable, $oldData, $auditable->getAttributes());
    }

    public function deleted(Model $auditable): AuditLog
    {
        return $this->record('deleted', $auditable, $auditable->getAttributes(), null);
    }
}
