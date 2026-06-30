<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Seed Users
        User::updateOrCreate(
            ['email' => 'admin@zawawalk.com'],
            [
                'name' => 'Admin Zawawalk',
                'password' => bcrypt('password'),
                'role' => 'admin',
            ]
        );

        User::updateOrCreate(
            ['email' => 'panitia@zawawalk.com'],
            [
                'name' => 'Panitia Zawawalk',
                'password' => bcrypt('password'),
                'role' => 'staff',
            ]
        );

        // Seed Settings
        $defaultSettings = [
            'event_title' => 'Zawawalk 2026: The Fun Walk Festival',
            'event_description' => 'Jalan santai bersama keluarga dan kerabat untuk hidup lebih sehat dan ceria. Dilengkapi dengan hiburan, doorprize menarik, check-point interaktif, dan berbagai stan kuliner.',
            'event_date' => '26/09/2026',
            'event_time' => '06.00 - 10.00 AM',
            'event_location' => 'Balai Kartini, Jakarta',
            'event_dresscode' => 'Kaos Zawawalk, Celana Olahraga, dan Sneakers',
            'event_type' => 'offline',
            'event_platform' => 'zoom',
            'event_platform_url' => 'https://zoom.us/j/1234567890',
            'event_platform_id' => '123 456 7890',
            'event_platform_passcode' => 'ZAWAWALK',
            'event_platform_custom_name' => '',
            'ticket_sending_method' => 'manual',
            'auto_send_ticket_email' => '0',
            'auto_send_ticket_whatsapp' => '0',
            'wa_admin_number' => '628123456789',
            'wa_custom_message' => 'Halo Admin, saya ingin konfirmasi bukti transfer Zawawalk. Nama: {name}, Kode Tiket: {ticket_code}.',
            'admin_passcode' => '123456',
            'notification_wa_numbers' => '628123456789',
            'notification_emails' => 'admin@zawawalk.com',
            'meta_description' => 'Jalan santai bersama keluarga dan kerabat untuk hidup lebih sehat dan ceria. Dilengkapi dengan hiburan, doorprize menarik, check-point interaktif, dan berbagai stan kuliner.',
            'meta_keywords' => 'zawawalk, fun walk, festival, tiket online, jalan santai',
            'og_title' => 'Zawawalk 2026: The Fun Walk Festival',
            'og_description' => 'Jalan santai bersama keluarga dan kerabat untuk hidup lebih sehat dan ceria. Dilengkapi dengan hiburan, doorprize menarik, check-point interaktif, dan berbagai stan kuliner.',
            'og_image' => '',
            'realtime_enabled' => '1',
            'realtime_stop_at' => '',
            'event_organized_by' => 'Panitia Zawawalk 2026',
            'event_organized_by_url' => 'https://instagram.com/zawawalk',
            'event_developed_by' => 'Zawawalk Dev Team',
            'event_developed_by_url' => 'https://github.com/zawawalk',
        ];

        foreach ($defaultSettings as $key => $value) {
            \App\Models\Setting::setValue($key, $value);
        }

        // Seed Default Form
        \App\Models\RegistrationForm::updateOrCreate(
            ['id' => 1],
            [
                'title' => 'Form Pendaftaran Zawawalk 2026',
                'ticket_price' => 150000.00,
                'is_active' => true,
                'fields_schema' => [
                    [
                        'name' => 'fullname',
                        'label' => 'Nama Lengkap',
                        'type' => 'text',
                        'required' => true,
                    ],
                    [
                        'name' => 'whatsapp',
                        'label' => 'No. WhatsApp',
                        'type' => 'text',
                        'required' => true,
                    ],
                    [
                        'name' => 'email',
                        'label' => 'Email',
                        'type' => 'email',
                        'required' => true,
                    ],
                ]
            ]
        );

        $emailThemeWrapper = "<div style='font-family: -apple-system, BlinkMacSystemFont, \"Segoe UI\", Roboto, Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #334155; padding: 5px 0;'>{email_narrative}</div>";

        // Seed Default Broadcast Templates
        \App\Models\BroadcastTemplate::updateOrCreate(
            ['name' => 'Notifikasi Pendaftaran Baru (Admin)'],
            [
                'subject' => '[ADMIN ALERT] Pendaftaran Baru - {ticket_code}',
                'body' => "⚠️ *PENDAFTARAN BARU* ⚠️\n\nTelah terdeteksi pendaftaran baru yang memerlukan verifikasi pembayaran:\n\n• *Kode Tiket*: {ticket_code}\n• *Nama*: {nama}\n• *Kehadiran*: {attendance_mode}\n• *Total*: {amount_paid}\n\nSilakan lakukan verifikasi pembayaran melalui tautan berikut:\n🔗 {confirm_payment_url}",
                'whatsapp_body' => "⚠️ *PENDAFTARAN BARU* ⚠️\n\nTelah terdeteksi pendaftaran baru yang memerlukan verifikasi pembayaran:\n\n• *Kode Tiket*: {ticket_code}\n• *Nama*: {nama}\n• *Kehadiran*: {attendance_mode}\n• *Total*: {amount_paid}\n\nSilakan lakukan verifikasi pembayaran melalui tautan berikut:\n🔗 {confirm_payment_url}",
                'email_subject' => '[ADMIN ALERT] Pendaftaran Baru - {ticket_code}',
                'email_body' => $emailThemeWrapper,
                'email_narrative' => "<div style='background-color: #fff1f2; border-left: 4px solid #f43f5e; padding: 20px; border-radius: 12px; margin: 10px 0;'><h3 style='color: #9f1239; margin-top: 0; font-size: 16px;'>⚠️ PENDAFTARAN BARU (MANUAL)</h3><p style='color: #4c0519; margin-bottom: 15px;'>Telah terdeteksi pendaftaran baru yang memerlukan verifikasi pembayaran:</p><table style='width: 100%; font-size: 13px; border-collapse: collapse;'><tr><td style='padding: 6px 0; color: #e11d48; font-weight: bold;'>Kode Tiket</td><td style='padding: 6px 0; font-weight: bold; color: #1e293b;'>{ticket_code}</td></tr><tr><td style='padding: 6px 0; color: #e11d48; font-weight: bold;'>Nama Lengkap</td><td style='padding: 6px 0; font-weight: bold; color: #1e293b;'>{nama}</td></tr><tr><td style='padding: 6px 0; color: #e11d48; font-weight: bold;'>Kehadiran</td><td style='padding: 6px 0; font-weight: bold; color: #1e293b;'>{attendance_mode}</td></tr><tr><td style='padding: 6px 0; color: #e11d48; font-weight: bold;'>Total Transfer</td><td style='padding: 6px 0; font-weight: bold; color: #1e293b; font-size: 14px;'>{amount_paid}</td></tr></table><div style='margin-top: 20px;'><a href='{confirm_payment_url}' style='display: inline-block; padding: 12px 24px; background-color: #e11d48; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;'>Verifikasi Pembayaran</a></div></div>",
            ]
        );

        \App\Models\BroadcastTemplate::updateOrCreate(
            ['name' => 'Konfirmasi Pendaftaran Awal'],
            [
                'subject' => 'Pendaftaran Berhasil - {event_title} ({ticket_code})',
                'body' => "Halo {nama},\n\nTerima kasih! Pendaftaran Anda di {event_title} telah berhasil dicatat dengan kode tiket: {ticket_code}.\n\nStatus Pembayaran: {payment_status}\nMetode Pembayaran: {payment_method}\nTotal Transfer: {amount_paid}\n\nSilakan selesaikan pembayaran/konfirmasi Anda melalui detail pembayaran berikut:\n{ticket_url}\n\nSalam,\nPanitia {event_title}",
                'whatsapp_body' => "Halo {nama},\n\nTerima kasih! Pendaftaran Anda di {event_title} telah berhasil dicatat dengan kode tiket: {ticket_code}.\n\nStatus Pembayaran: {payment_status}\nMetode Pembayaran: {payment_method}\nTotal Transfer: {amount_paid}\n\nSilakan selesaikan pembayaran/konfirmasi Anda melalui detail pembayaran berikut:\n{ticket_url}\n\nSalam,\nPanitia {event_title}",
                'email_subject' => 'Pendaftaran Berhasil - {event_title} ({ticket_code})',
                'email_body' => $emailThemeWrapper,
                'email_narrative' => "<p style='font-size: 15px; color: #1e293b;'>Halo <strong>{nama}</strong>,</p><p style='color: #475569;'>Terima kasih! Pendaftaran Anda di <strong>{event_title}</strong> telah berhasil dicatat dengan kode tiket: <strong>{ticket_code}</strong>.</p><div style='background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin: 20px 0;'><h4 style='margin-top: 0; color: #0f172a; font-size: 14px; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px;'>📋 RINGKASAN REGISTRASI</h4><table style='width: 100%; border-collapse: collapse; font-size: 13px; margin: 15px 0;'><tr style='border-bottom: 1px solid #f1f5f9;'><td style='padding: 8px 0; color: #64748b;'>Status Pembayaran</td><td style='padding: 8px 0; color: #d97706; font-weight: bold;'>{payment_status}</td></tr><tr style='border-bottom: 1px solid #f1f5f9;'><td style='padding: 8px 0; color: #64748b;'>Metode Pembayaran</td><td style='padding: 8px 0; font-weight: bold; color: #334155;'>{payment_method}</td></tr><tr><td style='padding: 8px 0; color: #64748b;'>Total Tagihan</td><td style='padding: 8px 0; color: #0f172a; font-weight: bold; font-size: 15px;'>{amount_paid}</td></tr></table><div style='margin-top: 15px; text-align: center;'><a href='{ticket_url}' style='display: inline-block; padding: 12px 24px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;'>Selesaikan Pembayaran</a></div></div><p style='color: #64748b; font-size: 13px;'>Salam hangat,<br>Panitia {event_title}</p>",
            ]
        );

        \App\Models\BroadcastTemplate::updateOrCreate(
            ['name' => 'Konfirmasi Tiket / E-Ticket'],
            [
                'subject' => 'E-Tiket Zawawalk 2026 Anda: {ticket_code}',
                'body' => "Halo {nama},\n\nTerima kasih! Pendaftaran Anda telah terverifikasi.\n\nBerikut informasi e-tiket Anda:\nNama: {nama}\nKode Tiket: {ticket_code}\nMetode Kehadiran: {attendance_mode}\nStatus Pembayaran: {payment_status}\n\nSilakan tunjukkan kode tiket Anda saat melakukan check-in di lokasi.\nDetail Tiket & QR Code: {ticket_url}\n\nSampai jumpa di lokasi acara!\n\nSalam,\nPanitia Zawawalk 2026",
                'whatsapp_body' => "Halo {nama},\n\nTerima kasih! Pendaftaran Anda telah terverifikasi.\n\nBerikut informasi e-tiket Anda:\nNama: {nama}\nKode Tiket: {ticket_code}\nMetode Kehadiran: {attendance_mode}\nStatus Pembayaran: {payment_status}\n\nSilakan tunjukkan kode tiket Anda saat melakukan check-in di lokasi.\nDetail Tiket & QR Code: {ticket_url}\n\nSampai jumpa di lokasi acara!\n\nSalam,\nPanitia Zawawalk 2026",
                'email_subject' => 'E-Tiket Zawawalk 2026 Anda: {ticket_code}',
                'email_body' => $emailThemeWrapper,
                'email_narrative' => "<p style='font-size: 15px; color: #1e293b;'>Halo <strong>{nama}</strong>,</p><p style='color: #475569;'>Terima kasih! Pembayaran Anda telah terverifikasi dengan sukses. Berikut adalah e-tiket resmi Anda:</p><div style='background-color: #ecfdf5; border: 2px dashed #10b981; border-radius: 16px; padding: 25px; margin: 25px 0;'><div style='font-size: 11px; font-weight: 800; color: #059669; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 15px;'>🎟️ E-TIKET RESMI</div><table style='width: 100%; border-collapse: collapse; font-size: 13px; color: #065f46;'><tr style='border-bottom: 1px dashed #a7f3d0;'><td style='padding: 8px 0; font-weight: 500;'>Nama Peserta</td><td style='padding: 8px 0; font-weight: bold; text-align: right;'>{nama}</td></tr><tr style='border-bottom: 1px dashed #a7f3d0;'><td style='padding: 8px 0; font-weight: 500;'>Kode Tiket</td><td style='padding: 8px 0; font-weight: bold; text-align: right; font-family: monospace; font-size: 14px;'>{ticket_code}</td></tr><tr style='border-bottom: 1px dashed #a7f3d0;'><td style='padding: 8px 0; font-weight: 500;'>Metode Kehadiran</td><td style='padding: 8px 0; font-weight: bold; text-align: right;'>{attendance_mode}</td></tr><tr><td style='padding: 8px 0; font-weight: 500;'>Status Pembayaran</td><td style='padding: 8px 0; font-weight: bold; text-align: right; color: #047857; text-transform: uppercase;'>LUNAS / PAID</td></tr></table><div style='margin-top: 20px; text-align: center;'><a href='{ticket_url}' style='display: inline-block; padding: 12px 24px; background-color: #10b981; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;'>Buka E-Tiket & QR Code</a></div></div><p style='color: #475569; font-size: 13px;'>Silakan tunjukkan kode QR tiket Anda pada saat melakukan check-in di lokasi acara. Sampai jumpa!</p><p style='color: #64748b; font-size: 13px;'>Salam hangat,<br>Panitia {event_title}</p>",
            ]
        );

        \App\Models\BroadcastTemplate::updateOrCreate(
            ['name' => 'Konfirmasi Check-In'],
            [
                'subject' => 'Check-in Sukses: {ticket_code} - Zawawalk 2026',
                'body' => "Halo {nama},\n\nAnda telah berhasil melakukan Check-in di acara Zawawalk 2026!\n\nKode Tiket: {ticket_code}\nMetode Kehadiran: {attendance_mode}\n\nSelamat menikmati keseruan jalan santai dan semoga mendapatkan doorprize menarik!\n\nSalam,\nPanitia Zawawalk 2026",
                'whatsapp_body' => "Halo {nama},\n\nAnda telah berhasil melakukan Check-in di acara Zawawalk 2026!\n\nKode Tiket: {ticket_code}\nMetode Kehadiran: {attendance_mode}\n\nSelamat menikmati keseruan jalan santai dan semoga mendapatkan doorprize menarik!\n\nSalam,\nPanitia Zawawalk 2026",
                'email_subject' => 'Check-in Sukses: {ticket_code} - Zawawalk 2026',
                'email_body' => $emailThemeWrapper,
                'email_narrative' => "<p style='font-size: 15px; color: #1e293b;'>Halo <strong>{nama}</strong>,</p><p style='color: #475569;'>Anda telah berhasil melakukan Check-in di acara <strong>{event_title}</strong>!</p><div style='background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 20px; margin: 20px 0;'><h4 style='margin-top: 0; color: #1e3a8a; font-size: 14px; border-bottom: 1px solid #bfdbfe; padding-bottom: 10px;'>✅ CHECK-IN BERHASIL</h4><table style='width: 100%; border-collapse: collapse; font-size: 13px; margin: 15px 0;'><tr style='border-bottom: 1px solid #dbeafe;'><td style='padding: 8px 0; color: #1e40af;'>Kode Tiket</td><td style='padding: 8px 0; font-weight: bold; color: #1e3a8a;'>{ticket_code}</td></tr><tr><td style='padding: 8px 0; color: #1e40af;'>Metode Kehadiran</td><td style='padding: 8px 0; font-weight: bold; color: #1e3a8a;'>{attendance_mode}</td></tr></table></div><p style='color: #475569; font-size: 13px;'>Selamat menikmati keseruan jalan santai hari ini, dan semoga beruntung memenangkan berbagai doorprize menarik!</p><p style='color: #64748b; font-size: 13px;'>Salam hangat,<br>Panitia {event_title}</p>",
            ]
        );

        \App\Models\BroadcastTemplate::updateOrCreate(
            ['name' => 'Pesan Kustom / Pengumuman'],
            [
                'subject' => 'Informasi Penting Peserta Zawawalk 2026',
                'body' => "Halo {nama},\n\nBerikut adalah informasi penting mengenai acara Zawawalk 2026. Mohon untuk hadir tepat waktu pukul 06:00 WIB di lokasi dengan dresscode yang telah ditentukan.\n\nDetail Tiket Anda:\nKode Tiket: {ticket_code}\n\nSalam,\nPanitia Zawawalk 2026",
                'whatsapp_body' => "Halo {nama},\n\nBerikut adalah informasi penting mengenai acara Zawawalk 2026. Mohon untuk hadir tepat waktu pukul 06:00 WIB di lokasi dengan dresscode yang telah ditentukan.\n\nDetail Tiket Anda:\nKode Tiket: {ticket_code}\n\nSalam,\nPanitia Zawawalk 2026",
                'email_subject' => 'Informasi Penting Peserta Zawawalk 2026',
                'email_body' => $emailThemeWrapper,
                'email_narrative' => "<p style='font-size: 15px; color: #1e293b;'>Halo <strong>{nama}</strong>,</p><p style='color: #475569;'>Berikut adalah informasi penting mengenai acara <strong>{event_title}</strong>. Mohon untuk hadir tepat waktu pukul 06:00 WIB di lokasi dengan dresscode yang telah ditentukan.</p><div style='background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px 20px; border-radius: 8px; margin: 20px 0; color: #78350f;'><strong>📌 DETAIL TIKET ANDA</strong><br>Kode Tiket: <strong>{ticket_code}</strong></div><p style='color: #64748b; font-size: 13px;'>Salam hangat,<br>Panitia {event_title}</p>",
            ]
        );

        \App\Models\BroadcastTemplate::updateOrCreate(
            ['name' => 'Pembayaran Gagal / Ditolak'],
            [
                'subject' => 'Pemberitahuan: Pembayaran Tiket Zawawalk 2026 Gagal / Ditolak',
                'body' => "Halo {nama},\n\nKami menginformasikan bahwa pembayaran pendaftaran Anda untuk acara Zawawalk 2026: The Fun Walk Festival telah dinyatakan Gagal atau Ditolak.\n\nKode Tiket: {ticket_code}\nStatus Pembayaran: {payment_status}\n\nSilakan lakukan pendaftaran ulang atau hubungi admin/panitia untuk melakukan konfirmasi bukti transfer jika Anda merasa sudah mengirimkan dana.\nWhatsApp Admin: {wa_admin_number}\n\nSalam,\nPanitia Zawawalk 2026",
                'whatsapp_body' => "Halo {nama},\n\nKami menginformasikan bahwa pembayaran pendaftaran Anda untuk acara Zawawalk 2026: The Fun Walk Festival telah dinyatakan Gagal atau Ditolak.\n\nKode Tiket: {ticket_code}\nStatus Pembayaran: {payment_status}\n\nSilakan lakukan pendaftaran ulang atau hubungi admin/panitia untuk melakukan konfirmasi bukti transfer jika Anda merasa sudah mengirimkan dana.\nWhatsApp Admin: {wa_admin_number}\n\nSalam,\nPanitia Zawawalk 2026",
                'email_subject' => 'Pemberitahuan: Pembayaran Tiket Zawawalk 2026 Gagal / Ditolak',
                'email_body' => $emailThemeWrapper,
                'email_narrative' => "<p style='font-size: 15px; color: #1e293b;'>Halo <strong>{nama}</strong>,</p><p style='color: #475569;'>Kami menginformasikan bahwa pembayaran pendaftaran Anda untuk acara <strong>{event_title}</strong> dinyatakan Gagal atau Ditolak.</p><div style='background-color: #fef2f2; border: 1px solid #fca5a5; border-radius: 12px; padding: 20px; margin: 20px 0; color: #991b1b;'><h4 style='margin-top: 0; color: #991b1b; font-size: 14px;'>❌ PEMBAYARAN DITOLAK</h4><p style='font-size: 13px; margin: 5px 0 15px 0;'>Mohon lakukan pendaftaran ulang atau segera konfirmasi ke WhatsApp Admin jika Anda telah mentransfer dana ke rekening kami.</p><a href='https://wa.me/{wa_admin_number}' style='display: inline-block; padding: 10px 20px; background-color: #ef4444; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 13px;'>Hubungi WhatsApp Admin</a></div><p style='color: #64748b; font-size: 13px;'>Salam hangat,<br>Panitia {event_title}</p>",
            ]
        );

        \App\Models\BroadcastTemplate::updateOrCreate(
            ['name' => 'Pengingat Pembayaran / Reminder'],
            [
                'subject' => 'Pengingat: Selesaikan Pembayaran Tiket Zawawalk 2026 Anda',
                'body' => "Halo {nama},\n\nKami mengingatkan bahwa Anda telah melakukan pendaftaran di Zawawalk 2026: The Fun Walk Festival, tetapi status pembayaran Anda saat ini masih Pending (Menunggu Pembayaran).\n\nBerikut rincian pendaftaran Anda:\nNama: {nama}\nKode Tiket: {ticket_code}\n\nSilakan selesaikan pembayaran Anda sesegera mungkin untuk mengamankan slot tiket Anda.\nDetail Pembayaran & Konfirmasi: {ticket_url}\n\nJika ada pertanyaan, hubungi WhatsApp Admin: {wa_admin_number}\n\nSalam,\nPanitia Zawawalk 2026",
                'whatsapp_body' => "Halo {nama},\n\nKami mengingatkan bahwa Anda telah melakukan pendaftaran di Zawawalk 2026: The Fun Walk Festival, tetapi status pembayaran Anda saat ini masih Pending (Menunggu Pembayaran).\n\nBerikut rincian pendaftaran Anda:\nNama: {nama}\nKode Tiket: {ticket_code}\n\nSilakan selesaikan pembayaran Anda sesegera mungkin untuk mengamankan slot tiket Anda.\nDetail Pembayaran & Konfirmasi: {ticket_url}\n\nJika ada pertanyaan, hubungi WhatsApp Admin: {wa_admin_number}\n\nSalam,\nPanitia Zawawalk 2026",
                'email_subject' => 'Pengingat: Selesaikan Pembayaran Tiket Zawawalk 2026 Anda',
                'email_body' => $emailThemeWrapper,
                'email_narrative' => "<p style='font-size: 15px; color: #1e293b;'>Halo <strong>{nama}</strong>,</p><p style='color: #475569;'>Kami mengingatkan bahwa pendaftaran Anda di <strong>{event_title}</strong> saat ini masih berstatus <strong>Menunggu Pembayaran</strong>.</p><div style='background-color: #fffbeb; border: 1px solid #fde68a; border-radius: 12px; padding: 20px; margin: 20px 0; color: #92400e;'><h4 style='margin-top: 0; color: #92400e; font-size: 14px;'>⏳ MENUNGGU PEMBAYARAN</h4><p style='font-size: 13px;'>Selesaikan pembayaran Anda segera agar tiket tidak kedaluwarsa dan slot pendaftaran Anda tetap aman.</p><div style='margin-top: 15px; text-align: center;'><a href='{ticket_url}' style='display: inline-block; padding: 12px 24px; background-color: #d97706; color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 13px;'>Selesaikan Pembayaran</a></div></div><p style='color: #64748b; font-size: 13px;'>Salam hangat,<br>Panitia {event_title}</p>",
            ]
        );
    }
}
