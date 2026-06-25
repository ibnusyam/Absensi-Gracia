<?php

namespace App\Enums;

/**
 * How an employee's overtime is compensated: paid out (money, via the hour-tier
 * recap) or converted into leave days credited to their annual quota.
 */
enum CompensationType: string
{
    case Money = 'money';
    case Leave = 'leave';

    public function label(): string
    {
        return match ($this) {
            self::Money => 'Ganti Uang',
            self::Leave => 'Ganti Hari',
        };
    }
}
