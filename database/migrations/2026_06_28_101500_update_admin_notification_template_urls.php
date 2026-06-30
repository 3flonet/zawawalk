<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Update the template in the database if it exists
        $template = DB::table('broadcast_templates')->where('name', 'Notifikasi Pendaftaran Baru (Admin)')->first();
        if ($template) {
            $body = str_replace('{ticket_url}', '{confirm_payment_url}', $template->body);
            $waBody = str_replace('{ticket_url}', '{confirm_payment_url}', $template->whatsapp_body);
            $emailNarrative = str_replace('{ticket_url}', '{confirm_payment_url}', $template->email_narrative);

            DB::table('broadcast_templates')
                ->where('name', 'Notifikasi Pendaftaran Baru (Admin)')
                ->update([
                    'body' => $body,
                    'whatsapp_body' => $waBody,
                    'email_narrative' => $emailNarrative,
                ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $template = DB::table('broadcast_templates')->where('name', 'Notifikasi Pendaftaran Baru (Admin)')->first();
        if ($template) {
            $body = str_replace('{confirm_payment_url}', '{ticket_url}', $template->body);
            $waBody = str_replace('{confirm_payment_url}', '{ticket_url}', $template->whatsapp_body);
            $emailNarrative = str_replace('{confirm_payment_url}', '{ticket_url}', $template->email_narrative);

            DB::table('broadcast_templates')
                ->where('name', 'Notifikasi Pendaftaran Baru (Admin)')
                ->update([
                    'body' => $body,
                    'whatsapp_body' => $waBody,
                    'email_narrative' => $emailNarrative,
                ]);
        }
    }
};
