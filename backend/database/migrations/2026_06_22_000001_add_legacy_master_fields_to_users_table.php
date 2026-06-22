<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Extends `users` so it can hold every field from the OLD HRD app's `master` table.
 *
 * Fields already covered by the existing schema are reused:
 *   master.n_karyawan -> users.name
 *   master.email      -> users.email
 *   master.hp         -> users.phone
 *   master.nik        -> users.employee_id
 *   master.photo      -> users.avatar_path
 *
 * Every other meaningful master column gets a typed column below. The remaining
 * old-app-specific permission/marketing flags (level_absensi, list_kar_aktif,
 * admin_marketing_*, chart_status, koperasi, etc.) are preserved verbatim in the
 * `legacy_data` JSONB catch-all so NO data from the old app is ever lost.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Old primary key (master.id_kryw) — needed to relink career history.
            $table->unsignedBigInteger('legacy_id')->nullable()->unique()->after('id');

            // Identity / personal data
            $table->string('no_ktp', 100)->nullable()->after('employee_id');        // no_ktp
            $table->text('alamat')->nullable()->after('no_ktp');                     // alamat_karyawan
            $table->string('telepon_rumah')->nullable()->after('phone');            // rumah
            $table->string('tempat_lahir')->nullable()->after('telepon_rumah');     // tmp_lahir
            $table->date('tanggal_lahir')->nullable()->after('tempat_lahir');       // t_lahir
            $table->string('jenis_kelamin', 20)->nullable()->after('tanggal_lahir');// jk
            $table->string('status_pernikahan', 50)->nullable()->after('jenis_kelamin'); // status
            $table->unsignedSmallInteger('jumlah_tanggungan')->nullable()->after('status_pernikahan'); // tanggungan
            $table->string('agama', 50)->nullable()->after('jumlah_tanggungan');    // agama
            $table->string('pendidikan', 100)->nullable()->after('agama');          // pendidikan
            $table->string('jurusan', 150)->nullable()->after('pendidikan');        // jurusan

            // Tax / insurance / bank
            $table->string('status_pajak', 10)->nullable()->after('jurusan');       // status_pajak
            $table->string('no_npwp', 50)->nullable()->after('status_pajak');       // no_npwp
            $table->string('no_jamsostek', 100)->nullable()->after('no_npwp');      // no_jamsostek
            $table->string('rekening_bca', 100)->nullable()->after('no_jamsostek'); // bca
            $table->string('rekening_bni', 100)->nullable()->after('rekening_bca'); // bni

            // Employment
            $table->string('status_karir', 20)->nullable()->after('joined_at');     // status_karir (Kontrak/Tetap)
            $table->date('tanggal_spk')->nullable()->after('status_karir');         // p_spk
            $table->date('kartu_pensiun')->nullable()->after('tanggal_spk');        // kartu_pensiun
            $table->string('kode_jabatan', 100)->nullable()->after('kartu_pensiun');// kode_jab_nya
            $table->string('nama_jabatan', 100)->nullable()->after('kode_jabatan'); // jab_nya
            $table->string('keterangan_data')->nullable()->after('nama_jabatan');   // ket_data

            // Leave balance
            $table->decimal('jatah_cuti', 4, 1)->nullable()->after('keterangan_data');   // cuti
            $table->smallInteger('tahun_cuti')->nullable()->after('jatah_cuti');         // tahun_cuti
            $table->decimal('sisa_cuti', 4, 1)->nullable()->after('tahun_cuti');         // sisa_cuti_nya

            // Old credentials (kept only for reference; NOT used for auth — incompatible with bcrypt)
            $table->string('legacy_password')->nullable()->after('sisa_cuti');           // pa55
            $table->string('legacy_salt')->nullable()->after('legacy_password');         // salt

            // Catch-all for any remaining old-app columns (marketing/permission flags, etc.)
            $table->jsonb('legacy_data')->nullable()->after('legacy_salt');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'legacy_id', 'no_ktp', 'alamat', 'telepon_rumah', 'tempat_lahir',
                'tanggal_lahir', 'jenis_kelamin', 'status_pernikahan', 'jumlah_tanggungan',
                'agama', 'pendidikan', 'jurusan', 'status_pajak', 'no_npwp', 'no_jamsostek',
                'rekening_bca', 'rekening_bni', 'status_karir', 'tanggal_spk', 'kartu_pensiun',
                'kode_jabatan', 'nama_jabatan', 'keterangan_data', 'jatah_cuti', 'tahun_cuti',
                'sisa_cuti', 'legacy_password', 'legacy_salt', 'legacy_data',
            ]);
        });
    }
};
