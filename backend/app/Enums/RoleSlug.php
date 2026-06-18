<?php

namespace App\Enums;

enum RoleSlug: string
{
    case SuperAdmin = 'super-admin';
    case AdminBagian = 'admin-bagian';
    case Karyawan = 'karyawan';
    case Hrd = 'hrd';
    case Direktur = 'direktur';

    public function label(): string
    {
        return match ($this) {
            self::SuperAdmin => 'Super Admin',
            self::AdminBagian => 'Admin Bagian',
            self::Karyawan => 'Karyawan',
            self::Hrd => 'HRD',
            self::Direktur => 'Direktur',
        };
    }

    /** Roles allowed to approve overtime/leave requests. */
    public static function approvers(): array
    {
        return [self::Hrd->value, self::Direktur->value];
    }

    /** Roles considered administrators for master-data access. */
    public static function admins(): array
    {
        return [self::SuperAdmin->value, self::Hrd->value, self::Direktur->value];
    }
}
