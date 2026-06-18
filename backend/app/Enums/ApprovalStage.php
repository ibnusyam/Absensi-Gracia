<?php

namespace App\Enums;

enum ApprovalStage: int
{
    case Hrd = 1;
    case Director = 2;

    public function label(): string
    {
        return match ($this) {
            self::Hrd => 'HRD',
            self::Director => 'Direktur',
        };
    }
}
