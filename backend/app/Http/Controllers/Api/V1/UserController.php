<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Http\Resources\LeaveQuotaResource;
use App\Http\Resources\LeaveRequestResource;
use App\Http\Resources\OvertimeRequestResource;
use App\Http\Resources\UserResource;
use App\Models\LeaveQuota;
use App\Models\LeaveRequest;
use App\Models\OvertimeRequest;
use App\Models\User;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

class UserController extends Controller
{
    use ApiResponse;

    /**
     * Optional employee-profile fields (mirrored from the old HRD `master` table).
     * These are never required — only the core account fields are mandatory.
     */
    private function profileRules(): array
    {
        return [
            // Personal data
            'no_ktp' => ['nullable', 'string', 'max:100'],
            'alamat' => ['nullable', 'string', 'max:1000'],
            'telepon_rumah' => ['nullable', 'string', 'max:255'],
            'tempat_lahir' => ['nullable', 'string', 'max:255'],
            'tanggal_lahir' => ['nullable', 'date'],
            'jenis_kelamin' => ['nullable', 'string', 'max:20'],
            'status_pernikahan' => ['nullable', 'string', 'max:50'],
            'jumlah_tanggungan' => ['nullable', 'integer', 'min:0', 'max:99'],
            'agama' => ['nullable', 'string', 'max:50'],
            'pendidikan' => ['nullable', 'string', 'max:100'],
            'jurusan' => ['nullable', 'string', 'max:150'],
            // Tax / insurance / bank
            'status_pajak' => ['nullable', 'string', 'max:10'],
            'no_npwp' => ['nullable', 'string', 'max:50'],
            'no_jamsostek' => ['nullable', 'string', 'max:100'],
            'rekening_bca' => ['nullable', 'string', 'max:100'],
            'rekening_bni' => ['nullable', 'string', 'max:100'],
            // Employment
            'status_karir' => ['nullable', 'string', 'max:20'],
            'tanggal_spk' => ['nullable', 'date'],
            'kartu_pensiun' => ['nullable', 'date'],
            'kode_jabatan' => ['nullable', 'string', 'max:100'],
            'nama_jabatan' => ['nullable', 'string', 'max:100'],
            'keterangan_data' => ['nullable', 'string', 'max:255'],
            // Leave balance
            'jatah_cuti' => ['nullable', 'numeric', 'min:0'],
            'tahun_cuti' => ['nullable', 'integer'],
            'sisa_cuti' => ['nullable', 'numeric', 'min:0'],
        ];
    }

