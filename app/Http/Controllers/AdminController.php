<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\Setting;
use App\Models\Attendee;
use App\Models\RegistrationForm;
use App\Models\Plugin;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Artisan;
use App\Events\RealtimeStatusChanged;
use App\Events\AttendeeCheckedIn;
use App\Events\AttendeeDataUpdated;

class AdminController extends Controller
{
    private function checkAdmin()
    {
        if (auth()->user()->role !== 'admin') {
            abort(403, 'Hanya Admin yang memiliki akses untuk tindakan ini.');
        }
    }

    public function index()
    {
        // Calculate statistics
        $stats = [
            'total_registered' => Attendee::count(),
            'checked_in' => Attendee::where('checked_in', true)->count(),
            'pending_payment' => Attendee::where('payment_status', 'pending')->count(),
            'paid_payment' => Attendee::where('payment_status', 'paid')->count(),
        ];

        // Fetch settings
        $settingsKeys = [
            'event_title', 'event_description', 'event_date', 'event_time', 
            'event_location', 'event_dresscode', 'event_banner', 'event_favicon', 'event_logo',
            'event_type', 'event_platform', 'event_platform_url', 'event_platform_id',
            'event_platform_passcode', 'event_platform_custom_name',
            'online_ticket_type', 'online_ticket_price',
            'wa_admin_number', 'wa_custom_message', 
            'ticket_sending_method', 'auto_send_ticket_email', 'auto_send_ticket_whatsapp',
            'smtp_host', 'smtp_port', 'smtp_username', 'smtp_password', 
            'smtp_from_address', 'smtp_from_name',
            'enable_payment_manual', 'enable_payment_midtrans',
            'midtrans_client_key', 'midtrans_server_key', 'midtrans_is_production',
            'enable_fonnte', 'fonnte_token',
            'payment_manual_bank_name', 'payment_manual_account_number', 'payment_manual_account_name',
            'event_location_map', 'event_venue_name', 'event_venue_address',
            'funwalk_route_image', 'funwalk_route_description', 'funwalk_racepack_image', 
            'funwalk_racepack_info', 'funwalk_schedule', 'funwalk_faq', 'funwalk_terms', 'funwalk_contact',
            'funwalk_map_center', 'funwalk_map_zoom', 'funwalk_map_route', 'funwalk_map_markers',
            'admin_passcode', 'notification_wa_numbers', 'notification_emails',
            'meta_description', 'meta_keywords', 'og_title', 'og_description', 'og_image',
            'realtime_enabled', 'realtime_stop_at', 'social_media_links',
            'broadcaster_type', 'pusher_app_id', 'pusher_app_key', 'pusher_app_secret', 'pusher_app_cluster',
            'event_organized_by', 'event_developed_by',
            'event_organized_by_url', 'event_developed_by_url',
            'event_sponsors', 'ticket_prefix'
        ];

        $settings = [];
        foreach ($settingsKeys as $key) {
            $settings[$key] = Setting::getValue($key, '');
        }

        // Default settings if empty
        if (empty($settings['event_title'])) {
            $settings['event_title'] = 'Zawawalk 2026';
        }
        if (empty($settings['ticket_prefix'])) {
            $settings['ticket_prefix'] = 'ZWF';
        }
        if (empty($settings['ticket_sending_method'])) {
            $settings['ticket_sending_method'] = 'manual';
        }
        if (empty($settings['event_type'])) {
            $settings['event_type'] = 'offline';
        }
        if (empty($settings['event_platform'])) {
            $settings['event_platform'] = 'zoom';
        }
        if (empty($settings['online_ticket_type'])) {
            $settings['online_ticket_type'] = 'free';
        }
        if ($settings['enable_payment_manual'] === '') {
            $settings['enable_payment_manual'] = '1';
        }
        if ($settings['enable_payment_midtrans'] === '') {
            $settings['enable_payment_midtrans'] = '0';
        }

        // Fetch forms — include count of non-failed attendees for quota display
        $forms = RegistrationForm::withCount([
            'attendees as attendees_count' => function ($q) {
                $q->where('payment_status', '!=', 'failed');
            }
        ])->latest()->get();

        // Fetch plugins
        $plugins = Plugin::all();

        // Fetch Attendees
        $attendees = Attendee::with(['form', 'checkedInByUser'])->latest()->get();

        $users = [];
        if (auth()->user()->role === 'admin') {
            $users = \App\Models\User::latest()->get();
        }

        return Inertia::render('Admin/Dashboard', [
            'stats' => $stats,
            'settings' => $settings,
            'forms' => $forms,
            'plugins' => $plugins,
            'attendees' => $attendees,
            'broadcastTemplates' => \App\Models\BroadcastTemplate::all(),
            'broadcastLogs' => \App\Models\BroadcastLog::with('attendee')->latest()->get(),
            'users' => $users,
            'vouchers' => \App\Models\Voucher::latest()->get(),
        ]);
    }

