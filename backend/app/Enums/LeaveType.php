<?php

namespace App\Enums;

enum LeaveType: string
{
    case Annual = 'annual';   // Cuti Ganti Hari — draws down the annual quota.
    case Unpaid = 'unpaid';   // Cuti Potong Gaji — leave without quota; recorded as salary-cutting.
    case Sick = 'sick';       // Izin/Sakit — cuts salary only for outsourcing staff.

    public function label(): string
    {
        return match ($this) {
            self::Annual => 'Cuti Ganti Hari',
            self::Unpaid => 'Cuti Potong Gaji',
            self::Sick => 'Izin/Sakit',
        };
    }

    /** Whether this leave type draws down the annual quota. */
    public function consumesQuota(): bool
    {
        return $this === self::Annual;
    }

    /**
     * Whether this leave is recorded as cutting salary. "Cuti Potong Gaji" always
     * does; "Izin/Sakit" only for outsourcing staff; "Cuti Ganti Hari" never.
     */
    public function cutsSalary(bool $isOutsourcing): bool
    {
        return match ($this) {
            self::Unpaid => true,
            self::Sick => $isOutsourcing,
            self::Annual => false,
        };
    }
}
