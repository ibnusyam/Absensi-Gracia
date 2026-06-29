<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LeaveQuota extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'year',
        'total_days',
        'used_days',
        'remaining_days',
    ];

    protected function casts(): array
    {
        return [
            'year' => 'integer',
            // Decimal to support half-days credited from overtime "ganti hari".
            'total_days' => 'decimal:1',
            'used_days' => 'decimal:1',
            'remaining_days' => 'decimal:1',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function ledgers(): HasMany
    {
        return $this->hasMany(LeaveQuotaLedger::class)->latest('id');
    }

    /** Recompute remaining_days from total/used. */
    public function syncRemaining(): void
    {
        $this->remaining_days = $this->total_days - $this->used_days;
    }

    /**
     * Record a history line for a change already applied & saved to this quota.
     * $delta is the signed change in remaining (available) days; the current
     * remaining_days is captured as the running balance.
     */
    public function logChange(
        float $delta,
        string $reason,
        ?Model $source = null,
        ?int $actorId = null,
    ): LeaveQuotaLedger {
        return $this->ledgers()->create([
            'delta' => round($delta, 1),
            'balance' => (float) $this->remaining_days,
            'reason' => $reason,
            'source_type' => $source?->getMorphClass(),
            'source_id' => $source?->getKey(),
            'created_by' => $actorId,
        ]);
    }
}
