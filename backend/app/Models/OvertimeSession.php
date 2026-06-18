<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OvertimeSession extends Model
{
    use HasFactory;

    protected $fillable = [
        'overtime_request_employee_id',
        'clock_in_at',
        'clock_out_at',
        'total_hours',
    ];

    protected function casts(): array
    {
        return [
            'clock_in_at' => 'datetime',
            'clock_out_at' => 'datetime',
            'total_hours' => 'decimal:2',
        ];
    }

    public function requestEmployee(): BelongsTo
    {
        return $this->belongsTo(OvertimeRequestEmployee::class, 'overtime_request_employee_id');
    }
}
