<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

/**
 * One immutable line in a leave quota's history: when the available balance
 * changed, by how much, and why (accrual, leave used, overtime "ganti hari").
 */
class LeaveQuotaLedger extends Model
{
    protected $fillable = [
        'leave_quota_id',
        'delta',
        'balance',
        'reason',
        'source_type',
        'source_id',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'delta' => 'decimal:1',
            'balance' => 'decimal:1',
        ];
    }

    public function quota(): BelongsTo
    {
        return $this->belongsTo(LeaveQuota::class, 'leave_quota_id');
    }

    public function source(): MorphTo
    {
        return $this->morphTo();
    }

    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
