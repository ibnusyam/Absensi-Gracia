<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('overtime_request_employees', function (Blueprint $table) {
            // Per-employee planned schedule (admin-set, editable any time). Full
            // datetimes so each employee can start/end on different days.
            $table->dateTime('planned_start_at')->nullable()->after('user_id');
            $table->dateTime('planned_end_at')->nullable()->after('planned_start_at');
            // Per-employee compensation choice; "leave" grants pro-rated leave days.
            $table->string('compensation_type')->default('money')->after('planned_end_at');
            // How many leave days were already credited to the quota for this row,
            // so edits can reconcile (idempotent settlement).
            $table->decimal('leave_days_credited', 4, 1)->default(0)->after('compensation_type');
        });
    }

    public function down(): void
    {
        Schema::table('overtime_request_employees', function (Blueprint $table) {
            $table->dropColumn([
                'planned_start_at',
                'planned_end_at',
                'compensation_type',
                'leave_days_credited',
            ]);
        });
    }
};
