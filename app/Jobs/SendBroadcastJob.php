<?php

namespace App\Jobs;

use App\Models\Attendee;
use App\Models\BroadcastTemplate;
use App\Models\BroadcastLog;
use App\Models\Setting;
use App\Mail\BroadcastMail;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Mail;
use App\Http\Controllers\EventController;

class SendBroadcastJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected $attendeeId;
    protected $templateId;
    protected $channel;
    protected $logId;

    /**
     * Create a new job instance.
     */
    public function __construct($attendeeId, $templateId, $channel, $logId)
    {
        $this->attendeeId = $attendeeId;
        $this->templateId = $templateId;
        $this->channel = $channel;
        $this->logId = $logId;
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        $attendee = Attendee::with('form')->find($this->attendeeId);
        $template = BroadcastTemplate::find($this->templateId);
        $log = BroadcastLog::find($this->logId);

        if (!$attendee || !$template || !$log) {
            return;
        }

        // Extract email, name, and phone
        $emailField = collect($attendee->form->fields_schema)->firstWhere('type', 'email');
        $email = $emailField ? ($attendee->registration_data[$emailField['name']] ?? null) : null;
        if (!$email) {
            foreach ($attendee->registration_data as $k => $v) {
                if (str_contains(strtolower($k), 'email') && filter_var($v, FILTER_VALIDATE_EMAIL)) {
                    $email = $v;
                    break;
                }
            }
        }

        $fullName = $attendee->registration_data['fullname'] ?? null;
        if (!$fullName) {
            foreach ($attendee->registration_data as $k => $v) {
                if (str_contains(strtolower($k), 'nama') || str_contains(strtolower($k), 'name')) {
                    $fullName = $v;
                    break;
                }
            }
        }
        $fullName = $fullName ?: 'Peserta';

        $phone = $attendee->registration_data['whatsapp'] ?? null;
        if (!$phone) {
            foreach ($attendee->registration_data as $k => $v) {
                if (str_contains(strtolower($k), 'whatsapp') || str_contains(strtolower($k), 'wa') || str_contains(strtolower($k), 'telp') || str_contains(strtolower($k), 'phone') || str_contains(strtolower($k), 'hp')) {
                    $phone = $v;
                    break;
                }
            }
        }

        if ($this->channel === 'email') {
            if (!$email) {
                $log->update([
                    'status' => 'failed',
                    'error_message' => 'Alamat email tidak ditemukan.',
                ]);
                return;
            }

            // SMTP Setup
            $smtpHost = Setting::getValue('smtp_host');
            if ($smtpHost) {
                config([
                    'mail.default' => 'smtp',
                    'mail.mailers.smtp.host' => $smtpHost,
                    'mail.mailers.smtp.port' => Setting::getValue('smtp_port', '587'),
                    'mail.mailers.smtp.username' => Setting::getValue('smtp_username'),
                    'mail.mailers.smtp.password' => Setting::getValue('smtp_password'),
                    'mail.mailers.smtp.encryption' => Setting::getValue('smtp_port') == '465' ? 'ssl' : 'tls',
                    'mail.from.address' => Setting::getValue('smtp_from_address', 'no-reply@zawawalk.com'),
                    'mail.from.name' => Setting::getValue('smtp_from_name', 'Panitia Zawawalk'),
                ]);
                Mail::forgetMailers();
            }

            $rawSubject = $template->email_subject ?: ($template->subject ?: '');
            $rawBody = $template->email_body ?: $template->body;
            if (str_contains($rawBody, '{email_narrative}')) {
                $narrative = $template->email_narrative ?: $template->body;
                $rawBody = str_replace('{email_narrative}', $narrative, $rawBody);
            }
            $parsedSubject = $this->parseTemplatePlaceholders($rawSubject, $attendee, $fullName);
            $parsedBody = $this->parseTemplatePlaceholders($rawBody, $attendee, $fullName);

            try {
                Mail::to($email)->send(new BroadcastMail($parsedSubject, $parsedBody, $template->email_banner));
                $log->update([
                    'recipient' => $email,
                    'status' => 'sent',
                    'sent_at' => now(),
                ]);
            } catch (\Exception $e) {
                $log->update([
                    'recipient' => $email,
                    'status' => 'failed',
                    'error_message' => $e->getMessage(),
                ]);
            }
        } elseif ($this->channel === 'whatsapp_fonnte') {
            if (!$phone) {
                $log->update([
                    'status' => 'failed',
                    'error_message' => 'Nomor WhatsApp tidak ditemukan.',
                ]);
                return;
            }

            $fonnteToken = Setting::getValue('fonnte_token');
            if (!$fonnteToken) {
                $log->update([
                    'recipient' => $phone,
                    'status' => 'failed',
                    'error_message' => 'Token Fonnte belum dikonfigurasi.',
                ]);
                return;
            }

            $rawBody = $template->whatsapp_body ?: $template->body;
            $parsedBody = $this->parseTemplatePlaceholders($rawBody, $attendee, $fullName);

            $sent = EventController::sendWhatsappViaFonnte($phone, $parsedBody, $fonnteToken);
            if ($sent) {
                $log->update([
                    'recipient' => $phone,
                    'status' => 'sent',
                    'sent_at' => now(),
                ]);
            } else {
                $log->update([
                    'recipient' => $phone,
                    'status' => 'failed',
                    'error_message' => 'API Fonnte mengembalikan respon gagal atau timeout.',
                ]);
            }
        }
    }

    protected function parseTemplatePlaceholders($text, $attendee, $fullName)
    {
        return EventController::parsePlaceholders($text, $attendee);
    }
}
