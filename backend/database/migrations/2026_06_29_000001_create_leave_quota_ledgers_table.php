<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('leave_quota_ledgers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('leave_quota_id')->constrained('leave_quotas')->cascadeOnDelete();
            // Signed change applied to the remaining (available) days. Positive
            // when quota is added, negative when consumed.
            $table->decimal('delta', 5, 1);
            // Remaining days AFTER this change, for an at-a-glance running balance.
            $table->decimal('balance', 6, 1);
            $table->string('reason');
            // What caused the change (LeaveRequest / OvertimeRequest / null for accrual).
            $table->nullableMorphs('source');
            // Who triggered it, when applicable (approver / admin). Null for system jobs.
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['leave_quota_id', 'id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('leave_quota_ledgers');
    }
};
