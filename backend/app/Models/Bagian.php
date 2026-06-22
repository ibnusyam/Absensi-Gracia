<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Section / sub-department lookup (old `bagian`). */
class Bagian extends Model
{
    protected $table = 'bagian';

    protected $fillable = ['legacy_id', 'nama', 'chart', 'flag_mdp'];
}
