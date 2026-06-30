<?php

use App\Http\Controllers\ProfileController;
use App\Http\Controllers\AdminController;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

use App\Models\Setting;
use App\Models\RegistrationForm;
use App\Http\Controllers\EventController;

Route::get('/', function () {
    $settingsKeys = [
        'event_title', 'event_description', 'event_date', 'event_time', 
        'event_location', 'event_dresscode', 'event_banner', 'event_favicon', 
        'event_logo', 'event_type', 'event_platform', 'event_platform_url', 
        'event_platform_id', 'event_platform_passcode', 'event_platform_custom_name',
        'online_ticket_type', 'online_ticket_price',
        'enable_payment_manual', 'enable_payment_midtrans',
        'midtrans_client_key', 'midtrans_server_key', 'midtrans_is_production',
        'enable_fonnte', 'fonnte_token',
        'payment_manual_bank_name', 'payment_manual_account_number', 'payment_manual_account_name',
        'event_location_map', 'event_venue_name', 'event_venue_address',
        'funwalk_route_image', 'funwalk_route_description', 'funwalk_racepack_image', 
        'funwalk_racepack_info', 'funwalk_schedule', 'funwalk_faq', 'funwalk_terms', 'funwalk_contact',
        'funwalk_map_center', 'funwalk_map_zoom', 'funwalk_map_route', 'funwalk_map_markers',
        'meta_description', 'meta_keywords', 'og_title', 'og_description', 'og_image',
        'social_media_links', 'realtime_enabled', 'realtime_stop_at',
        'event_organized_by', 'event_developed_by',
        'event_organized_by_url', 'event_developed_by_url',
        'event_sponsors'
    ];
    $settings = [];
    foreach ($settingsKeys as $key) {
        $settings[$key] = Setting::getValue($key, '');
    }

    if (empty($settings['event_title'])) {
        $settings['event_title'] = 'Zawawalk 2026: The Fun Walk Festival';
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

    if (empty($settings['online_ticket_price'])) {
        $settings['online_ticket_price'] = '0';
    }

    if ($settings['enable_payment_manual'] === '') {
        $settings['enable_payment_manual'] = '1';
    }

    if ($settings['enable_payment_midtrans'] === '') {
        $settings['enable_payment_midtrans'] = '0';
    }

    // Load active form with count of non-failed attendees for quota checking on frontend
    $activeForm = RegistrationForm::withCount([
        'attendees as attendees_count' => function ($q) {
            $q->where('payment_status', '!=', 'failed');
        }
    ])->where('is_active', true)->first();
    $merchandisePlugin = \App\Models\Plugin::where('id', 'merchandise')->first();
    $donationPlugin = \App\Models\Plugin::where('id', 'donation')->first();

    return Inertia::render('Welcome', [
        'canLogin' => Route::has('login'),
        'canRegister' => Route::has('register'),
        'settings' => $settings,
        'activeForm' => $activeForm,
        'merchandisePlugin' => $merchandisePlugin,
        'donationPlugin' => $donationPlugin,
        'voucherPlugin' => \App\Models\Plugin::where('id', 'voucher')->first(),
    ]);
});

Route::post('/register-event/{formId}', [EventController::class, 'registerAttendee'])->name('event.register');
Route::get('/registration-success/{ticketCode}', [EventController::class, 'registrationSuccess'])->name('event.success');
Route::post('/upload-proof/{ticketCode}', [EventController::class, 'uploadPaymentProof'])->name('event.upload_proof');
Route::post('/midtrans-callback', [EventController::class, 'midtransCallback'])->name('payment.callback');
Route::get('/report', [EventController::class, 'publicReport'])->name('public.report');
Route::get('/live-checkin', [EventController::class, 'liveCheckin'])->name('public.live_checkin');

// Passcode-protected Confirm Payment Routes
Route::get('/confirm-payment/{ticketCode}', [EventController::class, 'showConfirmPayment'])->name('event.confirm_payment');
Route::post('/confirm-payment/{ticketCode}/verify-passcode', [EventController::class, 'verifyConfirmPaymentPasscode'])->name('event.confirm_payment.verify_passcode');
Route::post('/confirm-payment/{ticketCode}/verify', [EventController::class, 'verifyConfirmPayment'])->name('event.confirm_payment.verify');


Route::get('/dashboard', function () {
    if (Auth::user()->role === 'admin' || Auth::user()->role === 'staff') {
        return redirect()->route('admin.dashboard');
    }
    return Inertia::render('Dashboard');
})->middleware(['auth', 'verified'])->name('dashboard');

use App\Http\Controllers\FormController;

Route::middleware(['auth', 'admin'])->prefix('admin')->name('admin.')->group(function () {
    Route::get('/dashboard', [AdminController::class, 'index'])->name('dashboard');
    Route::post('/settings', [AdminController::class, 'updateSettings'])->name('settings.update');
    Route::post('/plugins/{id}/toggle', [AdminController::class, 'togglePlugin'])->name('plugins.toggle');
    Route::post('/plugins/{id}/toggle-additional', [AdminController::class, 'togglePluginAdditional'])->name('plugins.toggle_additional');
    Route::post('/plugins/{id}/settings', [AdminController::class, 'updatePluginSettings'])->name('plugins.settings');
    
    Route::post('/forms', [FormController::class, 'store'])->name('forms.store');
    Route::post('/forms/{id}', [FormController::class, 'update'])->name('forms.update');
    Route::post('/forms/{id}/toggle', [FormController::class, 'toggleActive'])->name('forms.toggle');
    Route::delete('/forms/{id}', [FormController::class, 'destroy'])->name('forms.destroy');

    // Attendee & Check-in management
    Route::post('/attendees/{id}/verify-payment', [AdminController::class, 'verifyPayment'])->name('attendees.verify_payment');
    Route::post('/attendees/{id}/toggle-checkin', [AdminController::class, 'toggleCheckIn'])->name('attendees.toggle_checkin');
    Route::post('/attendees/{id}/send-ticket', [AdminController::class, 'sendTicketEmail'])->name('attendees.send_ticket');
    Route::post('/attendees/checkin-scan', [AdminController::class, 'checkInScan'])->name('attendees.checkin_scan');
    Route::post('/test-smtp', [AdminController::class, 'testSmtp'])->name('test_smtp');
    Route::post('/test-fonnte', [AdminController::class, 'testFonnte'])->name('test_fonnte');

    // Realtime broadcast control
    Route::post('/settings/realtime', [AdminController::class, 'updateRealtimeSettings'])->name('settings.realtime');

    // Broadcast management routes
    Route::post('/broadcast/templates/{id}', [AdminController::class, 'updateBroadcastTemplate'])->name('broadcast.update_template');
    Route::post('/broadcast/send-individual', [AdminController::class, 'sendIndividualBroadcast'])->name('broadcast.send_individual');
    Route::post('/broadcast/send-bulk', [AdminController::class, 'sendBulkBroadcast'])->name('broadcast.send_bulk');

    // User management routes
    Route::post('/users', [AdminController::class, 'storeUser'])->name('users.store');
    Route::post('/users/{id}', [AdminController::class, 'updateUser'])->name('users.update');
    Route::delete('/users/{id}', [AdminController::class, 'destroyUser'])->name('users.destroy');

    // Voucher management routes
    Route::post('/vouchers', [AdminController::class, 'storeVoucher'])->name('vouchers.store');
    Route::post('/vouchers/{id}/toggle', [AdminController::class, 'toggleVoucher'])->name('vouchers.toggle');
    Route::delete('/vouchers/{id}', [AdminController::class, 'destroyVoucher'])->name('vouchers.destroy');
});

Route::middleware('auth')->group(function () {
    Route::get('/profile', [ProfileController::class, 'edit'])->name('profile.edit');
    Route::patch('/profile', [ProfileController::class, 'update'])->name('profile.update');
    Route::delete('/profile', [ProfileController::class, 'destroy'])->name('profile.destroy');
});

require __DIR__.'/auth.php';
require __DIR__.'/channels.php';
