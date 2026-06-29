<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * The lateness ("Terlambat") feature was removed: employee schedules are too
 * dynamic to flag late arrivals. Existing "late" rows become plain "present",
 * and the late_minutes column is dropped.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::table('attendances')->where('status', 'late')->update(['status' => 'present']);

        Schema::table('attendances', function (Blueprint $table) {
            $table->dropColumn('late_minutes');
        });
    }

    public function down(): void
    {
        Schema::table('attendances', function (Blueprint $table) {
            $table->integer('late_minutes')->nullable();
        });
    }
};
