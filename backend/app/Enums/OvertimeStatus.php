<?php

namespace App\Enums;

enum OvertimeStatus: string
{
    case Pending = 'pending';
    case ApprovedByHrd = 'approved_by_hrd';
    case ApprovedByDirector = 'approved_by_director';
    case Rejected = 'rejected';

    public function label(): string
    {
        return match ($this) {
            self::Pending => 'Menunggu HRD',
            self::ApprovedByHrd => 'Menunggu Direktur',
            self::ApprovedByDirector => 'Disetujui',
            self::Rejected => 'Ditolak',
        };
    }

    public function isFullyApproved(): bool
    {
        return $this === self::ApprovedByDirector;
    }
}
