<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A span during which an employee is "off" (dirumahkan / dinonaktifkan sementara).
 * Purely a reporting label — it does not block login or attendance. A null
 * end_date means the period is open-ended until the employee is reactivated.
 */
class EmployeeOffPeriod extends Model
{
    protected $fillable = [
        'user_id',
        'start_date',
        'end_date',
        'reason',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'end_date' => 'date',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /** Periods that cover the given date (inclusive; open-ended if end_date is null). */
    public function scopeCovering(Builder $query, string $date): Builder
    {
        return $query
            ->whereDate('start_date', '<=', $date)
            ->where(fn (Builder $q) => $q
                ->whereNull('end_date')
                ->orWhereDate('end_date', '>=', $date));
    }
}
