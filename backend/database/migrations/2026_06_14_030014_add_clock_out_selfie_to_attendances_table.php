<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('attendances', function (Blueprint $table) {
            $table->decimal('clock_out_lat', 10, 8)->nullable()->after('clock_in_lng');
            $table->decimal('clock_out_lng', 11, 8)->nullable()->after('clock_out_lat');
            $table->string('selfie_out_path')->nullable()->after('selfie_path');
        });
    }

    public function down(): void
    {
        Schema::table('attendances', function (Blueprint $table) {
            $table->dropColumn(['clock_out_lat', 'clock_out_lng', 'selfie_out_path']);
        });
    }
};
