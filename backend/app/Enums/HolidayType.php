<?php

namespace App\Enums;

enum HolidayType: string
{
    case National = 'national';
    case Company = 'company';

    public function label(): string
    {
        return match ($this) {
            self::National => 'Libur Nasional',
            self::Company => 'Libur Perusahaan',
        };
    }
}
