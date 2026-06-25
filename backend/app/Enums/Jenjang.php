<?php

namespace App\Enums;

/**
 * Employment tier governing how monthly leave quota accrues:
 *   - Karyawan: +1 day every cycle, unconditionally.
 *   - Outsourcing: +1 day only when present on >20 working days in the cycle.
 */
enum Jenjang: string
{
    case Karyawan = 'karyawan';
    case Outsourcing = 'outsourcing';

    public function label(): string
    {
        return match ($this) {
            self::Karyawan => 'Karyawan',
            self::Outsourcing => 'Outsourcing',
        };
    }
}
