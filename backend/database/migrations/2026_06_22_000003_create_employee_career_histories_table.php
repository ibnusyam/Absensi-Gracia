<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Mirrors the old `karir` table (career / placement history — many rows per
 * employee). Lets the full career history dump be loaded without losing data.
 *
 * Lookup foreign keys are stored as the original integer ids (departemen_id,
 * bagian_id, jabatan_id, penempatan_id, area_id) so a raw dump loads as-is; they
 * can be resolved against departments / bagian / jabatan / area / penempatan via
 * their `legacy_id`.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('employee_career_histories', function (Blueprint $table) {
            $table->id();

            // Link to the employee. user_id is the resolved app FK; legacy_id_kryw
            // keeps the old master.id_kryw so a raw dump can be matched up later.
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->unsignedInteger('legacy_id')->nullable();      // id_karir
            $table->unsignedInteger('legacy_id_kryw')->nullable()->index(); // id_kryw

            // Placement (old integer lookup ids)
            $table->unsignedInteger('departemen_id')->nullable();  // departemen
            $table->unsignedInteger('bagian_id')->nullable();      // bagian
            $table->unsignedInteger('jabatan_id')->nullable();     // jabatan
            $table->unsignedInteger('penempatan_id')->nullable();  // penempatan
            $table->unsignedInteger('area_id')->nullable();        // area
            $table->string('gol')->nullable();                     // gol (golongan)

            // Dates
            $table->date('tgl_masuk')->nullable();                 // tgl_masuk
            $table->date('t_penilaian')->nullable();               // t_penilaian
            $table->date('t_penetapan')->nullable();               // t_penetapan
            $table->date('p_spk')->nullable();                     // p_spk
            $table->date('resign')->nullable();                    // resign
            $table->date('tgl_warning')->nullable();               // tgl_warning
            $table->date('tgl_input_resign')->nullable();          // tgl_input_resign

            // Status & notes
            $table->integer('status_jab')->nullable();             // status_jab
            $table->string('status_karyawan', 30)->nullable();     // status_karyawan
            $table->integer('warning')->default(0);                // warning
            $table->text('keterangan')->nullable();                // keterangan
            $table->string('input_warning_by')->nullable();        // input_warning_by
            $table->string('input_by')->nullable();                // input_by

            // Resign-process flags
            $table->integer('s_resign')->default(0);               // s_resign
            $table->integer('s_bersih')->default(0);               // s_bersih
            $table->integer('k_bpjs')->default(0);                 // k_bpjs
            $table->integer('atk')->default(0);                    // atk

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('employee_career_histories');
    }
};
