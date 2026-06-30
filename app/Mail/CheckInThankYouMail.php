<?php

namespace App\Mail;

use App\Models\Attendee;
use App\Models\Setting;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class CheckInThankYouMail extends Mailable
{
    use Queueable, SerializesModels;

    public Attendee $attendee;

    public function __construct(Attendee $attendee)
    {
        $this->attendee = $attendee;
    }

    public function envelope(): Envelope
    {
        $eventTitle = Setting::getValue('event_title', 'Zawawalk 2026');
        return new Envelope(
            subject: 'Pengambilan Racepack Berhasil: ' . $eventTitle,
        );
    }

    public function content(): Content
    {
        return new Content(
            htmlString: $this->buildHtml(),
        );
    }

    protected function buildHtml(): string
    {
        $attendee = $this->attendee;
        
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

        $eventTitle = Setting::getValue('event_title', 'Zawawalk 2026: The Fun Walk Festival');

        return '
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Konfirmasi Pengambilan Racepack</title>
        </head>
        <body style="margin: 0; padding: 20px; background-color: #f3f4f6; font-family: sans-serif; color: #000000;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 4px solid #000000; padding: 25px; box-shadow: 6px 6px 0px #000000;">
                
                <!-- Header Banner -->
                <div style="background-color: #f472b6; border: 3px solid #000000; padding: 15px; text-align: center; margin-bottom: 20px; box-shadow: 3px 3px 0px #000000;">
                    <h2 style="margin: 0; font-size: 20px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px; color: #ffffff; text-shadow: 2px 2px 0px #000000;">✨ RACEPACK DIAMBIL ✨</h2>
                </div>

                <!-- Greeting -->
                <p style="font-size: 16px; line-height: 1.5; font-weight: bold;">
                    Halo ' . htmlspecialchars($fullName) . ',
                </p>
                <p style="font-size: 14px; line-height: 1.6; color: #111827;">
                    Konfirmasi bahwa racepack pendaftaran Anda untuk acara <strong>' . htmlspecialchars($eventTitle) . '</strong> telah berhasil diambil!
                </p>
                
                <div style="background-color: #ecfdf5; border: 3px solid #000000; padding: 20px; margin: 25px 0; text-align: center; box-shadow: 4px 4px 0px #10b981;">
                    <p style="margin: 0; font-size: 15px; font-weight: 800; color: #065f46; text-transform: uppercase;">
                        Selamat menikmati keseruan jalan santai dan raih doorprize hari ini!
                    </p>
                </div>

                <!-- Documentation Banner -->
                <div style="border: 2px solid #000000; padding: 15px; margin-bottom: 25px; background-color: #fef08a;">
                    <h4 style="margin: 0 0 10px 0; font-size: 14px; font-weight: 900; text-transform: uppercase; color: #854d0e;">📸 DOKUMENTASI ACARA</h4>
                    <p style="margin: 0 0 10px 0; font-size: 12px; color: #3f2c00; line-height: 1.5;">
                        Pantau terus keseruan hari ini! Dokumentasi acara akan diunggah secara berkala oleh tim kami. Anda dapat mengeceknya berulang kali melalui tautan resmi kami.
                    </p>
                </div>

                <!-- Footer disclaimer -->
                <div style="border-top: 2px solid #000000; padding-top: 15px; text-align: center; font-size: 11px; color: #4b5563; font-weight: bold; text-transform: uppercase;">
                    Jika ada pertanyaan lebih lanjut, silakan temui panitia di meja registrasi atau pusat informasi.
                </div>
            </div>
        </body>
        </html>
        ';
    }
}
