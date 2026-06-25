<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Overtime "ganti hari" can grant half-days (½ day per 4h on a workday),
        // so quota balances need fractional precision.
        Schema::table('leave_quotas', function (Blueprint $table) {
            $table->decimal('total_days', 6, 1)->default(0)->change();
            $table->decimal('used_days', 6, 1)->default(0)->change();
            $table->decimal('remaining_days', 6, 1)->default(0)->change();
        });
    }

    public function down(): void
    {
        Schema::table('leave_quotas', function (Blueprint $table) {
            $table->integer('total_days')->default(0)->change();
            $table->integer('used_days')->default(0)->change();
            $table->integer('remaining_days')->default(0)->change();
        });
    }
};
