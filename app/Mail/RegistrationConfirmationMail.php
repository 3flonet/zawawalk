<?php

namespace App\Mail;

use App\Models\Attendee;
use App\Models\Setting;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class RegistrationConfirmationMail extends Mailable
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
            subject: '[Konfirmasi Pendaftaran] ' . $eventTitle . ' — ' . $this->attendee->ticket_code,
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

        // --- Extract Name ---
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

        // --- Payment & Price Info ---
        $ticketCode      = $attendee->ticket_code;
        $paymentStatus   = $attendee->payment_status; // pending | paid
        $paymentMethod   = $attendee->payment_method; // manual | midtrans
        $totalPrice      = floatval($attendee->registration_data['total_price'] ?? 0);
        $ticketPrice     = floatval($attendee->registration_data['ticket_price'] ?? 0);
        $uniqueCode      = intval($attendee->registration_data['unique_code'] ?? 0);
        $merchTotal      = floatval($attendee->registration_data['merchandise_total'] ?? 0);
        $donationAmount  = floatval($attendee->registration_data['donation_amount'] ?? 0);
        $discount        = floatval($attendee->registration_data['discount_amount'] ?? 0);
        $voucherCode     = $attendee->registration_data['voucher_code'] ?? '';
        $voucherType     = $attendee->registration_data['voucher_type'] ?? '';
        $voucherValue    = $attendee->registration_data['voucher_value'] ?? '';
        $attendanceMode  = strtoupper($attendee->registration_data['attendance_mode'] ?? 'OFFLINE');

        // --- Settings ---
        $eventTitle     = Setting::getValue('event_title', 'Zawawalk 2026: The Fun Walk Festival');
        $eventDate      = Setting::getValue('event_date', '-');
        $eventTime      = Setting::getValue('event_time', '-');
        $eventLocation  = Setting::getValue('event_location', '-');
        $bankName       = Setting::getValue('payment_manual_bank_name', 'Bank');
        $accountNumber  = Setting::getValue('payment_manual_account_number', '-');
        $accountName    = Setting::getValue('payment_manual_account_name', '-');
        $ticketUrl      = route('event.success', $ticketCode);

        $isPaid = $paymentStatus === 'paid' || $totalPrice == 0;

        // --- Status Banner ---
        if ($isPaid) {
            $statusBg    = '#dcfce7';
            $statusBorder = '#16a34a';
            $statusText  = '✅ PENDAFTARAN BERHASIL & TERVERIFIKASI';
            $statusSub   = 'Pembayaran Anda telah dikonfirmasi. E-Tiket resmi Anda sudah aktif.';
        } else {
            $statusBg    = '#fef9c3';
            $statusBorder = '#ca8a04';
            $statusText  = '⏳ PENDAFTARAN BERHASIL — MENUNGGU PEMBAYARAN';
            $statusSub   = 'Data pendaftaran Anda telah kami simpan. Silakan selesaikan pembayaran untuk mengaktifkan E-Tiket.';
        }

        // --- Payment Instructions Block (hanya untuk manual + pending + total > 0) ---
        $paymentBlock = '';
        if (!$isPaid && $paymentMethod === 'manual' && $totalPrice > 0) {
            $breakdown = '';

            if ($ticketPrice > 0) {
                $breakdown .= '
                <tr>
                    <td style="padding: 6px 0; font-size: 12px; color: #374151; border-bottom: 1px solid #e5e7eb;">🎟️ Tiket Registrasi</td>
                    <td style="padding: 6px 0; font-size: 12px; font-weight: bold; text-align: right; border-bottom: 1px solid #e5e7eb;">Rp ' . number_format($ticketPrice, 0, ',', '.') . '</td>
                </tr>';
            }

            // Merchandise rows
            if (isset($attendee->registration_data['selected_merchandise']) &&
                is_array($attendee->registration_data['selected_merchandise']) &&
                count($attendee->registration_data['selected_merchandise']) > 0) {
                foreach ($attendee->registration_data['selected_merchandise'] as $m) {
                    $detail = htmlspecialchars($m['name'] ?? '');
                    if (!empty($m['size'])) $detail .= ' (Size: ' . htmlspecialchars($m['size']) . ')';
                    if (!empty($m['nickname'])) $detail .= ' [Nama: ' . htmlspecialchars($m['nickname']) . ']';
                    $mPrice = floatval($m['price'] ?? 0);
                    $breakdown .= '
                    <tr>
                        <td style="padding: 6px 0; font-size: 12px; color: #374151; border-bottom: 1px solid #e5e7eb;">👕 ' . $detail . '</td>
                        <td style="padding: 6px 0; font-size: 12px; font-weight: bold; text-align: right; border-bottom: 1px solid #e5e7eb;">Rp ' . number_format($mPrice, 0, ',', '.') . '</td>
                    </tr>';
                }
            }

            // Donation row
            if ($donationAmount > 0) {
                $breakdown .= '
                <tr>
                    <td style="padding: 6px 0; font-size: 12px; color: #374151; border-bottom: 1px solid #e5e7eb;">🎁 Donasi Sukarela</td>
                    <td style="padding: 6px 0; font-size: 12px; font-weight: bold; text-align: right; border-bottom: 1px solid #e5e7eb;">Rp ' . number_format($donationAmount, 0, ',', '.') . '</td>
                </tr>';
            }

            // Unique code row
            if ($uniqueCode > 0) {
                $breakdown .= '
                <tr>
                    <td style="padding: 6px 0; font-size: 12px; color: #dc2626; font-weight: bold; border-bottom: 1px solid #e5e7eb;">🔢 Kode Unik (identifikasi transfer)</td>
                    <td style="padding: 6px 0; font-size: 12px; font-weight: bold; color: #dc2626; text-align: right; border-bottom: 1px solid #e5e7eb;">+ Rp ' . number_format($uniqueCode, 0, ',', '.') . '</td>
                </tr>';
            }

            // Voucher discount row
            if ($discount > 0) {
                $voucherDetail = '';
                if ($voucherType && $voucherValue) {
                    $voucherDetail = ' (' . ($voucherType === 'percentage' ? $voucherValue . '%' : 'Rp ' . number_format(floatval($voucherValue), 0, ',', '.')) . ')';
                }
                $breakdown .= '
                <tr>
                    <td style="padding: 6px 0; font-size: 12px; color: #16a34a; font-weight: bold; border-bottom: 1px solid #e5e7eb;">🎟️ Voucher Diskon (' . htmlspecialchars($voucherCode) . ')' . $voucherDetail . '</td>
                    <td style="padding: 6px 0; font-size: 12px; font-weight: bold; color: #16a34a; text-align: right; border-bottom: 1px solid #e5e7eb;">- Rp ' . number_format($discount, 0, ',', '.') . '</td>
                </tr>';
            }

            $paymentBlock = '
            <div style="border: 3px solid #f97316; background-color: #fff7ed; padding: 20px; margin: 20px 0;">
                <h4 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 900; text-transform: uppercase; color: #c2410c; border-bottom: 2px dashed #f97316; padding-bottom: 8px;">
                    💳 INSTRUKSI PEMBAYARAN TRANSFER MANUAL
                </h4>

                <table style="width: 100%; border-collapse: collapse; margin-bottom: 12px;">
                    ' . $breakdown . '
                    <tr>
                        <td style="padding: 10px 0 4px 0; font-size: 13px; font-weight: 900; text-transform: uppercase; color: #111827;">TOTAL YANG HARUS DITRANSFER</td>
                        <td style="padding: 10px 0 4px 0; font-size: 18px; font-weight: 900; text-align: right; color: #dc2626;">Rp ' . number_format($totalPrice, 0, ',', '.') . '</td>
                    </tr>
                </table>

                <div style="background-color: #fff; border: 2px solid #f97316; padding: 12px; margin-bottom: 12px;">
                    <p style="margin: 0 0 4px 0; font-size: 10px; font-weight: 800; text-transform: uppercase; color: #6b7280;">Rekening Tujuan Transfer</p>
                    <p style="margin: 0; font-size: 14px; font-weight: 900; color: #111827;">' . htmlspecialchars($bankName) . ': <span style="font-family: monospace; background-color: #fef3c7; padding: 2px 6px;">' . htmlspecialchars($accountNumber) . '</span></p>
                    <p style="margin: 4px 0 0 0; font-size: 12px; font-weight: bold; color: #6b7280;">a/n ' . htmlspecialchars($accountName) . '</p>
                </div>

                <p style="margin: 0; font-size: 12px; font-weight: bold; color: #92400e; background-color: #fef3c7; padding: 10px; border-left: 4px solid #f59e0b;">
                    ⚠️ <strong>PENTING:</strong> Transfer tepat sejumlah <strong>Rp ' . number_format($totalPrice, 0, ',', '.') . '</strong> (termasuk 3 digit kode unik di akhir) agar pembayaran Anda dapat diverifikasi secara otomatis oleh panitia.
                </p>

                <div style="margin-top: 16px; text-align: center;">
                    <a href="' . htmlspecialchars($ticketUrl) . '" style="background-color: #f97316; color: #ffffff; border: 2px solid #000; text-decoration: none; font-weight: 900; font-size: 13px; text-transform: uppercase; padding: 12px 24px; display: inline-block; box-shadow: 3px 3px 0px #000;">
                        BUKA HALAMAN TIKET &amp; UPLOAD BUKTI TRANSFER →
                    </a>
                    <p style="margin: 8px 0 0 0; font-size: 10px; color: #9ca3af; font-weight: bold;">
                        Klik tombol di atas untuk mengakses halaman tiket Anda, mengunggah bukti transfer, dan memantau status pembayaran.
                    </p>
                </div>
            </div>';
        }

        // --- View Ticket Button (untuk semua kasus) ---
        $viewTicketBtn = '';
        if ($isPaid) {
            $viewTicketBtn = '
            <div style="text-align: center; margin: 25px 0 15px 0;">
                <a href="' . htmlspecialchars($ticketUrl) . '" style="background-color: #22d3ee; color: #000000; border: 3px solid #000000; text-decoration: none; font-weight: 900; font-size: 13px; text-transform: uppercase; padding: 12px 25px; display: inline-block; box-shadow: 3px 3px 0px #000000;">
                    🎫 LIHAT &amp; UNDUH E-TIKET RESMI
                </a>
                <p style="margin: 8px 0 0 0; font-size: 10px; color: #9ca3af; font-weight: bold;">
                    Simpan halaman tiket ini, atau screenshot QR Code untuk digunakan saat check-in di lokasi.
                </p>
            </div>';
        }

        // --- Ticket Summary (selalu ditampilkan) ---
        $summaryRows = '
        <tr>
            <td style="padding: 5px 0; font-size: 12px; font-weight: bold; color: #6b7280; text-transform: uppercase; width: 40%;">Kode Tiket</td>
            <td style="padding: 5px 0; font-size: 13px; font-weight: 900; letter-spacing: 1px; color: #111827;">: ' . $ticketCode . '</td>
        </tr>
        <tr>
            <td style="padding: 5px 0; font-size: 12px; font-weight: bold; color: #6b7280; text-transform: uppercase;">Nama Lengkap</td>
            <td style="padding: 5px 0; font-size: 12px; font-weight: bold; color: #111827;">: ' . htmlspecialchars($fullName) . '</td>
        </tr>
        <tr>
            <td style="padding: 5px 0; font-size: 12px; font-weight: bold; color: #6b7280; text-transform: uppercase;">Mode Kehadiran</td>
            <td style="padding: 5px 0; font-size: 12px; font-weight: bold; color: #111827;">: ' . $attendanceMode . '</td>
        </tr>
        <tr>
            <td style="padding: 5px 0; font-size: 12px; font-weight: bold; color: #6b7280; text-transform: uppercase;">Total Pembayaran</td>
            <td style="padding: 5px 0; font-size: 12px; font-weight: bold; color: #dc2626;">: Rp ' . number_format($totalPrice, 0, ',', '.') . '</td>
        </tr>';
        
        if ($discount > 0) {
            $voucherDetail = '';
            if ($voucherType && $voucherValue) {
                $voucherDetail = ' (' . ($voucherType === 'percentage' ? $voucherValue . '%' : 'Rp ' . number_format(floatval($voucherValue), 0, ',', '.')) . ')';
            }
            $summaryRows .= '
            <tr>
                <td style="padding: 5px 0; font-size: 12px; font-weight: bold; color: #6b7280; text-transform: uppercase;">Diskon Voucher</td>
                <td style="padding: 5px 0; font-size: 12px; font-weight: bold; color: #16a34a;">: - Rp ' . number_format($discount, 0, ',', '.') . ' (' . htmlspecialchars($voucherCode) . ')' . $voucherDetail . '</td>
            </tr>';
        }

        $summaryRows .= '
        <tr>
            <td style="padding: 5px 0; font-size: 12px; font-weight: bold; color: #6b7280; text-transform: uppercase;">Status</td>
            <td style="padding: 5px 0; font-size: 12px; font-weight: 900; color: ' . ($isPaid ? '#16a34a' : '#ca8a04') . ';">: ' . strtoupper($paymentStatus) . '</td>
        </tr>';

        return '
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>Konfirmasi Pendaftaran</title>
        </head>
        <body style="margin: 0; padding: 20px; background-color: #f3f4f6; font-family: sans-serif; color: #000000;">
            <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 4px solid #000000; padding: 25px; box-shadow: 6px 6px 0px #000000;">

                <!-- Header -->
                <div style="background-color: #fde047; border: 3px solid #000000; padding: 15px; text-align: center; margin-bottom: 20px; box-shadow: 3px 3px 0px #000000;">
                    <h2 style="margin: 0; font-size: 20px; font-weight: 900; text-transform: uppercase; letter-spacing: 1px;">📋 KONFIRMASI PENDAFTARAN</h2>
                    <p style="margin: 5px 0 0 0; font-size: 12px; font-weight: bold; text-transform: uppercase; color: #4b5563;">' . htmlspecialchars($eventTitle) . '</p>
                </div>

                <!-- Status Banner -->
                <div style="background-color: ' . $statusBg . '; border: 3px solid ' . $statusBorder . '; padding: 14px; margin-bottom: 20px; text-align: center;">
                    <p style="margin: 0 0 4px 0; font-size: 14px; font-weight: 900; text-transform: uppercase;">' . $statusText . '</p>
                    <p style="margin: 0; font-size: 12px; font-weight: bold; color: #374151;">' . $statusSub . '</p>
                </div>

                <!-- Greeting -->
                <p style="font-size: 14px; line-height: 1.6; font-weight: bold; margin: 0 0 5px 0;">
                    Halo ' . htmlspecialchars($fullName) . ',
                </p>
                <p style="font-size: 13px; line-height: 1.6; color: #374151; margin: 0 0 20px 0;">
                    Terima kasih telah mendaftar di <strong>' . htmlspecialchars($eventTitle) . '</strong>!
                    Berikut adalah ringkasan pendaftaran Anda.
                </p>

                <!-- Ticket Summary Card -->
                <div style="border: 2px solid #000000; background-color: #f9fafb; padding: 16px; margin-bottom: 20px;">
                    <h4 style="margin: 0 0 12px 0; font-size: 13px; font-weight: 900; text-transform: uppercase; border-bottom: 2px solid #000000; padding-bottom: 8px;">🎫 RINGKASAN PENDAFTARAN</h4>
                    <table style="width: 100%; border-collapse: collapse;">
                        ' . $summaryRows . '
                    </table>
                </div>

                <!-- Event Details -->
                <div style="border: 2px solid #000000; background-color: #f9fafb; padding: 15px; margin-bottom: 20px;">
                    <h4 style="margin: 0 0 10px 0; font-size: 13px; font-weight: 900; text-transform: uppercase; border-bottom: 2px solid #000000; padding-bottom: 8px;">📍 DETAIL ACARA</h4>
                    <p style="margin: 4px 0; font-size: 12px;"><strong>Tanggal:</strong> ' . htmlspecialchars($eventDate) . '</p>
                    <p style="margin: 4px 0; font-size: 12px;"><strong>Waktu:</strong> ' . htmlspecialchars($eventTime) . '</p>
                    <p style="margin: 4px 0; font-size: 12px;"><strong>Lokasi:</strong> ' . htmlspecialchars($eventLocation) . '</p>
                </div>

                ' . $paymentBlock . '

                ' . $viewTicketBtn . '

                <!-- Footer -->
                <div style="border-top: 2px solid #e5e7eb; padding-top: 15px; text-align: center; font-size: 11px; color: #9ca3af; font-weight: bold; text-transform: uppercase;">
                    Simpan email ini sebagai bukti pendaftaran Anda. &bull; ' . htmlspecialchars($eventTitle) . '
                </div>
            </div>
        </body>
        </html>
        ';
    }
}