    public function updateSettings(Request $request)
    {
        $this->checkAdmin();
        $fields = $request->only([
            'event_title', 'event_description', 'event_date', 'event_time',
            'event_location', 'event_dresscode', 'event_type', 
            'event_platform', 'event_platform_url', 'event_platform_id',
            'event_platform_passcode', 'event_platform_custom_name',
            'online_ticket_type', 'online_ticket_price',
            'wa_admin_number', 'wa_custom_message', 'ticket_sending_method', 
            'auto_send_ticket_email', 'auto_send_ticket_whatsapp', 'smtp_host', 'smtp_port', 'smtp_username', 
            'smtp_password', 'smtp_from_address', 'smtp_from_name',
            'enable_payment_manual', 'enable_payment_midtrans',
            'midtrans_client_key', 'midtrans_server_key', 'midtrans_is_production',
            'enable_fonnte', 'fonnte_token',
            'payment_manual_bank_name', 'payment_manual_account_number', 'payment_manual_account_name',
            'event_location_map', 'event_venue_name', 'event_venue_address',
            'funwalk_route_description', 'funwalk_racepack_info', 'funwalk_schedule', 'funwalk_faq', 'funwalk_terms', 'funwalk_contact',
            'funwalk_map_center', 'funwalk_map_zoom', 'funwalk_map_route', 'funwalk_map_markers',
            'admin_passcode', 'notification_wa_numbers', 'notification_emails',
            'meta_description', 'meta_keywords', 'og_title', 'og_description',
            'event_organized_by', 'event_developed_by',
            'event_organized_by_url', 'event_developed_by_url', 'ticket_prefix'
        ]);

        if (($fields['event_type'] ?? '') === 'online') {
            $fields['event_location'] = $fields['event_platform_url'] ?? '';
        } else {
            $fields['event_location'] = $fields['event_venue_name'] ?? '';
        }

        foreach ($fields as $key => $value) {
            if ($key === 'wa_admin_number' && !empty($value)) {
                // Remove all non-numeric characters
                $value = preg_replace('/\D/', '', $value);
                // Convert leading '0' to '62'
                if (str_starts_with($value, '0')) {
                    $value = '62' . substr($value, 1);
                }
            }
            Setting::setValue($key, $value ?? '');
        }

        // Handle Banner Upload
        if ($request->hasFile('event_banner')) {
            $request->validate([
                'event_banner' => 'image|max:4096'
            ]);
            $path = $request->file('event_banner')->store('banners', 'public');
            Setting::setValue('event_banner', '/storage/' . $path);
        }

        // Handle Favicon Upload
        if ($request->hasFile('event_favicon')) {
            $request->validate([
                'event_favicon' => 'image|max:1024'
            ]);
            $path = $request->file('event_favicon')->store('favicons', 'public');
            Setting::setValue('event_favicon', '/storage/' . $path);
        }

        // Handle Logo Upload
        if ($request->hasFile('event_logo')) {
            $request->validate([
                'event_logo' => 'image|max:2048'
            ]);
            $path = $request->file('event_logo')->store('logos', 'public');
            Setting::setValue('event_logo', '/storage/' . $path);
        }

        // Handle OG Image Upload
        if ($request->hasFile('og_image')) {
            $request->validate([
                'og_image' => 'image|max:4096'
            ]);
            $path = $request->file('og_image')->store('og_images', 'public');
            Setting::setValue('og_image', '/storage/' . $path);
        }

        // Handle Route Image Upload
        if ($request->hasFile('funwalk_route_image')) {
            $request->validate([
                'funwalk_route_image' => 'image|max:4096'
            ]);
            $path = $request->file('funwalk_route_image')->store('routes', 'public');
            Setting::setValue('funwalk_route_image', '/storage/' . $path);
        }

        // Handle Racepack Image Upload
        if ($request->hasFile('funwalk_racepack_image')) {
            $request->validate([
                'funwalk_racepack_image' => 'image|max:4096'
            ]);
            $path = $request->file('funwalk_racepack_image')->store('racepacks', 'public');
            Setting::setValue('funwalk_racepack_image', '/storage/' . $path);
        }

        // Handle Social Media Links
        if ($request->has('social_media_links')) {
            $linksInput = $request->input('social_media_links', []);
            $socialMediaLinks = [];

            foreach ($linksInput as $index => $link) {
                if (is_string($link)) {
                    $link = json_decode($link, true) ?: [];
                }

                $name = $link['name'] ?? '';
                $url = $link['url'] ?? '';
                $username = $link['username'] ?? '';
                $iconPath = $link['icon_path'] ?? '';

                // Handle file upload
                if ($request->hasFile("social_media_links.{$index}.icon_file")) {
                    $file = $request->file("social_media_links.{$index}.icon_file");
                    // Validate SVG
                    if ($file->getClientOriginalExtension() === 'svg' || $file->getMimeType() === 'image/svg+xml') {
                        $path = $file->store('social_icons', 'public');
                        $iconPath = '/storage/' . $path;
                    }
                }

                $socialMediaLinks[] = [
                    'name' => $name,
                    'url' => $url,
                    'username' => $username,
                    'icon_path' => $iconPath
                ];
            }
            Setting::setValue('social_media_links', json_encode($socialMediaLinks));
        }

        // Handle Event Sponsors
        if ($request->has('event_sponsors')) {
            $sponsorsInput = $request->input('event_sponsors', []);
            $eventSponsors = [];

            foreach ($sponsorsInput as $index => $sponsor) {
                if (is_string($sponsor)) {
                    $sponsor = json_decode($sponsor, true) ?: [];
                }

                $category = $sponsor['category'] ?? '';
                $name = $sponsor['name'] ?? '';
                $url = $sponsor['url'] ?? '';
                $logoPath = $sponsor['logo_path'] ?? '';

                // Handle file upload
                if ($request->hasFile("event_sponsors.{$index}.logo_file")) {
                    $file = $request->file("event_sponsors.{$index}.logo_file");
                    $request->validate([
                        "event_sponsors.{$index}.logo_file" => "image|max:2048"
                    ]);
                    $path = $file->store('sponsors', 'public');
                    $logoPath = '/storage/' . $path;
                }

                $eventSponsors[] = [
                    'category' => $category,
                    'name' => $name,
                    'url' => $url,
                    'logo_path' => $logoPath
                ];
            }
            Setting::setValue('event_sponsors', json_encode($eventSponsors));
        }

        return redirect()->back()->with('success', 'Settings updated successfully.');
    }

