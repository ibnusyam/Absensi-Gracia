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
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'joined_at' => 'date',
            'is_active' => 'boolean',
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
