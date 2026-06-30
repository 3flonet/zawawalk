<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Plugin extends Model
{
    protected $primaryKey = 'id';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = ['id', 'name', 'is_active', 'version', 'settings'];

    protected $casts = [
        'is_active' => 'boolean',
        'settings' => 'array',
    ];
}
