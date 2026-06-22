<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Career / placement history row imported from the old HRD app's `karir` table.
 */
class EmployeeCareerHistory extends Model
{
    protected $fillable = [
        'user_id', 'legacy_id', 'legacy_id_kryw',
        'departemen_id', 'bagian_id', 'jabatan_id', 'penempatan_id', 'area_id', 'gol',
        'tgl_masuk', 't_penilaian', 't_penetapan', 'p_spk', 'resign',
        'tgl_warning', 'tgl_input_resign',
        'status_jab', 'status_karyawan', 'warning', 'keterangan',
        'input_warning_by', 'input_by',
        's_resign', 's_bersih', 'k_bpjs', 'atk',
    ];

    protected function casts(): array
    {
        return [
            'tgl_masuk' => 'date',
            't_penilaian' => 'date',
            't_penetapan' => 'date',
            'p_spk' => 'date',
            'resign' => 'date',
            'tgl_warning' => 'date',
            'tgl_input_resign' => 'date',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function bagian(): BelongsTo
    {
        return $this->belongsTo(Bagian::class, 'bagian_id', 'legacy_id');
    }

    public function jabatan(): BelongsTo
    {
        return $this->belongsTo(Jabatan::class, 'jabatan_id', 'legacy_id');
    }

    public function area(): BelongsTo
    {
        return $this->belongsTo(Area::class, 'area_id', 'legacy_id');
    }

    public function penempatan(): BelongsTo
    {
        return $this->belongsTo(Penempatan::class, 'penempatan_id', 'legacy_id');
    }
}
