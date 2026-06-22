<?php

namespace App\Models;

use App\Enums\RoleSlug;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'password',
        'employee_id',
        'department_id',
        'role_id',
        'phone',
        'avatar_path',
        'joined_at',
        'is_active',
        'fcm_token',
        // Legacy HRD (master) fields
        'legacy_id',
        'no_ktp',
        'alamat',
        'telepon_rumah',
        'tempat_lahir',
        'tanggal_lahir',
        'jenis_kelamin',
        'status_pernikahan',
        'jumlah_tanggungan',
        'agama',
        'pendidikan',
        'jurusan',
        'status_pajak',
        'no_npwp',
        'no_jamsostek',
        'rekening_bca',
        'rekening_bni',
        'status_karir',
        'tanggal_spk',
        'kartu_pensiun',
        'kode_jabatan',
        'nama_jabatan',
        'keterangan_data',
        'jatah_cuti',
        'tahun_cuti',
        'sisa_cuti',
        'legacy_password',
        'legacy_salt',
        'legacy_data',
    ];

    protected $hidden = [
        'password',
        'remember_token',
        'legacy_password',
        'legacy_salt',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'joined_at' => 'date',
            'is_active' => 'boolean',
            'tanggal_lahir' => 'date',
            'tanggal_spk' => 'date',
            'kartu_pensiun' => 'date',
            'jatah_cuti' => 'decimal:1',
            'sisa_cuti' => 'decimal:1',
            'legacy_data' => 'array',
        ];
    }

    // ---------------------------------------------------------------------
    // Relations
    // ---------------------------------------------------------------------

    public function role(): BelongsTo
    {
        return $this->belongsTo(Role::class);
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    /** Departments this user manages. */
    public function managedDepartments(): HasMany
    {
        return $this->hasMany(Department::class, 'manager_user_id');
    }

    public function attendances(): HasMany
    {
        return $this->hasMany(Attendance::class);
    }

    public function leaveRequests(): HasMany
    {
        return $this->hasMany(LeaveRequest::class);
    }

    public function leaveQuotas(): HasMany
    {
        return $this->hasMany(LeaveQuota::class);
    }

    public function overtimeRequestEmployees(): HasMany
    {
        return $this->hasMany(OvertimeRequestEmployee::class);
    }

    public function offPeriods(): HasMany
    {
        return $this->hasMany(EmployeeOffPeriod::class);
    }

    /** Career / placement history imported from the old HRD app (`karir`). */
    public function careerHistories(): HasMany
    {
        return $this->hasMany(EmployeeCareerHistory::class);
    }

    // ---------------------------------------------------------------------
    // Role helpers
    // ---------------------------------------------------------------------

    public function hasRole(RoleSlug|string $slug): bool
    {
        $slug = $slug instanceof RoleSlug ? $slug->value : $slug;

        return $this->role?->slug === $slug;
    }

    public function hasAnyRole(array $slugs): bool
    {
        $slugs = array_map(fn ($s) => $s instanceof RoleSlug ? $s->value : $s, $slugs);

        return in_array($this->role?->slug, $slugs, true);
    }

    public function isApprover(): bool
    {
        return $this->hasAnyRole(RoleSlug::approvers());
    }

    public function isAdminBagian(): bool
    {
        return $this->hasRole(RoleSlug::AdminBagian);
    }
}