    /** Create a new employee. */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
            'role_id' => ['required', 'integer', 'exists:roles,id'],
            'department_id' => ['nullable', 'integer', 'exists:departments,id'],
            'employee_id' => ['nullable', 'string', 'max:255', 'unique:users,employee_id'],
            'phone' => ['nullable', 'string', 'max:50'],
            'joined_at' => ['nullable', 'date'],
            'is_active' => ['boolean'],
        ] + $this->profileRules());

        // password is plain here; the User model's "hashed" cast hashes it on save.
        $user = User::create($validated + ['is_active' => $validated['is_active'] ?? true]);

        return $this->respondCreated(
            new UserResource($user->load(['role', 'department'])),
            'Karyawan ditambahkan.',
        );
    }

    /** Update an employee. Password is only changed when a new one is supplied. */
    public function update(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            'email' => ['sometimes', 'required', 'email', 'max:255', Rule::unique('users', 'email')->ignore($user->id)],
            'password' => ['nullable', 'string', 'min:8'],
            'role_id' => ['sometimes', 'required', 'integer', 'exists:roles,id'],
            'department_id' => ['nullable', 'integer', 'exists:departments,id'],
            'employee_id' => ['nullable', 'string', 'max:255', Rule::unique('users', 'employee_id')->ignore($user->id)],
            'phone' => ['nullable', 'string', 'max:50'],
            'joined_at' => ['nullable', 'date'],
            'is_active' => ['boolean'],
        ] + $this->profileRules());

        if (empty($validated['password'])) {
            unset($validated['password']);
        }

        $user->update($validated);

        return $this->respondSuccess(
            new UserResource($user->fresh()->load(['role', 'department'])),
            'Karyawan diperbarui.',
        );
    }

    /** "Delete" an employee = deactivate (soft). History is preserved. */
    public function destroy(Request $request, User $user): JsonResponse
    {
        if ($request->user()->id === $user->id) {
            return $this->respondError('Anda tidak dapat menonaktifkan akun Anda sendiri.', 422);
        }

        $user->update(['is_active' => false]);

        return $this->respondSuccess(
            new UserResource($user->fresh()->load(['role', 'department'])),
            'Karyawan dinonaktifkan.',
        );
    }

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = User::with(['role', 'department'])->orderBy('name');

        // Admin Bagian is locked to their own department, no matter what is requested.
        if ($user->isAdminBagian()) {
            $query->where('department_id', $user->department_id);
        }

        $query->when($request->filled('department_id'), fn ($q) => $q->where('department_id', $request->integer('department_id')))
            ->when($request->filled('role_id'), fn ($q) => $q->where('role_id', $request->integer('role_id')))
            ->when($request->filled('is_active'), fn ($q) => $q->where('is_active', $request->boolean('is_active')))
            ->when($request->filled('search'), function ($q) use ($request) {
                $term = '%'.$request->string('search').'%';
                $q->where(fn ($sub) => $sub->where('name', 'like', $term)
                    ->orWhere('email', 'like', $term)
                    ->orWhere('employee_id', 'like', $term));
            });

        $paginated = $query->paginate($request->integer('per_page', 15));

        return $this->respondPaginated(UserResource::collection($paginated));
    }

    /**
     * Employee detail: biodata + leave quota + leave & overtime history.
     */
    public function show(Request $request, User $user): JsonResponse
    {
        $actor = $request->user();

        // Admin Bagian may only inspect employees in their own department.
        if ($actor->isAdminBagian() && $user->department_id !== $actor->department_id) {
            throw new AccessDeniedHttpException('Anda hanya dapat melihat karyawan di departemen Anda.');
        }

        $user->load(['role', 'department']);

        $year = (int) now()->setTimezone(config('services.display_timezone'))->year;
        $quota = LeaveQuota::firstWhere(['user_id' => $user->id, 'year' => $year]);

        $leaves = LeaveRequest::where('user_id', $user->id)->latest()->limit(50)->get();

        $overtimes = OvertimeRequest::with(['department', 'requester', 'employees.user', 'employees.session'])
            ->whereHas('employees', fn ($q) => $q->where('user_id', $user->id))
            ->latest()
            ->limit(50)
            ->get();

        $today = now()->setTimezone(config('services.display_timezone'))->toDateString();
        $offPeriods = $user->offPeriods()->with('creator:id,name')->orderByDesc('start_date')->get();
        $currentOff = $offPeriods->first(fn ($o) => $o->start_date->toDateString() <= $today
            && (is_null($o->end_date) || $o->end_date->toDateString() >= $today));

        return $this->respondSuccess([
            'user' => new UserResource($user),
            'leave_quota' => $quota ? new LeaveQuotaResource($quota) : null,
            'leave_requests' => LeaveRequestResource::collection($leaves),
            'overtime_requests' => OvertimeRequestResource::collection($overtimes),
            'is_currently_off' => (bool) $currentOff,
            'off_periods' => $offPeriods->map(fn ($o) => [
                'id' => $o->id,
                'start_date' => $o->start_date->toDateString(),
                'end_date' => $o->end_date?->toDateString(),
                'reason' => $o->reason,
                'created_by_name' => $o->creator?->name,
            ]),
        ], 'OK');
    }
}
