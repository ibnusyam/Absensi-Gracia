<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class WorkSchedule extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'clock_in_start',
        'clock_in_deadline',
        'late_tolerance_minutes',
        'clock_out_time',
    ];

    protected function casts(): array
    {
        return [
            'late_tolerance_minutes' => 'integer',
        ];
    }
}
