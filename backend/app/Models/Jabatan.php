<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Job position lookup (old `jabatan`). */
class Jabatan extends Model
{
    protected $table = 'jabatan';

    protected $fillable = ['legacy_id', 'nama', 'nama_inggris'];
}
