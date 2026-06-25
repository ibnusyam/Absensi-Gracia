<?php

namespace App\Models;

use App\Enums\CompensationType;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class OvertimeRequestEmployee extends Model
{
    use HasFactory;

    protected $fillable = [
        'overtime_request_id',
        'user_id',
        'planned_start_at',
        'planned_end_at',
        'compensation_type',
        'leave_days_credited',
    ];

    protected function casts(): array
    {
        return [
            'planned_start_at' => 'datetime',
            'planned_end_at' => 'datetime',
            'compensation_type' => CompensationType::class,
            'leave_days_credited' => 'decimal:1',
        ];
    }

    public function overtimeRequest(): BelongsTo
    {
        return $this->belongsTo(OvertimeRequest::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function session(): HasOne
    {
        return $this->hasOne(OvertimeSession::class);
    }
}