    public function togglePlugin(Request $request, $id)
    {
        $this->checkAdmin();
        $plugin = Plugin::findOrFail($id);
        $plugin->is_active = !$plugin->is_active;
        $plugin->save();

        // Regenerate autoloader classmaps if necessary
        Artisan::call('optimize:clear');

        return redirect()->back()->with('success', 'Plugin status updated successfully.');
    }

    public function togglePluginAdditional(Request $request, $id)
    {
        $this->checkAdmin();
        $plugin = Plugin::findOrFail($id);
        $settings = $plugin->settings ?: [];
        $settings['additional'] = !filter_var($settings['additional'] ?? true, FILTER_VALIDATE_BOOLEAN);
        $plugin->settings = $settings;
        $plugin->save();

        return redirect()->back()->with('success', 'Plugin additional status updated successfully.');
    }

    public function updatePluginSettings(Request $request, $id)
    {
        $this->checkAdmin();
        $plugin = Plugin::findOrFail($id);
        $settings = $request->input('settings', []);

        if ($id === 'merchandise') {
            $items = ['kaos', 'jaket', 'emoney', 'tumbler', 'jersey'];
            foreach ($items as $item) {
                if ($item === 'kaos') {
                    $oldSettings = $plugin->settings;
                    $oldKaos = $oldSettings['kaos'] ?? [];
                    $variantImages = $oldKaos['variant_images'] ?? [];
                    $sizeCharts = $oldKaos['size_charts'] ?? [];

                    // Handle variant images upload
                    if ($request->hasFile("settings.kaos.variant_images")) {
                        $files = $request->file("settings.kaos.variant_images");
                        foreach ($files as $comb => $file) {
                            $path = $file->store('merchandise_variants', 'public');
                            $variantImages[$comb] = '/storage/' . $path;
                        }
                    }
                    
                    // Handle size charts upload
                    if ($request->hasFile("settings.kaos.size_charts")) {
                        $files = $request->file("settings.kaos.size_charts");
                        foreach ($files as $sleeve => $file) {
                            $path = $file->store('merchandise_size_charts', 'public');
                            $sizeCharts[$sleeve] = '/storage/' . $path;
                        }
                    }

                    if (!isset($settings['kaos'])) {
                        $settings['kaos'] = [];
                    }
                    $settings['kaos']['variant_images'] = $variantImages;
                    $settings['kaos']['size_charts'] = $sizeCharts;
                } else {
                    // Handle main product image
                    if ($request->hasFile("settings.{$item}.image")) {
                        $request->validate([
                            "settings.{$item}.image" => 'image|max:4096'
                        ]);
                        $path = $request->file("settings.{$item}.image")->store('merchandise', 'public');
                        if (!isset($settings[$item])) {
                            $settings[$item] = [];
                        }
                        $settings[$item]['image'] = '/storage/' . $path;
                    } else {
                        $oldSettings = $plugin->settings;
                        if (isset($oldSettings[$item]['image'])) {
                            if (!isset($settings[$item])) {
                                $settings[$item] = [];
                            }
                            if (!isset($settings[$item]['image']) || empty($settings[$item]['image'])) {
                                $settings[$item]['image'] = $oldSettings[$item]['image'];
                            }
                        }
                    }

                    // Handle size chart image
                    if (in_array($item, ['kaos', 'jaket', 'jersey'])) {
                        if ($request->hasFile("settings.{$item}.size_chart_image")) {
                            $request->validate([
                                "settings.{$item}.size_chart_image" => 'image|max:4096'
                            ]);
                            $path = $request->file("settings.{$item}.size_chart_image")->store('merchandise_size_charts', 'public');
                            if (!isset($settings[$item])) {
                                $settings[$item] = [];
                            }
                            $settings[$item]['size_chart_image'] = '/storage/' . $path;
                        } else {
                            $oldSettings = $plugin->settings;
                            if (isset($oldSettings[$item]['size_chart_image'])) {
                                if (!isset($settings[$item])) {
                                    $settings[$item] = [];
                                }
                                if (!isset($settings[$item]['size_chart_image']) || empty($settings[$item]['size_chart_image'])) {
                                    $settings[$item]['size_chart_image'] = $oldSettings[$item]['size_chart_image'];
                                }
                            }
                        }
                    }
                }
            }
        }

        $plugin->settings = $settings;
        $plugin->save();

        return redirect()->back()->with('success', 'Plugin settings updated successfully.');
    }

