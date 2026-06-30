<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BroadcastTemplate extends Model
{
    protected $fillable = [
        'name',
        'subject',
        'body',
        'whatsapp_body',
        'email_subject',
        'email_body',
        'email_narrative',
        'email_banner',
    ];
}
