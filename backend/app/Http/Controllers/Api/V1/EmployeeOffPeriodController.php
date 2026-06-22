<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\EmployeeOffPeriod;
use App\Models\User;
use App\Support\ApiResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Manage employee "off" periods (dirumahkan / dinonaktifkan sementara). These are
 * report-only labels and do not affect login or attendance.
 */
class EmployeeOffPeriodController extends Controller
{
    use ApiResponse;

    /** Flag an employee as off from a start date, optionally until an end date. */
    public function store(Request $request, User $user): JsonResponse
    {
        $validated = $request->validate([
            'start_date' => ['required', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'reason' => ['nullable', 'string', 'max:255'],
        ]);

        $off = $user->offPeriods()->create([
            'start_date' => $validated['start_date'],
            'end_date' => $validated['end_date'] ?? null,
            'reason' => $validated['reason'] ?? null,
            'created_by' => $request->user()->id,
        ]);

        return $this->respondCreated($off, 'Karyawan ditandai off.');
    }

    /** Adjust an off period — typically to close it ("Aktifkan kembali"). */
    public function update(Request $request, EmployeeOffPeriod $offPeriod): JsonResponse
    {
        $validated = $request->validate([
            'end_date' => ['nullable', 'date', 'after_or_equal:'.$offPeriod->start_date->toDateString()],
            'reason' => ['nullable', 'string', 'max:255'],
        ]);

        // end_date is intentionally nullable: omit the key to leave it unchanged,
        // send null to reopen, or a date to close the period.
        $offPeriod->fill($validated)->save();

        return $this->respondSuccess($offPeriod->fresh(), 'Periode off diperbarui.');
    }

    /** Remove an off period entirely (e.g. created by mistake). */
    public function destroy(EmployeeOffPeriod $offPeriod): JsonResponse
    {
        $offPeriod->delete();

        return $this->respondSuccess(null, 'Periode off dihapus.');
    }
}