    public function verifyPayment(Request $request, $id)
    {
        $this->checkAdmin();
        $attendee = Attendee::findOrFail($id);
        $status = $request->input('payment_status', 'paid');
        $attendee->payment_status = $status;
        $attendee->save();

        // Send e-ticket if status becomes paid (delivery channels are handled inside sendETicketToAttendee)
        if ($status === 'paid') {
            try {
                \App\Http\Controllers\EventController::sendETicketToAttendee($attendee);
            } catch (\Exception $e) {
                // Ignore exception
            }
        }

        // Broadcast update to PublicReport page
        broadcast(new AttendeeDataUpdated('payment_verified'));

        return redirect()->back()->with('success', "Payment marked as {$status}.");
    }

    public function sendTicketEmail(Request $request, $id)
    {
        $this->checkAdmin();
        $attendee = Attendee::findOrFail($id);
        if ($attendee->payment_status !== 'paid') {
            return redirect()->back()->with('error', 'Gagal mengirim tiket: Status pembayaran belum Lunas/paid.');
        }

        try {
            $result = \App\Http\Controllers\EventController::sendETicketToAttendee($attendee);
            if ($result) {
                return redirect()->back()->with('success', 'E-Ticket berhasil dikirim melalui Email & WhatsApp!');
            }
            return redirect()->back()->with('error', 'Gagal mengirim E-Ticket. Pastikan email atau WhatsApp terisi dengan benar.');
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Gagal mengirim E-Ticket: ' . $e->getMessage());
        }
    }

