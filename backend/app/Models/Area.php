<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Marketing area lookup (old `area`). */
class Area extends Model
{
    protected $table = 'area';

    protected $fillable = ['legacy_id', 'nama'];
}
