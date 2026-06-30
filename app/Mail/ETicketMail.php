<?php

namespace App\Mail;

use App\Models\Attendee;
use App\Models\Setting;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class ETicketMail extends Mailable
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
            subject: 'E-Ticket Resmi: ' . $eventTitle . ' [' . $this->attendee->ticket_code . ']',
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

        $ticketCode = $attendee->ticket_code;
        $eventTitle = Setting::getValue('event_title', 'Zawawalk 2026: The Fun Walk Festival');
        $eventDate = Setting::getValue('event_date', '26/09/2026');
        $eventTime = Setting::getValue('event_time', '06.00 - 10.00 AM');
        $eventLocation = Setting::getValue('event_location', 'Balai Kartini');
        $attendanceMode = strtoupper($attendee->registration_data['attendance_mode'] ?? 'OFFLINE');
        
        $merchandiseSection = '';
        if (isset($attendee->registration_data['selected_merchandise']) && is_array($attendee->registration_data['selected_merchandise']) && count($attendee->registration_data['selected_merchandise']) > 0) {
            $merchandiseSection = '
            <div style="border: 2px solid #000000; background-color: #f9fafb; padding: 15px; margin-bottom: 20px;">
                <h4 style="margin: 0 0 10px 0; font-size: 14px; font-weight: 900; text-transform: uppercase; border-bottom: 2px solid #000000; padding-bottom: 5px;">👕 DETAIL MERCHANDISE</h4>';
            foreach ($attendee->registration_data['selected_merchandise'] as $m) {
                $detail = htmlspecialchars($m['name'] ?? '');
                if (!empty($m['size'])) {
                    $detail .= " (Size: " . htmlspecialchars($m['size']) . ")";
                }
                if (!empty($m['nickname'])) {
                    $detail .= " [Nama: " . htmlspecialchars($m['nickname']) . "]";
                }
                $price = floatval($m['price'] ?? 0);
                $merchandiseSection .= '<p style="margin: 4px 0; font-size: 12px;"><strong>' . $detail . ':</strong> Rp ' . number_format($price, 0, ',', '.') . '</p>';
            }
            $merchandiseSection .= '</div>';
        }

        $donationSection = '';
        if (isset($attendee->registration_data['donation_amount']) && floatval($attendee->registration_data['donation_amount']) > 0) {
            $donationSection = '
            <div style="border: 2px solid #000000; background-color: #ecfdf5; border-color: #10b981; padding: 15px; margin-bottom: 20px;">
                <p style="margin: 0; font-size: 13px; font-weight: bold; color: #065f46;">
                    🎁 Terima kasih atas donasi Anda sebesar Rp ' . number_format(floatval($attendee->registration_data['donation_amount']), 0, ',', '.') . '! Kontribusi Anda sangat berarti bagi kelancaran acara ini.
                </p>
            </div>';
        }

        $streamingDetails = '';
        if ($attendanceMode === 'ONLINE' || $attendanceMode === 'HYBRID') {
            $platform = Setting::getValue('event_platform', 'zoom');
            $platformName = ($platform === 'zoom') ? 'Zoom Meeting' : 
                            (($platform === 'google_meet') ? 'Google Meet' : 
                            (($platform === 'youtube') ? 'YouTube Live' : Setting::getValue('event_platform_custom_name', 'Custom Platform')));
            $url = Setting::getValue('event_platform_url', '');
            $meetingId = Setting::getValue('event_platform_id', '');
            $passcode = Setting::getValue('event_platform_passcode', '');
            
            $streamingDetails = '
            <div style="margin-top: 15px; padding: 15px; background-color: #ecfeff; border: 2px solid #000000; font-family: sans-serif;">
                <h4 style="margin: 0 0 10px 0; font-size: 14px; font-weight: 900; text-transform: uppercase; color: #0891b2;">⚡ DETAIL ONLINE STREAMING</h4>
                <p style="margin: 4px 0; font-size: 12px;"><strong>Platform:</strong> ' . $platformName . '</p>';
            if ($url) {
                $streamingDetails .= '<p style="margin: 4px 0; font-size: 12px;"><strong>Link URL:</strong> <a href="' . $url . '" style="color: #06b6d4; font-weight: bold; text-decoration: underline;">Klik di sini untuk bergabung</a></p>';
            }
            if ($meetingId) {
                $streamingDetails .= '<p style="margin: 4px 0; font-size: 12px;"><strong>Meeting ID:</strong> ' . $meetingId . '</p>';
            }
            if ($passcode) {
                $streamingDetails .= '<p style="margin: 4px 0; font-size: 12px;"><strong>Passcode:</strong> ' . $passcode . '</p>';
            }
            $streamingDetails .= '</div>';
        }

        $qrCodeUrl = 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=' . urlencode($ticketCode);
        $ticketOnlineLink = route('event.success', $ticketCode);

        return '
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>E-Ticket Resmi</title>
        </head>
        <body style="margin: 0; padding: 20px; background-color: #f3f4f6; font-family: sans-serif; color: #000000;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 4px solid #000000; padding: 25px; box-shadow: 6px 6px 0px #000000;">
                
                <!-- Header Banner -->
                <div style="background-color: #fde047; border: 3px solid #000000; padding: 15px; text-align: center; margin-bottom: 20px; box-shadow: 3px 3px 0px #000000;">
                    <h2 style="margin: 0; font-size: 20px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px;">🎫 E-TICKET RESMI</h2>
                    <p style="margin: 5px 0 0 0; font-size: 12px; font-weight: bold; text-transform: uppercase; color: #4b5563;">' . $eventTitle . '</p>
                </div>

                <!-- Greeting -->
                <p style="font-size: 14px; line-height: 1.5; font-weight: bold;">
                    Halo ' . htmlspecialchars($fullName) . ',
                </p>
                <p style="font-size: 13px; line-height: 1.5; color: #374151;">
                    Pendaftaran Anda telah berhasil dikonfirmasi dan terverifikasi! Di bawah ini adalah rincian E-Ticket resmi Anda yang dapat digunakan untuk masuk ke lokasi acara.
                </p>

                <!-- Ticket Card -->
                <div style="background-color: #fffbeb; border: 3px solid #000000; padding: 20px; margin: 25px 0; position: relative;">
                    <div style="text-align: center; margin-bottom: 15px;">
                        <img src="' . $qrCodeUrl . '" alt="QR Code Tiket" style="border: 2px solid #000000; background-color: #ffffff; padding: 5px; width: 130px; height: 130px;" />
                    </div>
                    
                    <div style="text-align: center; border-bottom: 2px dashed #000000; padding-bottom: 12px; margin-bottom: 12px;">
                        <span style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #6b7280; tracking: 1px;">KODE TIKET</span>
                        <div style="font-size: 24px; font-weight: 900; letter-spacing: 2px; color: #000000; margin-top: 4px;">' . $ticketCode . '</div>
                    </div>

                    <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
                        <tr>
                            <td style="padding: 4px 0; color: #6b7280; font-weight: bold; text-transform: uppercase; width: 35%;">Nama Lengkap</td>
                            <td style="padding: 4px 0; font-weight: bold;">: ' . htmlspecialchars($fullName) . '</td>
                        </tr>
                        <tr>
                            <td style="padding: 4px 0; color: #6b7280; font-weight: bold; text-transform: uppercase;">Kehadiran</td>
                            <td style="padding: 4px 0; font-weight: bold;">: <span style="background-color: #cffafe; border: 1px solid #000000; padding: 1px 6px; font-size: 10px; font-weight: 900;">' . $attendanceMode . '</span></td>
                        </tr>
                        <tr>
                            <td style="padding: 4px 0; color: #6b7280; font-weight: bold; text-transform: uppercase;">Status Tiket</td>
                            <td style="padding: 4px 0; font-weight: bold; color: #16a34a;">: LUNAS / PAID (Terverifikasi)</td>
                        </tr>
                    </table>
                </div>

                ' . $donationSection . '
                ' . $merchandiseSection . '

                <!-- Event Details -->
                <div style="border: 2px solid #000000; background-color: #f9fafb; padding: 15px; margin-bottom: 20px;">
                    <h4 style="margin: 0 0 10px 0; font-size: 14px; font-weight: 900; text-transform: uppercase; border-bottom: 2px solid #000000; padding-bottom: 5px;">📍 DETAIL ACARA</h4>
                    <p style="margin: 4px 0; font-size: 12px;"><strong>Tanggal:</strong> ' . $eventDate . '</p>
                    <p style="margin: 4px 0; font-size: 12px;"><strong>Waktu:</strong> ' . $eventTime . '</p>
                    <p style="margin: 4px 0; font-size: 12px;"><strong>Lokasi:</strong> ' . $eventLocation . '</p>
                    ' . $streamingDetails . '
                </div>

                <!-- Online Link Button -->
                <div style="text-align: center; margin: 25px 0 15px 0;">
                    <a href="' . $ticketOnlineLink . '" style="background-color: #22d3ee; color: #000000; border: 3px solid #000000; text-decoration: none; font-weight: 900; font-size: 13px; text-transform: uppercase; padding: 12px 25px; display: inline-block; box-shadow: 3px 3px 0px #000000;">
                        LIHAT TIKET ONLINE
                    </a>
                </div>

                <!-- Footer disclaimer -->
                <div style="border-top: 2px solid #e5e7eb; padding-top: 15px; text-align: center; font-size: 11px; color: #9ca3af; font-weight: bold; text-transform: uppercase;">
                    Harap simpan email ini atau tunjukkan QR Code di atas kepada panitia saat registrasi di lokasi.
                </div>
            </div>
        </body>
        </html>
        ';
    }
}
