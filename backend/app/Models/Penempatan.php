<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Placement lookup (old `penempatan`). */
class Penempatan extends Model
{
    protected $table = 'penempatan';

    protected $fillable = ['legacy_id', 'nama'];
}
