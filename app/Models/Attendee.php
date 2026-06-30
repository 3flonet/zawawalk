<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Attendee extends Model
{
    protected $fillable = [
        'registration_form_id',
        'ticket_code',
        'registration_data',
        'signature_path',
        'payment_status',
        'payment_method',
        'payment_proof_path',
        'checked_in',
        'checked_in_at',
        'checked_in_by',
    ];

    protected $casts = [
        'registration_data' => 'array',
        'checked_in' => 'boolean',
        'checked_in_at' => 'datetime',
    ];

    public function form()
    {
        return $this->belongsTo(RegistrationForm::class, 'registration_form_id');
    }

    public function checkedInByUser()
    {
        return $this->belongsTo(User::class, 'checked_in_by');
    }
}