    public function toggleCheckIn(Request $request, $id)
    {
        $this->checkAdmin();
        $attendee = Attendee::findOrFail($id);
        $attendee->checked_in = !$attendee->checked_in;
        $attendee->checked_in_at = $attendee->checked_in ? now() : null;
        $attendee->checked_in_by = $attendee->checked_in ? auth()->id() : null;
        $attendee->save();

        // Broadcast to LiveCheckIn screen if checking IN (not un-checking)
        if ($attendee->checked_in) {
            $data = $attendee->registration_data ?? [];
            $name = $data['fullname'] ?? null;
            if (!$name) {
                foreach ($data as $k => $v) {
                    if (str_contains(strtolower($k), 'nama') || str_contains(strtolower($k), 'name')) {
                        $name = $v; break;
                    }
                }
            }
            $photo = null;
            foreach ($data as $k => $v) {
                if ((str_contains(strtolower($k), 'foto') || str_contains(strtolower($k), 'photo') || str_contains(strtolower($k), 'gambar') || str_contains(strtolower($k), 'image')) && is_string($v) && str_starts_with($v, '/storage/')) {
                    $photo = $v; break;
                }
            }
            broadcast(new AttendeeCheckedIn([
                'id'            => $attendee->id,
                'name'          => $name ?: 'Peserta',
                'photo'         => $photo,
                'checked_in_at' => $attendee->checked_in_at->diffForHumans(),
                'timestamp'     => $attendee->checked_in_at->timestamp,
            ]));
        }

        return redirect()->back()->with('success', 'Status pengambilan racepack berhasil diperbarui.');
    }

    public function checkInScan(Request $request)
    {
        $request->validate([
            'ticket_code' => 'required|string',
        ]);

        $code = strtoupper(trim($request->input('ticket_code')));
        $attendee = Attendee::where('ticket_code', $code)->with('form')->first();

        if (!$attendee) {
            return response()->json([
                'success' => false,
                'message' => 'Tiket tidak ditemukan!'
            ], 404);
        }

        if ($attendee->payment_status !== 'paid') {
            return response()->json([
                'success' => false,
                'message' => 'Tiket ditemukan, tetapi pembayaran belum lunas/terverifikasi!'
            ], 400);
        }

        if ($attendee->checked_in) {
            return response()->json([
                'success' => false,
                'message' => 'Racepack untuk tiket ini sudah pernah diambil sebelumnya!',
                'attendee' => $attendee
            ], 400);
        }

        $attendee->checked_in = true;
        $attendee->checked_in_at = now();
        $attendee->checked_in_by = auth()->id();
        $attendee->save();

        try {
            \App\Jobs\SendCheckInThankYouJob::dispatch($attendee->id);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Gagal dispatch Job Thank You Pengambilan Racepack: ' . $e->getMessage());
        }

        // Broadcast to LiveCheckIn screen
        $data = $attendee->registration_data ?? [];
        $name = $data['fullname'] ?? null;
        if (!$name) {
            foreach ($data as $k => $v) {
                if (str_contains(strtolower($k), 'nama') || str_contains(strtolower($k), 'name')) {
                    $name = $v; break;
                }
            }
        }
        $photo = null;
        foreach ($data as $k => $v) {
            if ((str_contains(strtolower($k), 'foto') || str_contains(strtolower($k), 'photo') || str_contains(strtolower($k), 'gambar') || str_contains(strtolower($k), 'image')) && is_string($v) && str_starts_with($v, '/storage/')) {
                $photo = $v; break;
            }
        }
        broadcast(new AttendeeCheckedIn([
            'id'            => $attendee->id,
            'name'          => $name ?: 'Peserta',
            'photo'         => $photo,
            'checked_in_at' => $attendee->checked_in_at->diffForHumans(),
            'timestamp'     => $attendee->checked_in_at->timestamp,
        ]));

        return response()->json([
            'success'  => true,
            'message'  => 'Pengambilan Racepack Berhasil!',
            'attendee' => $attendee
        ]);
    }

