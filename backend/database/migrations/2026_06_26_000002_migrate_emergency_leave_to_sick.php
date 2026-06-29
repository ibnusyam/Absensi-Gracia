<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * The "Darurat" (emergency) leave type was merged into "Izin/Sakit" (sick).
 * Re-label any existing rows so they remain loadable after the enum case is
 * dropped from the application. The CHECK constraint still permits the value,
 * so no schema change is required.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::table('leave_requests')->where('type', 'emergency')->update(['type' => 'sick']);
    }

    public function down(): void
    {
        // One-way data merge; emergency rows are not restorable.
    }
};
