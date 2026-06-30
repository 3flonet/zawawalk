<?php

namespace App\Mail;

use App\Models\Attendee;
use App\Models\Setting;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class AdminRegistrationNotificationMail extends Mailable
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
            subject: '[Pendaftaran Baru] Transfer Manual - ' . $eventTitle . ' [' . $this->attendee->ticket_code . ']',
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
        $email = $email ?: '-';

        $phone = $attendee->registration_data['whatsapp'] ?? null;
        if (!$phone) {
            foreach ($attendee->registration_data as $k => $v) {
                if (str_contains(strtolower($k), 'whatsapp') || str_contains(strtolower($k), 'wa') || str_contains(strtolower($k), 'telp') || str_contains(strtolower($k), 'phone') || str_contains(strtolower($k), 'hp')) {
                    $phone = $v;
                    break;
                }
            }
        }
        $phone = $phone ?: '-';

        $ticketCode = $attendee->ticket_code;
        $totalPrice = number_format($attendee->registration_data['total_price'] ?? 0, 0, ',', '.');
        $confirmationUrl = route('event.confirm_payment', $ticketCode);
        $eventLocation = Setting::getValue('event_location', '-');
        $attendanceMode = strtoupper($attendee->registration_data['attendance_mode'] ?? 'OFFLINE');

        // Build merchandise details
        $merchandiseHtml = '';
        $merchTotal = floatval($attendee->registration_data['merchandise_total'] ?? 0);
        if (isset($attendee->registration_data['selected_merchandise']) && is_array($attendee->registration_data['selected_merchandise']) && count($attendee->registration_data['selected_merchandise']) > 0) {
            $merchandiseHtml = '<tr><td colspan="2" style="padding: 12px 0 4px 0; font-weight: bold; border-bottom: 1px solid #e5e7eb; text-transform: uppercase; font-size: 11px; color: #6b7280;">👕 MERCHANDISE</td></tr>';
            foreach ($attendee->registration_data['selected_merchandise'] as $m) {
                $detail = htmlspecialchars($m['name'] ?? '');
                if (!empty($m['size'])) $detail .= " (Size: " . htmlspecialchars($m['size']) . ")";
                if (!empty($m['nickname'])) $detail .= " [Nama: " . htmlspecialchars($m['nickname']) . "]";
                $price = floatval($m['price'] ?? 0);
                $merchandiseHtml .= '<tr><td style="padding: 4px 0; border-bottom: 1px solid #e5e7eb;">' . $detail . '</td><td style="padding: 4px 0; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: bold;">Rp ' . number_format($price, 0, ',', '.') . '</td></tr>';
            }
        }

        $donationHtml = '';
        if (isset($attendee->registration_data['donation_amount']) && floatval($attendee->registration_data['donation_amount']) > 0) {
            $donationHtml = '<tr><td style="padding: 8px 0; font-weight: bold; border-bottom: 1px solid #e5e7eb;">DONASI</td><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: bold; color: #059669;">: Rp ' . number_format(floatval($attendee->registration_data['donation_amount']), 0, ',', '.') . '</td></tr>';
        }

        $voucherHtml = '';
        $discount = floatval($attendee->registration_data['discount_amount'] ?? 0);
        $voucherCode = $attendee->registration_data['voucher_code'] ?? '';
        $voucherType = $attendee->registration_data['voucher_type'] ?? '';
        $voucherValue = $attendee->registration_data['voucher_value'] ?? '';
        if ($discount > 0) {
            $voucherDetail = '';
            if ($voucherType && $voucherValue) {
                $voucherDetail = ' (' . ($voucherType === 'percentage' ? $voucherValue . '%' : 'Rp ' . number_format(floatval($voucherValue), 0, ',', '.')) . ')';
            }
            $voucherHtml = '<tr><td style="padding: 8px 0; font-weight: bold; border-bottom: 1px solid #e5e7eb;">DISKON VOUCHER (' . htmlspecialchars($voucherCode) . ')' . $voucherDetail . '</td><td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: bold; color: #16a34a;">: - Rp ' . number_format($discount, 0, ',', '.') . '</td></tr>';
        }

        $eventTitle = Setting::getValue('event_title', 'Zawawalk 2026: The Fun Walk Festival');

        return '
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Pendaftaran Baru</title>
        </head>
        <body style="margin: 0; padding: 20px; font-family: \'Courier New\', Courier, monospace; background-color: #f3f4f6; color: #000000;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 4px solid #000000; box-shadow: 8px 8px 0px #000000; padding: 30px;">
                <div style="border-bottom: 4px dashed #000000; padding-bottom: 20px; margin-bottom: 20px; text-align: center;">
                    <span style="font-size: 12px; font-weight: 900; letter-spacing: 2px; text-transform: uppercase; background-color: #facc15; padding: 3px 8px; border: 2px solid #000000;">Pemberitahuan Admin</span>
                    <h2 style="margin: 15px 0 5px 0; font-size: 22px; font-weight: 900; text-transform: uppercase; letter-spacing: -0.5px;">Pendaftaran Baru Terdeteksi</h2>
                    <p style="margin: 0; font-size: 14px; font-weight: bold; color: #4b5563;">Metode Pembayaran: Transfer Manual (Offline)</p>
                </div>

                <div style="margin-bottom: 25px;">
                    <p style="font-size: 14px; line-height: 1.6; margin: 0 0 15px 0;">Halo Admin, pendaftaran baru dengan metode transfer manual telah diterima dan membutuhkan verifikasi pembayaran:</p>
                    
                    <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold; border-bottom: 1px solid #e5e7eb; width: 150px;">KODE TIKET</td>
                            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; font-weight: bold;">: ' . htmlspecialchars($ticketCode) . '</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold; border-bottom: 1px solid #e5e7eb;">NAMA LENGKAP</td>
                            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">: ' . htmlspecialchars($fullName) . '</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold; border-bottom: 1px solid #e5e7eb;">NO. WHATSAPP</td>
                            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">: ' . htmlspecialchars($phone) . '</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold; border-bottom: 1px solid #e5e7eb;">EMAIL</td>
                            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">: ' . htmlspecialchars($email) . '</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold; border-bottom: 1px solid #e5e7eb;">TOTAL BAYAR</td>
                            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; font-weight: bold; color: #b91c1c;">: Rp ' . $totalPrice . '</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold; border-bottom: 1px solid #e5e7eb;">KEHADIRAN</td>
                            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">: ' . htmlspecialchars($attendanceMode) . '</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px 0; font-weight: bold; border-bottom: 1px solid #e5e7eb;">LOKASI</td>
                            <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">: ' . htmlspecialchars($eventLocation) . '</td>
                        </tr>
                        ' . $merchandiseHtml . '
                        ' . $donationHtml . '
                        ' . $voucherHtml . '
                    </table>
                </div>

                <div style="text-align: center; margin: 30px 0;">
                    <a href="' . htmlspecialchars($confirmationUrl) . '" style="display: inline-block; background-color: #000000; color: #ffffff; text-decoration: none; padding: 12px 25px; font-weight: 900; text-transform: uppercase; font-size: 14px; border: 2px solid #000000; box-shadow: 4px 4px 0px #facc15; transition: all 0.2s;">
                        Konfirmasi Pembayaran &rarr;
                    </a>
                    <div style="margin-top: 10px; font-size: 11px; color: #6b7280;">
                        *Masukkan passcode keamanan saat diminta untuk mengakses halaman verifikasi ini.
                    </div>
                </div>

                <div style="border-top: 4px dashed #000000; padding-top: 15px; margin-top: 20px; font-size: 11px; text-align: center; color: #6b7280;">
                    <p style="margin: 0 0 5px 0;">Sistem Pendaftaran Otomatis - ' . htmlspecialchars($eventTitle) . '</p>
                    <p style="margin: 0;">Email ini dihasilkan secara otomatis oleh sistem, mohon tidak membalas langsung.</p>
                </div>
            </div>
        </body>
        </html>
        ';
    }
}