    public function testSmtp(Request $request)
    {
        $this->checkAdmin();
        $request->validate([
            'email' => 'required|email',
            'smtp_host' => 'required|string',
            'smtp_port' => 'required',
            'smtp_username' => 'nullable|string',
            'smtp_password' => 'nullable|string',
            'smtp_from_address' => 'required|email',
            'smtp_from_name' => 'required|string',
        ]);

        try {
            // Override Mailer config dynamically
            config([
                'mail.default' => 'smtp',
                'mail.mailers.smtp.host' => $request->smtp_host,
                'mail.mailers.smtp.port' => $request->smtp_port,
                'mail.mailers.smtp.username' => $request->smtp_username,
                'mail.mailers.smtp.password' => $request->smtp_password,
                'mail.mailers.smtp.encryption' => $request->smtp_port == 465 ? 'ssl' : ($request->smtp_port == 587 ? 'tls' : null),
                'mail.from.address' => $request->smtp_from_address,
                'mail.from.name' => $request->smtp_from_name,
            ]);
            
            // Re-resolve mail manager to apply changes
            \Illuminate\Support\Facades\Mail::forgetMailers();

            // Send a test email using standard Mail
            \Illuminate\Support\Facades\Mail::raw('Halo! Ini adalah email uji coba dari sistem pendaftaran Retro Reuni Anda. Jika Anda menerima email ini, konfigurasi SMTP Anda sudah benar!', function ($message) use ($request) {
                $message->to($request->email)
                        ->subject('Uji Coba Konfigurasi SMTP');
            });

            return response()->json([
                'success' => true,
                'message' => 'Email uji coba berhasil dikirim ke ' . $request->email
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal mengirim email: ' . $e->getMessage()
            ], 500);
        }
    }

