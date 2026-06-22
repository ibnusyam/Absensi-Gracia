<?php

namespace App\Enums;

enum AttendanceStatus: string
{
    case Present = 'present';
    case Late = 'late';
    case Absent = 'absent';
    case Permit = 'permit';
    case Holiday = 'holiday';
    case Off = 'off';

    public function label(): string
    {
        return match ($this) {
            self::Present => 'Hadir',
            self::Late => 'Terlambat',
            self::Absent => 'Alpha',
            self::Permit => 'Izin',
            self::Holiday => 'Libur',
            self::Off => 'Off',
        };
    }
}
