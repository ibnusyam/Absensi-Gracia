<?php

use App\Http\Controllers\Api\V1\ApprovalController;
use App\Http\Controllers\Api\V1\AttendanceController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\DepartmentController;
use App\Http\Controllers\Api\V1\LeaveRequestController;
use App\Http\Controllers\Api\V1\OvertimeRequestController;
use App\Http\Controllers\Api\V1\OvertimeSessionController;
use App\Http\Controllers\Api\V1\RecapController;
use App\Http\Controllers\Api\V1\UserController;
use App\Http\Controllers\Api\V1\WorkLocationController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    // ---- Public ----
    Route::post('auth/login', [AuthController::class, 'login']);

    // ---- Authenticated (Bearer token) ----
    Route::middleware('auth:sanctum')->group(function () {
        // Auth
        Route::post('auth/logout', [AuthController::class, 'logout']);
        Route::get('auth/me', [AuthController::class, 'me']);
        Route::post('auth/device-token', [AuthController::class, 'deviceToken']);

        // Attendance
        Route::get('attendances', [AttendanceController::class, 'index']);
        Route::get('attendances/report', [AttendanceController::class, 'report'])
            ->middleware('role:super-admin,hrd,direktur,admin-bagian');
        Route::get('attendances/today', [AttendanceController::class, 'today']);
        Route::get('attendances/summary', [AttendanceController::class, 'summary']);
        Route::post('attendances/clock-in', [AttendanceController::class, 'clockIn']);
        Route::post('attendances/clock-out', [AttendanceController::class, 'clockOut']);

        // Overtime requests
        Route::get('overtime-requests', [OvertimeRequestController::class, 'index']);
        Route::post('overtime-requests', [OvertimeRequestController::class, 'store'])
            ->middleware('role:admin-bagian');
        Route::get('overtime-requests/{overtimeRequest}', [OvertimeRequestController::class, 'show']);

        // Overtime sessions (employee clocking)
        Route::post('overtime-sessions/{overtimeSession}/clock-in', [OvertimeSessionController::class, 'clockIn']);
        Route::post('overtime-sessions/{overtimeSession}/clock-out', [OvertimeSessionController::class, 'clockOut']);

        // Leave requests
        Route::get('leave-requests', [LeaveRequestController::class, 'index']);
        Route::post('leave-requests', [LeaveRequestController::class, 'store']);
        Route::get('leave-requests/{leaveRequest}', [LeaveRequestController::class, 'show']);
        Route::delete('leave-requests/{leaveRequest}', [LeaveRequestController::class, 'destroy']);
        Route::get('leave-quota', [LeaveRequestController::class, 'quota']);

        // Monthly recap (approved leave + completed overtime)
        Route::middleware('role:super-admin,hrd,direktur')->group(function () {
            Route::get('recap/leave', [RecapController::class, 'leave']);
            Route::get('recap/overtime', [RecapController::class, 'overtime']);
        });

        // Approvals (HRD / Direktur)
        Route::middleware('role:hrd,direktur')->group(function () {
            Route::get('approvals/pending', [ApprovalController::class, 'pending']);
            Route::post('approvals/{type}/{id}', [ApprovalController::class, 'act'])
                ->whereIn('type', ['overtime', 'leave']);
        });

        // Master data
        Route::get('users', [UserController::class, 'index'])
            ->middleware('role:super-admin,hrd,direktur,admin-bagian');
        Route::get('users/{user}', [UserController::class, 'show'])
            ->middleware('role:super-admin,hrd,direktur,admin-bagian');
        Route::get('departments', [DepartmentController::class, 'index']);
        Route::get('work-locations', [WorkLocationController::class, 'index']);
    });
});
