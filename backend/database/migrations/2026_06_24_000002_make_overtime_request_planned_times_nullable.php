<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Planned start/end moved to the per-employee level; the request-level
        // columns are kept for backward compatibility but are no longer required.
        Schema::table('overtime_requests', function (Blueprint $table) {
            $table->time('planned_start')->nullable()->change();
            $table->time('planned_end')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('overtime_requests', function (Blueprint $table) {
            $table->time('planned_start')->nullable(false)->change();
            $table->time('planned_end')->nullable(false)->change();
        });
    }
};
