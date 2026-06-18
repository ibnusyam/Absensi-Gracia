<?php

namespace App\Enums;

enum LeaveType: string
{
    case Annual = 'annual';
    case Sick = 'sick';
    case Emergency = 'emergency';
    case Unpaid = 'unpaid';

    public function label(): string
    {
        return match ($this) {
            self::Annual => 'Cuti Tahunan',
            self::Sick => 'Sakit',
            self::Emergency => 'Darurat',
            self::Unpaid => 'Tanpa Bayaran',
        };
    }

    /** Whether this leave type draws down the annual quota. */
    public function consumesQuota(): bool
    {
        return $this === self::Annual;
    }
}
