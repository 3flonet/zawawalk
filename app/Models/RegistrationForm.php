<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RegistrationForm extends Model
{
    protected $fillable = ['title', 'fields_schema', 'is_active', 'banner_path', 'ticket_price', 'max_participants', 'closed_at', 'additional_fees'];

    protected $casts = [
        'fields_schema' => 'array',
        'is_active' => 'boolean',
        'ticket_price' => 'decimal:2',
        'max_participants' => 'integer',
        'closed_at' => 'datetime',
        'additional_fees' => 'array',
    ];

    public function attendees()
    {
        return $this->hasMany(Attendee::class, 'registration_form_id');
    }
}
