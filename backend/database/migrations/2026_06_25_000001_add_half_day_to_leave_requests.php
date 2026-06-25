<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('leave_requests', function (Blueprint $table) {
            // Half-day leave: a single working day counted as 0.5.
            $table->boolean('half_day')->default(false)->after('end_date');
            // total_days must hold fractions (0.5) now.
            $table->decimal('total_days', 5, 1)->change();
        });
    }

    public function down(): void
    {
        Schema::table('leave_requests', function (Blueprint $table) {
            $table->dropColumn('half_day');
            $table->integer('total_days')->change();
        });
    }
};
