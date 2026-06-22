<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Lookup tables mirroring the old HRD app so its reference data has a home.
 *
 *   old `bagian`     -> bagian      (sections / sub-departments)
 *   old `jabatan`    -> jabatan     (job positions)
 *   old `area`       -> area        (marketing areas)
 *   old `penempatan` -> penempatan  (placements)
 *
 * (old `dept` already maps to the existing `departments` table.)
 *
 * `legacy_id` preserves the original primary key so `employee_career_histories`
 * rows (which reference these by their old integer id) can be resolved later.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bagian', function (Blueprint $table) {
            $table->id();
            $table->unsignedInteger('legacy_id')->nullable()->unique(); // id_bag
            $table->string('nama')->nullable();                         // bagian
            $table->integer('chart')->default(0);                       // chart
            $table->integer('flag_mdp')->default(0);                    // flag_mdp
            $table->timestamps();
        });

        Schema::create('jabatan', function (Blueprint $table) {
            $table->id();
            $table->unsignedInteger('legacy_id')->nullable()->unique(); // id_jab
            $table->string('nama')->nullable();                         // jabatan
            $table->string('nama_inggris')->nullable();                 // jabatan_ind
            $table->timestamps();
        });

        Schema::create('area', function (Blueprint $table) {
            $table->id();
            $table->unsignedInteger('legacy_id')->nullable()->unique(); // id_area
            $table->string('nama')->nullable();                         // area
            $table->timestamps();
        });

        Schema::create('penempatan', function (Blueprint $table) {
            $table->id();
            $table->unsignedInteger('legacy_id')->nullable()->unique(); // id_penempatan
            $table->string('nama')->nullable();                         // penempatan
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('penempatan');
        Schema::dropIfExists('area');
        Schema::dropIfExists('jabatan');
        Schema::dropIfExists('bagian');
    }
};
