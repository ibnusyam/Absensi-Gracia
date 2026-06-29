<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('overtime_sessions', function (Blueprint $table) {
            $table->decimal('clock_in_lat', 10, 8)->nullable()->after('clock_in_at');
            $table->decimal('clock_in_lng', 11, 8)->nullable()->after('clock_in_lat');
            $table->decimal('clock_out_lat', 10, 8)->nullable()->after('clock_out_at');
            $table->decimal('clock_out_lng', 11, 8)->nullable()->after('clock_out_lat');
            $table->string('selfie_path')->nullable()->after('total_hours');
            $table->string('selfie_out_path')->nullable()->after('selfie_path');
        });
    }

    public function down(): void
    {
        Schema::table('overtime_sessions', function (Blueprint $table) {
            $table->dropColumn([
                'clock_in_lat', 'clock_in_lng',
                'clock_out_lat', 'clock_out_lng',
                'selfie_path', 'selfie_out_path',
            ]);
        });
    }
};