    public function testFonnte(Request $request)
    {
        $this->checkAdmin();
        $request->validate([
            'whatsapp' => 'required|string',
            'fonnte_token' => 'required|string',
        ]);

        try {
            $response = \Illuminate\Support\Facades\Http::withHeaders([
                'Authorization' => $request->fonnte_token,
            ])->post('https://api.fonnte.com/send', [
                'target' => $request->whatsapp,
                'message' => 'Halo! Ini adalah pesan uji coba integrasi WhatsApp API Fonnte dari sistem pendaftaran Retro Reuni Anda. Konfigurasi Anda sudah benar!',
            ]);

            $result = $response->json();
            
            if ($response->successful() && isset($result['status']) && $result['status'] === true) {
                return response()->json([
                    'success' => true,
                    'message' => 'Pesan WhatsApp uji coba berhasil dikirim ke ' . $request->whatsapp
                ]);
            }

            $detail = isset($result['reason']) ? $result['reason'] : ($result['detail'] ?? 'Error tidak diketahui dari Fonnte.');
            return response()->json([
                'success' => false,
                'message' => 'Gagal mengirim WhatsApp (Fonnte): ' . $detail
            ], 400);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Gagal mengirim WhatsApp: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update realtime broadcast settings and notify all connected clients.
     */
    public function updateRealtimeSettings(Request $request)
    {
        $this->checkAdmin();
        $request->validate([
            'realtime_enabled' => 'required|in:0,1',
            'realtime_stop_at' => 'nullable|date',
            'broadcaster_type' => 'required|in:reverb,pusher',
            'pusher_app_id'    => 'nullable|string',
            'pusher_app_key'   => 'nullable|string',
            'pusher_app_secret'=> 'nullable|string',
            'pusher_app_cluster'=> 'nullable|string',
        ]);

        $enabled  = $request->input('realtime_enabled') === '1';
        $stopAt   = $request->input('realtime_stop_at') ?: null;

        Setting::setValue('realtime_enabled', $enabled ? '1' : '0');
        Setting::setValue('realtime_stop_at', $stopAt ?? '');
        Setting::setValue('broadcaster_type', $request->input('broadcaster_type', 'reverb'));
        Setting::setValue('pusher_app_id', $request->input('pusher_app_id') ?: '');
        Setting::setValue('pusher_app_key', $request->input('pusher_app_key') ?: '');
        Setting::setValue('pusher_app_secret', $request->input('pusher_app_secret') ?: '');
        Setting::setValue('pusher_app_cluster', $request->input('pusher_app_cluster') ?: '');

        // Broadcast status change to all connected clients
        broadcast(new RealtimeStatusChanged($enabled, $stopAt));

        return back()->with('success', 'Pengaturan realtime berhasil disimpan dan dikirim ke semua layar.');
    }

    public function updateBroadcastTemplate(Request $request, $id)
    {
        $this->checkAdmin();
        $request->validate([
            'whatsapp_body' => 'nullable|string',
            'email_subject' => 'nullable|string|max:255',
            'email_body' => 'nullable|string',
            'email_narrative' => 'nullable|string',
            'email_banner_file' => 'nullable|image|max:4096',
        ]);

        $template = \App\Models\BroadcastTemplate::findOrFail($id);
        
        $data = [
            'whatsapp_body' => $request->whatsapp_body ?? '',
            'email_subject' => $request->email_subject ?? '',
            'email_body' => $request->email_body ?? '',
            'email_narrative' => $request->email_narrative ?? '',
        ];

        // Handle Email Banner Upload
        if ($request->hasFile('email_banner_file')) {
            $path = $request->file('email_banner_file')->store('email_banners', 'public');
            $data['email_banner'] = '/storage/' . $path;
        }

        $template->update($data);

        return back()->with('success', 'Template broadcast berhasil disimpan.');
    }

    public function sendIndividualBroadcast(Request $request)
    {
        $this->checkAdmin();
        $request->validate([
            'attendee_id' => 'required|exists:attendees,id',
            'template_id' => 'required|exists:broadcast_templates,id',
            'channel' => 'required|in:email,whatsapp_me,whatsapp_fonnte',
        ]);

        $attendee = Attendee::with('form')->findOrFail($request->attendee_id);
        $template = \App\Models\BroadcastTemplate::findOrFail($request->template_id);
        $channel = $request->channel;

        // Resolve recipient dynamically
        $recipient = null;
        if ($channel === 'email') {
            $emailField = collect($attendee->form->fields_schema)->firstWhere('type', 'email');
            $recipient = $emailField ? ($attendee->registration_data[$emailField['name']] ?? null) : null;
            if (!$recipient) {
                foreach ($attendee->registration_data as $k => $v) {
                    if (str_contains(strtolower($k), 'email') && filter_var($v, FILTER_VALIDATE_EMAIL)) {
                        $recipient = $v;
                        break;
                    }
                }
            }
        } else {
            $recipient = $attendee->registration_data['whatsapp'] ?? null;
            if (!$recipient) {
                foreach ($attendee->registration_data as $k => $v) {
                    if (str_contains(strtolower($k), 'whatsapp') || str_contains(strtolower($k), 'wa') || str_contains(strtolower($k), 'telp') || str_contains(strtolower($k), 'phone') || str_contains(strtolower($k), 'hp')) {
                        $recipient = $v;
                        break;
                    }
                }
            }
        }

        if ($channel === 'whatsapp_me') {
            \App\Models\BroadcastLog::create([
                'attendee_id' => $attendee->id,
                'recipient' => $recipient ?: 'Manual Chat',
                'channel' => 'whatsapp_me',
                'status' => 'sent',
                'sent_at' => now(),
                'error_message' => 'Tautan diklik oleh Admin',
            ]);
            return back()->with('success', 'Log WhatsApp Me berhasil disimpan.');
        }

        // Create log entry as pending
        $log = \App\Models\BroadcastLog::create([
            'attendee_id' => $attendee->id,
            'recipient' => $recipient,
            'channel' => $channel,
            'status' => 'pending',
        ]);

        // Dispatch background job
        \App\Jobs\SendBroadcastJob::dispatch($attendee->id, $template->id, $channel, $log->id);

        return back()->with('success', 'Pengiriman broadcast dijadwalkan di latar belakang.');
    }

    public function sendBulkBroadcast(Request $request)
    {
        $this->checkAdmin();
        $request->validate([
            'attendee_ids' => 'required|array',
            'attendee_ids.*' => 'exists:attendees,id',
            'template_id' => 'required|exists:broadcast_templates,id',
            'channel' => 'required|in:email,whatsapp_fonnte',
        ]);

        $template = \App\Models\BroadcastTemplate::findOrFail($request->template_id);
        $channel = $request->channel;
        $attendeeIds = $request->attendee_ids;

        foreach ($attendeeIds as $id) {
            $attendee = Attendee::with('form')->find($id);
            if ($attendee) {
                // Resolve recipient
                $recipient = null;
                if ($channel === 'email') {
                    $emailField = collect($attendee->form->fields_schema)->firstWhere('type', 'email');
                    $recipient = $emailField ? ($attendee->registration_data[$emailField['name']] ?? null) : null;
                    if (!$recipient) {
                        foreach ($attendee->registration_data as $k => $v) {
                            if (str_contains(strtolower($k), 'email') && filter_var($v, FILTER_VALIDATE_EMAIL)) {
                                $recipient = $v;
                                break;
                            }
                        }
                    }
                } else {
                    $recipient = $attendee->registration_data['whatsapp'] ?? null;
                    if (!$recipient) {
                        foreach ($attendee->registration_data as $k => $v) {
                            if (str_contains(strtolower($k), 'whatsapp') || str_contains(strtolower($k), 'wa') || str_contains(strtolower($k), 'telp') || str_contains(strtolower($k), 'phone') || str_contains(strtolower($k), 'hp')) {
                                  $recipient = $v;
                                  break;
                            }
                        }
                    }
                }

                // Create log
                $log = \App\Models\BroadcastLog::create([
                    'attendee_id' => $attendee->id,
                    'recipient' => $recipient,
                    'channel' => $channel,
                    'status' => 'pending',
                ]);

                // Dispatch
                \App\Jobs\SendBroadcastJob::dispatch($attendee->id, $template->id, $channel, $log->id);
            }
        }

        return back()->with('success', 'Broadcast bulk berhasil dijadwalkan di latar belakang.');
    }

    protected function parseTemplatePlaceholders($text, $attendee, $fullName)
    {
        return \App\Http\Controllers\EventController::parsePlaceholders($text, $attendee);
    }

    public function storeUser(Request $request)
    {
        $this->checkAdmin();
        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8',
            'role' => 'required|in:admin,staff',
        ]);

        \App\Models\User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => bcrypt($request->password),
            'role' => $request->role,
        ]);

        return back()->with('success', 'User berhasil ditambahkan.');
    }

    public function updateUser(Request $request, $id)
    {
        $this->checkAdmin();
        $user = \App\Models\User::findOrFail($id);

        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users,email,' . $user->id,
            'password' => 'nullable|string|min:8',
            'role' => 'required|in:admin,staff',
        ]);

        $data = [
            'name' => $request->name,
            'email' => $request->email,
            'role' => $request->role,
        ];

        if ($request->filled('password')) {
            $data['password'] = bcrypt($request->password);
        }

        $user->update($data);

        return back()->with('success', 'User berhasil diperbarui.');
    }

    public function destroyUser($id)
    {
        $this->checkAdmin();
        $user = \App\Models\User::findOrFail($id);

        if ($user->id === auth()->user()->id) {
            return back()->withErrors(['error' => 'Anda tidak dapat menghapus akun Anda sendiri.']);
        }

        $user->delete();

        return back()->with('success', 'User berhasil dihapus.');
    }

    public function storeVoucher(Request $request)
    {
        $this->checkAdmin();
        $request->validate([
            'mode' => 'required|in:single,bulk',
            'type' => 'required|in:percentage,fixed',
            'value' => [
                'required',
                'numeric',
                'min:0',
                function ($attribute, $value, $fail) use ($request) {
                    if ($request->input('type') === 'percentage' && $value > 100) {
                        $fail('Nilai potongan persentase tidak boleh melebihi 100%.');
                    }
                }
            ],
            'category' => 'required|in:group,personal',
            // for single:
            'code' => 'required_if:mode,single|nullable|string|unique:vouchers,code',
            'max_uses' => 'required_if:mode,single|nullable|integer|min:1',
            // for bulk:
            'prefix' => 'required_if:mode,bulk|nullable|string',
            'quantity' => 'required_if:mode,bulk|nullable|integer|min:1|max:500',
        ]);

        if ($request->mode === 'single') {
            \App\Models\Voucher::create([
                'code' => strtoupper($request->code),
                'type' => $request->type,
                'value' => $request->value,
                'category' => $request->category,
                'max_uses' => $request->category === 'personal' ? 1 : $request->max_uses,
                'used_count' => 0,
                'is_active' => true,
            ]);
        } else {
            $prefix = strtoupper($request->prefix ?? 'VCH-');
            $quantity = (int)$request->quantity;

            for ($i = 0; $i < $quantity; $i++) {
                do {
                    $randomStr = substr(str_shuffle('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'), 0, 6);
                    $code = $prefix . $randomStr;
                } while (\App\Models\Voucher::where('code', $code)->exists());

                \App\Models\Voucher::create([
                    'code' => $code,
                    'type' => $request->type,
                    'value' => $request->value,
                    'category' => $request->category,
                    'max_uses' => $request->category === 'personal' ? 1 : 1000000,
                    'used_count' => 0,
                    'is_active' => true,
                ]);
            }
        }

        return back()->with('success', 'Voucher berhasil dibuat.');
    }

    public function toggleVoucher($id)
    {
        $this->checkAdmin();
        $voucher = \App\Models\Voucher::findOrFail($id);
        $voucher->is_active = !$voucher->is_active;
        $voucher->save();

        return back()->with('success', 'Status voucher berhasil diperbarui.');
    }

    public function destroyVoucher($id)
    {
        $this->checkAdmin();
        $voucher = \App\Models\Voucher::findOrFail($id);
        $voucher->delete();

        return back()->with('success', 'Voucher berhasil dihapus.');
    }
}
