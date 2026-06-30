<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\RegistrationForm;
use App\Models\Attendee;
use App\Models\Setting;
use Illuminate\Support\Facades\Storage;
use App\Events\AttendeeDataUpdated;

class EventController extends Controller
{
    public function registerAttendee(Request $request, $formId)
    {
        $form = RegistrationForm::findOrFail($formId);

        // --- Guard: Check if registration is closed ---
        // 1. Manual toggle off
        if (!$form->is_active) {
            abort(403, 'Pendaftaran sudah ditutup oleh panitia.');
        }

        // 2. Deadline passed
        if ($form->closed_at && now()->gt($form->closed_at)) {
            abort(403, 'Pendaftaran telah ditutup karena batas waktu pendaftaran telah berakhir.');
        }

        // 3. Quota full (count non-failed attendees)
        if ($form->max_participants !== null) {
            $currentCount = $form->attendees()->where('payment_status', '!=', 'failed')->count();
            if ($currentCount >= $form->max_participants) {
                abort(403, 'Pendaftaran telah ditutup karena kuota pendaftaran telah terpenuhi.');
            }
        }
        // -------------------------------------------

        $eventType = Setting::getValue('event_type', 'offline');

        // Build validation rules dynamically based on form schema
        $rules = [
            'payment_method' => 'required|in:midtrans,manual',
        ];

        if ($eventType === 'hybrid') {
            $rules['attendance_mode'] = 'required|in:offline,online';
        }

        foreach ($form->fields_schema as $field) {
            if (in_array($field['type'], ['title', 'description'])) {
                continue;
            }

            $fieldName = 'field_' . $field['name'];
            $rule = $field['required'] ? 'required' : 'nullable';

            if ($field['type'] === 'number') {
                $rule .= '|numeric';
            } elseif ($field['type'] === 'email') {
                $rule .= '|email';
            } elseif ($field['type'] === 'signature') {
                $rule .= '|string';
            } elseif ($field['type'] === 'image') {
                $rule .= '|image|max:4096';
            } elseif ($field['type'] === 'date' || $field['type'] === 'datetime') {
                $rule .= '|date';
            } elseif ($field['type'] === 'multiselect') {
                $rule .= '|array';
            } elseif ($field['type'] === 'rating') {
                $rule .= '|integer|min:1|max:5';
            } elseif ($field['type'] === 'checkbox') {
                $rule .= '|boolean';
            } elseif ($field['type'] === 'url') {
                $rule .= '|url';
            } elseif ($field['type'] === 'phone') {
                $rule .= '|string|max:30';
            }

            $rules[$fieldName] = $rule;
        }

        // Validate image upload if any (e.g. proof of payment or profile photo)
        if ($request->hasFile('payment_proof')) {
            $rules['payment_proof'] = 'image|max:4096';
        }

        $request->validate($rules);

        // Extract registration data from dynamic fields
        $registrationData = [];
        foreach ($form->fields_schema as $field) {
            if (in_array($field['type'], ['title', 'description'])) {
                continue;
            }

            $fieldName = 'field_' . $field['name'];
            if ($field['type'] === 'image' && $request->hasFile($fieldName)) {
                $path = $request->file($fieldName)->store('dynamic_images', 'public');
                $registrationData[$field['name']] = '/storage/' . $path;
            } elseif ($field['type'] === 'multiselect') {
                // Store multiselect values as array or comma-separated string
                $val = $request->input($fieldName);
                $registrationData[$field['name']] = is_array($val) ? implode(', ', $val) : $val;
            } else {
                $registrationData[$field['name']] = $request->input($fieldName);
            }
        }

        // Determine attendance mode
        if ($eventType === 'hybrid') {
            $attendanceMode = $request->input('attendance_mode');
        } elseif ($eventType === 'online') {
            $attendanceMode = 'online';
        } else {
            $attendanceMode = 'offline';
        }
        $registrationData['attendance_mode'] = $attendanceMode;

        // Process active merchandise plugin if any
        $merchandisePlugin = \App\Models\Plugin::where('id', 'merchandise')->first();
        $selectedMerch = [];
        $merchTotal = 0;

        if ($merchandisePlugin && $merchandisePlugin->is_active) {
            $pluginSettings = $merchandisePlugin->settings ?? [];
            $items = ['kaos', 'jaket', 'emoney', 'tumbler', 'jersey'];

            foreach ($items as $item) {
                $itemSettings = $pluginSettings[$item] ?? [];
                $isEnabled = filter_var($itemSettings['enabled'] ?? false, FILTER_VALIDATE_BOOLEAN);
                $isRequired = filter_var($itemSettings['required'] ?? false, FILTER_VALIDATE_BOOLEAN);
                $price = floatval($itemSettings['price'] ?? 0);

                $requestSelectedKey = "merch_{$item}_selected";
                $requestSizeKey = "merch_{$item}_size";

                $isSelected = filter_var($request->input($requestSelectedKey, false), FILTER_VALIDATE_BOOLEAN);

                if ($isEnabled) {
                    if ($isRequired && !$isSelected) {
                        $request->validate([
                            $requestSelectedKey => 'accepted'
                        ], [
                            "{$requestSelectedKey}.accepted" => "Merchandise " . ucfirst($item) . " wajib dipilih!"
                        ]);
                    }

                    if ($isSelected) {
                        $selectedItemData = [
                            'name' => ucfirst($item),
                            'price' => $price,
                            'image' => $itemSettings['image'] ?? '',
                        ];

                        if (in_array($item, ['kaos', 'jaket', 'jersey'])) {
                            $allowedSizes = $itemSettings['sizes'] ?? ['S', 'M', 'L', 'XL', 'XXL'];
                            if (is_string($allowedSizes)) {
                                $allowedSizes = array_map('trim', explode(',', $allowedSizes));
                            }

                            $request->validate([
                                $requestSizeKey => 'required|in:' . implode(',', $allowedSizes)
                            ], [
                                "{$requestSizeKey}.required" => "Ukuran untuk " . ucfirst($item) . " wajib dipilih!",
                                "{$requestSizeKey}.in" => "Ukuran " . ucfirst($item) . " tidak valid!"
                            ]);

                            $selectedSize = $request->input($requestSizeKey);
                            $selectedItemData['size'] = $selectedSize;

                            // Overwrite price if size-specific price is configured
                            $sizesPrices = $itemSettings['sizes_prices'] ?? [];
                            foreach ($sizesPrices as $sp) {
                                if (isset($sp['size']) && $sp['size'] === $selectedSize && isset($sp['price'])) {
                                    $price = floatval($sp['price']);
                                    break;
                                }
                            }

                            if ($item === 'kaos') {
                                // Validate and save color if enabled
                                $enableColors = filter_var($itemSettings['enable_colors'] ?? false, FILTER_VALIDATE_BOOLEAN);
                                if ($enableColors) {
                                    $colorsList = $itemSettings['colors_list'] ?? '';
                                    $allowedColors = array_map('trim', explode(',', $colorsList));
                                    $allowedColors = array_filter($allowedColors);
                                    
                                    $requestColorKey = "merch_kaos_color";
                                    $request->validate([
                                        $requestColorKey => 'required|in:' . implode(',', $allowedColors)
                                    ], [
                                        "{$requestColorKey}.required" => "Warna kaos wajib dipilih!",
                                        "{$requestColorKey}.in" => "Pilihan warna kaos tidak valid!"
                                    ]);
                                    $selectedItemData['color'] = $request->input($requestColorKey);
                                }

                                // Validate and save sleeve if enabled
                                $enableSleeves = filter_var($itemSettings['enable_sleeves'] ?? false, FILTER_VALIDATE_BOOLEAN);
                                if ($enableSleeves) {
                                    $requestSleeveKey = "merch_kaos_sleeve";
                                    $request->validate([
                                        $requestSleeveKey => 'required|in:Lengan Pendek,Lengan Panjang'
                                    ], [
                                        "{$requestSleeveKey}.required" => "Jenis lengan wajib dipilih!",
                                        "{$requestSleeveKey}.in" => "Jenis lengan tidak valid!"
                                    ]);

                                    $selectedSleeve = $request->input($requestSleeveKey);
                                    $selectedItemData['sleeve'] = $selectedSleeve;
                                    
                                    if ($selectedSleeve === 'Lengan Panjang') {
                                        $surcharge = floatval($itemSettings['long_sleeve_surcharge'] ?? 0);
                                        $price += $surcharge;
                                    }
                                }

                                // Resolve variant specific image
                                $selectedColor = $enableColors ? $request->input("merch_kaos_color") : '';
                                $selectedSleeve = $enableSleeves ? $request->input("merch_kaos_sleeve") : 'Lengan Pendek';
                                
                                $key = 'Default';
                                if ($enableColors && $selectedColor && $enableSleeves) {
                                    $key = "{$selectedColor}_{$selectedSleeve}";
                                } else if ($enableColors && $selectedColor) {
                                    $key = "{$selectedColor}_Lengan Pendek";
                                } else if ($enableSleeves) {
                                    $key = "Default_{$selectedSleeve}";
                                }
                                
                                $variantImages = $itemSettings['variant_images'] ?? [];
                                $selectedItemData['image'] = $variantImages[$key] ?? ($itemSettings['image'] ?? '');
                            }

                            $selectedItemData['price'] = $price;

                            // Validate and save printed nickname if enabled
                            $enableNickname = filter_var($itemSettings['enable_nickname'] ?? false, FILTER_VALIDATE_BOOLEAN);
                            if ($enableNickname) {
                                $maxChars = intval($itemSettings['max_nickname_chars'] ?? 12);
                                $requestNicknameKey = "merch_{$item}_nickname";
                                $request->validate([
                                    $requestNicknameKey => "required|string|max:{$maxChars}"
                                ], [
                                    "{$requestNicknameKey}.required" => "Nama panggilan untuk " . ucfirst($item) . " wajib diisi!",
                                    "{$requestNicknameKey}.max" => "Nama panggilan untuk " . ucfirst($item) . " maksimal {$maxChars} karakter!"
                                ]);
                                $selectedItemData['nickname'] = $request->input($requestNicknameKey);
                            }
                        }

                        $selectedMerch[$item] = $selectedItemData;
                        $merchTotal += $price;
                    }
                }
            }
        }

        $registrationData['selected_merchandise'] = $selectedMerch;
        $registrationData['merchandise_total'] = $merchTotal;

        $donationPlugin = \App\Models\Plugin::where('id', 'donation')->first();
        $donationAmount = 0;
        if ($donationPlugin && $donationPlugin->is_active) {
            if ($request->filled('donation_amount')) {
                $request->validate([
                    'donation_amount' => 'numeric|min:0'
                ]);
                $donationAmount = floatval($request->input('donation_amount'));
            }
        }
        $registrationData['donation_amount'] = $donationAmount;

        // Determine base ticket price
        $baseTicketPrice = floatval($form->ticket_price);
        if ($attendanceMode === 'online') {
            $onlineType = Setting::getValue('online_ticket_type', 'free');
            if ($onlineType === 'free') {
                $baseTicketPrice = 0;
            } else {
                $baseTicketPrice = floatval(Setting::getValue('online_ticket_price', '0'));
            }
        }

        $registrationData['ticket_price'] = $baseTicketPrice;

        // Calculate additional fees
        $additionalFeesTotal = 0;
        $feesBreakdown = [];
        if ($form->additional_fees && is_array($form->additional_fees)) {
            foreach ($form->additional_fees as $fee) {
                $feeName = $fee['name'] ?? 'Biaya';
                $feeType = $fee['type'] ?? 'fixed';
                $feeValue = floatval($fee['value'] ?? 0);

                if ($feeType === 'percent') {
                    $calculated = ($feeValue / 100) * $baseTicketPrice;
                } else {
                    $calculated = $feeValue;
                }

                if ($calculated > 0) {
                    $additionalFeesTotal += $calculated;
                    $feesBreakdown[] = [
                        'name' => $feeName,
                        'type' => $feeType,
                        'value' => $feeValue,
                        'calculated' => $calculated,
                    ];
                }
            }
        }
        $registrationData['additional_fees'] = $additionalFeesTotal;
        $registrationData['additional_fees_breakdown'] = $feesBreakdown;

        $rawTotalPrice = $baseTicketPrice + $merchTotal + $donationAmount + $additionalFeesTotal;
        
        // Process Voucher Discount if Voucher Plugin is active
        $voucherPlugin = \App\Models\Plugin::where('id', 'voucher')->first();
        $discount = 0;
        $appliedVoucherCode = null;

        if ($voucherPlugin && $voucherPlugin->is_active && $request->filled('voucher_code')) {
            $voucher = \App\Models\Voucher::where('code', $request->input('voucher_code'))->first();
            if (!$voucher) {
                return back()->withErrors(['voucher_code' => 'Kode voucher tidak valid.']);
            }
            if (!$voucher->is_active) {
                return back()->withErrors(['voucher_code' => 'Kupon/Voucher sudah tidak aktif.']);
            }
            if ($voucher->used_count >= $voucher->max_uses) {
                return back()->withErrors(['voucher_code' => 'Batas kuota penggunaan voucher telah habis.']);
            }

            $appliedVoucherCode = $voucher->code;
            if ($voucher->type === 'percentage') {
                $discount = ($rawTotalPrice * floatval($voucher->value)) / 100;
            } else {
                $discount = floatval($voucher->value);
            }
            $discount = min($discount, $rawTotalPrice);
            
            // Increment used count
            $voucher->increment('used_count');
        }

        $registrationData['voucher_code'] = $appliedVoucherCode;
        $registrationData['discount_amount'] = $discount;
        $registrationData['voucher_type'] = $appliedVoucherCode && isset($voucher) ? $voucher->type : null;
        $registrationData['voucher_value'] = $appliedVoucherCode && isset($voucher) ? floatval($voucher->value) : null;

        $uniqueCode = 0;
        $finalTotalPrice = max(0, $rawTotalPrice - $discount);
        if ($request->input('payment_method') === 'manual' && $finalTotalPrice > 0) {
            $uniqueCode = rand(100, 999);
        }

        $registrationData['unique_code'] = $uniqueCode;
        $registrationData['total_price'] = $finalTotalPrice + $uniqueCode;

        // --- Generate Unique Ticket Code: ZWF-{G}{NNNNN} ---
        // G = M (Male/Laki-laki) | F (Female/Lady/Perempuan)
        // NNNNN = 5-digit sequential number

        // 1. Detect gender from registration_data
        $genderPrefix = 'M'; // default: Male
        foreach ($registrationData as $fieldKey => $fieldVal) {
            $keyLower = strtolower($fieldKey);
            if (
                str_contains($keyLower, 'gender') ||
                str_contains($keyLower, 'kelamin') ||
                str_contains($keyLower, 'jenis_kel')
            ) {
                $valLower = strtolower(trim((string) $fieldVal));
                // Female indicators (Indonesian: perempuan/wanita/cewek/p; English: female/f/lady/l→lady)
                $femaleKeywords = ['female', 'perempuan', 'wanita', 'cewek', 'lady', 'f', 'p'];
                if (
                    in_array($valLower, $femaleKeywords) ||
                    str_contains($valLower, 'female') ||
                    str_contains($valLower, 'perempuan') ||
                    str_contains($valLower, 'wanita')
                ) {
                    $genderPrefix = 'F';
                }
                break;
            }
        }

        // 2. Generate Random Unique Ticket Code with Dynamic Prefix
        $prefix = strtoupper(trim(Setting::getValue('ticket_prefix', 'ZWF')));
        if (empty($prefix)) {
            $prefix = 'ZWF';
        }

        $randomNumber = rand(10000, 99999);
        $ticketCode = $prefix . '-' . $genderPrefix . $randomNumber;

        // Safety loop to ensure uniqueness
        while (Attendee::where('ticket_code', $ticketCode)->exists()) {
            $randomNumber = rand(10000, 99999);
            $ticketCode = $prefix . '-' . $genderPrefix . $randomNumber;
        }
        // --- End Ticket Code Generation ---

        // Process Dynamic Signature if present in schema
        $signaturePath = null;
        $signatureField = collect($form->fields_schema)->firstWhere('type', 'signature');
        if ($signatureField) {
            $fieldName = 'field_' . $signatureField['name'];
            if ($request->filled($fieldName)) {
                $signatureData = $request->input($fieldName);
                // Decode base64 image
                if (preg_match('/^data:image\/(\w+);base64,/', $signatureData, $type)) {
                    $data = substr($signatureData, strpos($signatureData, ',') + 1);
                    $type = strtolower($type[1]); // png, jpg, etc

                    if (in_array($type, ['jpg', 'jpeg', 'gif', 'png'])) {
                        $data = base64_decode($data);
                        $fileName = 'signatures/sig_' . $ticketCode . '_' . time() . '.' . $type;
                        Storage::disk('public')->put($fileName, $data);
                        $signaturePath = '/storage/' . $fileName;
                    }
                }
            }
        }

        // Process Payment Proof if uploaded immediately
        $paymentProofPath = null;
        if ($request->hasFile('payment_proof')) {
            $path = $request->file('payment_proof')->store('proofs', 'public');
            $paymentProofPath = '/storage/' . $path;
        }

        $paymentStatus = 'pending';
        if ($registrationData['total_price'] == 0) {
            $paymentStatus = 'paid';
        }

        $snapToken = null;
        $snapRedirectUrl = null;

        if ($request->input('payment_method') === 'midtrans' && $registrationData['total_price'] > 0) {
            $midtransServerKey = Setting::getValue('midtrans_server_key');
            if ($midtransServerKey) {
                $isProduction = Setting::getValue('midtrans_is_production') == '1';
                $endpoint = $isProduction
                    ? 'https://app.midtrans.com/snap/v1/transactions'
                    : 'https://app.sandbox.midtrans.com/snap/v1/transactions';

                $emailField = collect($form->fields_schema)->firstWhere('type', 'email');
                $email = $emailField ? ($registrationData[$emailField['name']] ?? null) : null;

                $phone = $registrationData['whatsapp'] ?? null;
                if (!$phone) {
                    foreach ($registrationData as $k => $v) {
                        if (str_contains(strtolower($k), 'whatsapp') || str_contains(strtolower($k), 'wa') || str_contains(strtolower($k), 'telp') || str_contains(strtolower($k), 'phone') || str_contains(strtolower($k), 'hp')) {
                            $phone = $v;
                            break;
                        }
                    }
                }

                $fullName = $registrationData['fullname'] ?? null;
                if (!$fullName) {
                    foreach ($registrationData as $k => $v) {
                        if (str_contains(strtolower($k), 'nama') || str_contains(strtolower($k), 'name')) {
                            $fullName = $v;
                            break;
                        }
                    }
                }
                $fullName = $fullName ?: 'Peserta';

                $payload = [
                    'transaction_details' => [
                        'order_id' => $ticketCode,
                        'gross_amount' => intval($registrationData['total_price']),
                    ],
                    'customer_details' => [
                        'first_name' => $fullName,
                        'email' => $email,
                        'phone' => $phone,
                    ],
                    'credit_card' => [
                        'secure' => true
                    ]
                ];

                try {
                    $response = \Illuminate\Support\Facades\Http::withBasicAuth($midtransServerKey, '')
                        ->post($endpoint, $payload);

                    if ($response->successful()) {
                        $resData = $response->json();
                        $snapToken = $resData['token'] ?? null;
                        $snapRedirectUrl = $resData['redirect_url'] ?? null;
                    } else {
                        \Illuminate\Support\Facades\Log::error('Midtrans Snap request failed: ' . $response->body());
                    }
                } catch (\Exception $e) {
                    \Illuminate\Support\Facades\Log::error('Midtrans Snap exception: ' . $e->getMessage());
                }
            }
        }

        $registrationData['snap_token'] = $snapToken;
        $registrationData['snap_redirect_url'] = $snapRedirectUrl;

        // Create Attendee
        $attendee = Attendee::create([
            'registration_form_id' => $form->id,
            'ticket_code' => $ticketCode,
            'registration_data' => $registrationData,
            'signature_path' => $signaturePath,
            'payment_method' => $request->input('payment_method'),
            'payment_status' => $paymentStatus,
            'payment_proof_path' => $paymentProofPath,
            'checked_in' => false,
        ]);

        if ($paymentStatus === 'paid') {
            try {
                self::sendETicketToAttendee($attendee);
            } catch (\Exception $e) {
                // Ignore
            }
        } else {
            // Send notification to admin if manual payment method is pending
            if ($attendee->payment_method === 'manual') {
                try {
                    $adminWaStr = Setting::getValue('notification_wa_numbers');
                    $adminEmailStr = Setting::getValue('notification_emails');
                    $fonnteToken = Setting::getValue('fonnte_token');
                    $enableFonnte = Setting::getValue('enable_fonnte') == '1';

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

                    $waPhone = $attendee->registration_data['whatsapp'] ?? null;
                    if (!$waPhone) {
                        foreach ($attendee->registration_data as $k => $v) {
                            if (str_contains(strtolower($k), 'whatsapp') || str_contains(strtolower($k), 'wa') || str_contains(strtolower($k), 'telp') || str_contains(strtolower($k), 'phone') || str_contains(strtolower($k), 'hp')) {
                                $waPhone = $v;
                                break;
                            }
                        }
                    }
                    $waPhone = $waPhone ?: '-';

                    $emailField = collect($form->fields_schema)->firstWhere('type', 'email');
                    $regEmail = $emailField ? ($attendee->registration_data[$emailField['name']] ?? null) : null;
                    if (!$regEmail) {
                        foreach ($attendee->registration_data as $k => $v) {
                            if (str_contains(strtolower($k), 'email') && filter_var($v, FILTER_VALIDATE_EMAIL)) {
                                $regEmail = $v;
                                break;
                            }
                        }
                    }
                    $regEmail = $regEmail ?: '-';

                    $totalPrice = number_format($attendee->registration_data['total_price'] ?? 0, 0, ',', '.');
                    $confirmationUrl = route('event.confirm_payment', $ticketCode);
                    $attendanceMode = strtoupper($attendee->registration_data['attendance_mode'] ?? 'OFFLINE');
                    $eventLocation = Setting::getValue('event_location', '-');

                    // Build merchandise text for WA
                    $merchText = '';
                    if (isset($attendee->registration_data['selected_merchandise']) && is_array($attendee->registration_data['selected_merchandise']) && count($attendee->registration_data['selected_merchandise']) > 0) {
                        $merchText = "\n\n*MERCHANDISE*";
                        foreach ($attendee->registration_data['selected_merchandise'] as $m) {
                            $detail = $m['name'] ?? '';
                            if (!empty($m['size']))
                                $detail .= " (Size: " . $m['size'] . ")";
                            if (!empty($m['nickname']))
                                $detail .= " [Nama: " . $m['nickname'] . "]";
                            $price = floatval($m['price'] ?? 0);
                            $merchText .= "\n- {$detail}: Rp " . number_format($price, 0, ',', '.');
                        }
                    }

                    $donationText = '';
                    if (isset($attendee->registration_data['donation_amount']) && floatval($attendee->registration_data['donation_amount']) > 0) {
                        $donationText = "\n• *Donasi*: Rp " . number_format(floatval($attendee->registration_data['donation_amount']), 0, ',', '.');
                    }

                    $voucherText = '';
                    $discount = floatval($attendee->registration_data['discount_amount'] ?? 0);
                    if ($discount > 0) {
                        $vCode = $attendee->registration_data['voucher_code'] ?? '';
                        $vType = $attendee->registration_data['voucher_type'] ?? '';
                        $vValue = $attendee->registration_data['voucher_value'] ?? '';
                        $vDetail = '';
                        if ($vType && $vValue) {
                            $vDetail = ' (' . ($vType === 'percentage' ? $vValue . '%' : 'Rp ' . number_format(floatval($vValue), 0, ',', '.')) . ')';
                        }
                        $voucherText = "\n• *Diskon Voucher* ({$vCode}){$vDetail}: - Rp " . number_format($discount, 0, ',', '.');
                    }

                    // 1. Send WhatsApp alerts via Fonnte if enabled
                    if ($enableFonnte && $fonnteToken && !empty($adminWaStr)) {
                        $waNumbers = array_filter(array_map('trim', explode(',', $adminWaStr)));
                        $adminTemplate = \App\Models\BroadcastTemplate::where('name', 'Notifikasi Pendaftaran Baru (Admin)')->first();
                        if ($adminTemplate) {
                            $waMessage = self::parsePlaceholders($adminTemplate->whatsapp_body ?: $adminTemplate->body, $attendee);
                        } else {
                            $waMessage = "⚠️ *PENDAFTARAN BARU (TRANSFER MANUAL)* ⚠️\n\nTelah terdeteksi pendaftaran baru yang memerlukan verifikasi pembayaran:\n\n• *Kode Tiket*: {$ticketCode}\n• *Nama*: {$fullName}\n• *No. WhatsApp*: {$waPhone}\n• *Email*: {$regEmail}\n• *Kehadiran*: {$attendanceMode}\n• *Lokasi*: {$eventLocation}\n• *Total*: Rp {$totalPrice}{$donationText}{$merchText}{$voucherText}\n\nSilakan lakukan verifikasi pembayaran melalui tautan berikut:\n🔗 {$confirmationUrl}";
                        }

                        foreach ($waNumbers as $num) {
                            self::sendWhatsappViaFonnte($num, $waMessage, $fonnteToken);
                        }
                    }

                    // 2. Send Email alerts if SMTP host is configured
                    $smtpHost = Setting::getValue('smtp_host');
                    if ($smtpHost && !empty($adminEmailStr)) {
                        $emails = array_filter(array_map('trim', explode(',', $adminEmailStr)));

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
                        \Illuminate\Support\Facades\Mail::forgetMailers();

                        $adminTemplate = \App\Models\BroadcastTemplate::where('name', 'Notifikasi Pendaftaran Baru (Admin)')->first();
                        if ($adminTemplate) {
                            $subject = self::parsePlaceholders($adminTemplate->email_subject ?: ($adminTemplate->subject ?: ''), $attendee);
                            $body = self::parsePlaceholders(self::getEmailBody($adminTemplate), $attendee);
                            $mailable = new \App\Mail\BroadcastMail($subject, $body, $adminTemplate->email_banner);
                        } else {
                            $mailable = new \App\Mail\AdminRegistrationNotificationMail($attendee);
                        }

                        foreach ($emails as $email) {
                            if (filter_var($email, FILTER_VALIDATE_EMAIL)) {
                                \Illuminate\Support\Facades\Mail::to($email)->send($mailable);
                            }
                        }
                    }
                } catch (\Exception $e) {
                    \Illuminate\Support\Facades\Log::error('Admin registration notification failed: ' . $e->getMessage());
                }
            }
        }

        // Send registration confirmation email to attendee
        // This always fires (paid, pending manual, pending midtrans) as long as SMTP is set
        try {
            $smtpHost = Setting::getValue('smtp_host');
            if ($smtpHost) {
                // Resolve attendee email from registration data
                $attendeeEmail = null;
                $emailField = collect($form->fields_schema)->firstWhere('type', 'email');
                if ($emailField) {
                    $attendeeEmail = $registrationData[$emailField['name']] ?? null;
                }
                if (!$attendeeEmail) {
                    foreach ($registrationData as $k => $v) {
                        if (str_contains(strtolower($k), 'email') && filter_var($v, FILTER_VALIDATE_EMAIL)) {
                            $attendeeEmail = $v;
                            break;
                        }
                    }
                }

                if ($attendeeEmail) {
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
                    \Illuminate\Support\Facades\Mail::forgetMailers();

                    $regTemplate = \App\Models\BroadcastTemplate::where('name', 'Konfirmasi Pendaftaran Awal')->first();
                    if ($regTemplate) {
                        $subject = self::parsePlaceholders($regTemplate->email_subject ?: ($regTemplate->subject ?: ''), $attendee);
                        $body = self::parsePlaceholders(self::getEmailBody($regTemplate), $attendee);
                        $mailable = new \App\Mail\BroadcastMail($subject, $body, $regTemplate->email_banner);
                    } else {
                        $mailable = new \App\Mail\RegistrationConfirmationMail($attendee);
                    }

                    \Illuminate\Support\Facades\Mail::to($attendeeEmail)->send($mailable);
                }
            }
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Registration confirmation email failed: ' . $e->getMessage());
        }

        // Broadcast update to PublicReport page (new registration)
        try {
            broadcast(new AttendeeDataUpdated('new_registration'));
        } catch (\Exception $e) {
            // Non-critical — don't fail registration if broadcast fails
        }

        return redirect()->route('event.success', $ticketCode);
    }

    public function uploadPaymentProof(Request $request, $ticketCode)
    {
        $request->validate([
            'payment_proof' => 'required|image|max:4096'
        ]);

        $attendee = Attendee::where('ticket_code', $ticketCode)->firstOrFail();

        $path = $request->file('payment_proof')->store('proofs', 'public');
        $attendee->payment_proof_path = '/storage/' . $path;
        $attendee->save();

        return redirect()->back()->with('success', 'Payment proof uploaded successfully.');
    }

    public function registrationSuccess($ticketCode)
    {
        $attendee = Attendee::where('ticket_code', $ticketCode)->with('form')->firstOrFail();

        $settingsKeys = [
            'event_title',
            'event_date',
            'event_time',
            'event_location',
            'event_type',
            'event_platform',
            'event_platform_url',
            'event_platform_id',
            'event_platform_passcode',
            'event_platform_custom_name',
            'online_ticket_type',
            'online_ticket_price',
            'wa_admin_number',
            'wa_custom_message',
            'midtrans_client_key',
            'midtrans_is_production',
            'payment_manual_bank_name',
            'payment_manual_account_number',
            'payment_manual_account_name',
            'event_location_map',
            'event_venue_name',
            'event_venue_address',
            'event_favicon',
            'meta_description',
            'meta_keywords',
            'og_title',
            'og_description',
            'og_image',
            'social_media_links',
            'event_organized_by',
            'event_developed_by',
            'event_organized_by_url',
            'event_developed_by_url'
        ];
        $settings = [];
        foreach ($settingsKeys as $key) {
            $settings[$key] = Setting::getValue($key, '');
        }

        // Generate WA Link
        $waNumber = $settings['wa_admin_number'] ?: '628123456789';
        $waNumber = preg_replace('/\D/', '', $waNumber);
        if (str_starts_with($waNumber, '0')) {
            $waNumber = '62' . substr($waNumber, 1);
        }

        $customMsg = $settings['wa_custom_message'] ?: 'Halo Admin, saya ingin konfirmasi bukti transfer Zawawalk. Nama: {name}, Kode Tiket: {ticket_code}.';

        $paymentProofUrl = $attendee->payment_proof_path ? url($attendee->payment_proof_path) : '';
        if ($paymentProofUrl && !str_contains($customMsg, '{payment_proof_url}')) {
            $customMsg .= "\n\nBukti Transfer: {payment_proof_url}";
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
        $message = str_replace(
            ['{name}', '{ticket_code}', '{payment_proof_url}'],
            [$fullName, $ticketCode, $paymentProofUrl ?: '-'],
            $customMsg
        );

        $waLink = "https://wa.me/{$waNumber}?text=" . urlencode($message);

        return Inertia::render('Welcome/Success', [
            'attendee' => $attendee,
            'settings' => $settings,
            'waLink' => $waLink
        ]);
    }

    public function midtransCallback(Request $request)
    {
        $serverKey = Setting::getValue('midtrans_server_key');
        if (!$serverKey) {
            return response()->json(['message' => 'Midtrans server key not configured'], 500);
        }

        $json = $request->json()->all();
        $orderId = $json['order_id'] ?? null;
        $statusCode = $json['status_code'] ?? null;
        $grossAmount = $json['gross_amount'] ?? null;
        $signatureKey = $json['signature_key'] ?? null;
        $transactionStatus = $json['transaction_status'] ?? null;
        $type = $json['payment_type'] ?? null;
        $fraudStatus = $json['fraud_status'] ?? null;

        if (!$orderId) {
            return response()->json(['message' => 'Order ID is required'], 400);
        }

        // Verify signature key
        $localSignature = hash('sha512', $orderId . $statusCode . $grossAmount . $serverKey);
        if ($localSignature !== $signatureKey) {
            return response()->json(['message' => 'Invalid signature key'], 403);
        }

        $attendee = Attendee::where('ticket_code', $orderId)->first();
        if (!$attendee) {
            return response()->json(['message' => 'Attendee not found'], 404);
        }

        if ($transactionStatus == 'capture') {
            if ($type == 'credit_card') {
                if ($fraudStatus == 'challenge') {
                    $attendee->payment_status = 'pending';
                } else {
                    $attendee->payment_status = 'paid';
                }
            }
        } else if ($transactionStatus == 'settlement') {
            $attendee->payment_status = 'paid';
        } else if ($transactionStatus == 'pending') {
            $attendee->payment_status = 'pending';
        } else if (in_array($transactionStatus, ['deny', 'expire', 'cancel'])) {
            $attendee->payment_status = 'failed';
        }

        $attendee->save();

        if ($attendee->payment_status === 'paid') {
            try {
                self::sendETicketToAttendee($attendee);
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::error('Callback email sending failed: ' . $e->getMessage());
            }
        }

        return response()->json(['message' => 'Callback processed successfully']);
    }

    public static function sendETicketToAttendee(Attendee $attendee)
    {
        // 1. Prevent sending if payment status is not paid
        if ($attendee->payment_status !== 'paid') {
            return false;
        }

        $form = $attendee->form;
        if (!$form) {
            return false;
        }

        // Extract Recipient Info
        $emailField = collect($form->fields_schema)->firstWhere('type', 'email');
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

        $eventTitle = Setting::getValue('event_title', 'Zawawalk 2026: The Fun Walk Festival');
        $eventDate = Setting::getValue('event_date', '26/09/2026');
        $eventTime = Setting::getValue('event_time', '06.00 - 10.00 AM');
        $eventLocation = Setting::getValue('event_location', 'Balai Kartini');
        $attendanceMode = strtoupper($attendee->registration_data['attendance_mode'] ?? 'OFFLINE');
        $ticketCode = $attendee->ticket_code;
        $ticketUrl = route('event.success', $ticketCode);

        $sentEmail = false;
        $sentWa = false;

        // 2. Send via Email SMTP if auto-send checked and email is available
        $smtpHost = Setting::getValue('smtp_host');
        $autoSendEmail = Setting::getValue('auto_send_ticket_email') == '1';
        if ($email && $smtpHost && $autoSendEmail) {
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
            \Illuminate\Support\Facades\Mail::forgetMailers();

            try {
                $eTicketTemplate = \App\Models\BroadcastTemplate::where('name', 'Konfirmasi Tiket / E-Ticket')->first();
                if ($eTicketTemplate) {
                    $subject = self::parsePlaceholders($eTicketTemplate->email_subject ?: ($eTicketTemplate->subject ?: ''), $attendee);
                    $body = self::parsePlaceholders(self::getEmailBody($eTicketTemplate), $attendee);
                    $mailable = new \App\Mail\BroadcastMail($subject, $body, $eTicketTemplate->email_banner);
                } else {
                    $mailable = new \App\Mail\ETicketMail($attendee);
                }
                \Illuminate\Support\Facades\Mail::to($email)->send($mailable);
                $sentEmail = true;
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::error('SMTP Mail send failed: ' . $e->getMessage());
            }
        }

        $enableFonnte = Setting::getValue('enable_fonnte') == '1';
        $autoSendWhatsapp = Setting::getValue('auto_send_ticket_whatsapp') == '1';
        $fonnteToken = Setting::getValue('fonnte_token');
        if ($phone && $enableFonnte && $autoSendWhatsapp && $fonnteToken) {
            $eTicketTemplate = \App\Models\BroadcastTemplate::where('name', 'Konfirmasi Tiket / E-Ticket')->first();
            if ($eTicketTemplate) {
                $message = self::parsePlaceholders($eTicketTemplate->whatsapp_body ?: $eTicketTemplate->body, $attendee);
            } else {
                $onlineDetails = '';
                if ($attendanceMode === 'ONLINE' || $attendanceMode === 'HYBRID') {
                    $platform = Setting::getValue('event_platform', 'zoom');
                    $platformName = ($platform === 'zoom') ? 'Zoom Meeting' :
                        (($platform === 'google_meet') ? 'Google Meet' :
                            (($platform === 'youtube') ? 'YouTube Live' : Setting::getValue('event_platform_custom_name', 'Platform')));
                    $meetingUrl = Setting::getValue('event_platform_url', '');
                    $meetingId = Setting::getValue('event_platform_id', '');
                    $passcode = Setting::getValue('event_platform_passcode', '');

                    $onlineDetails = "\nPlatform Streaming: {$platformName}";
                    if ($meetingUrl)
                        $onlineDetails .= "\nLink: {$meetingUrl}";
                    if ($meetingId)
                        $onlineDetails .= "\nMeeting ID: {$meetingId}";
                    if ($passcode)
                        $onlineDetails .= "\nPasscode: {$passcode}";
                }

                $merchDetailsText = '';
                if (isset($attendee->registration_data['selected_merchandise']) && is_array($attendee->registration_data['selected_merchandise']) && count($attendee->registration_data['selected_merchandise']) > 0) {
                    $merchDetailsText = "\n\n*DETAIL MERCHANDISE*";
                    foreach ($attendee->registration_data['selected_merchandise'] as $m) {
                        $detail = $m['name'] ?? '';
                        if (!empty($m['size'])) {
                            $detail .= " (Size: " . $m['size'] . ")";
                        }
                        if (!empty($m['nickname'])) {
                            $detail .= " [Nama: " . $m['nickname'] . "]";
                        }
                        $price = floatval($m['price'] ?? 0);
                        $merchDetailsText .= "\n- {$detail}: Rp " . number_format($price, 0, ',', '.');
                    }
                }

                $donationDetailsText = '';
                if (isset($attendee->registration_data['donation_amount']) && floatval($attendee->registration_data['donation_amount']) > 0) {
                    $donationDetailsText = "\n\nTerima kasih atas donasi Anda sebesar Rp " . number_format(floatval($attendee->registration_data['donation_amount']), 0, ',', '.') . "!";
                }

                $voucherDetailsText = '';
                $discount = floatval($attendee->registration_data['discount_amount'] ?? 0);
                if ($discount > 0) {
                    $vCode = $attendee->registration_data['voucher_code'] ?? '';
                    $vType = $attendee->registration_data['voucher_type'] ?? '';
                    $vValue = $attendee->registration_data['voucher_value'] ?? '';
                    $vDetail = '';
                    if ($vType && $vValue) {
                        $vDetail = ' (' . ($vType === 'percentage' ? $vValue . '%' : 'Rp ' . number_format(floatval($vValue), 0, ',', '.')) . ')';
                    }
                    $voucherDetailsText = "\nDiskon Voucher ({$vCode}){$vDetail}: - Rp " . number_format($discount, 0, ',', '.');
                }

                $message = "Halo {$fullName},\n\nTerima kasih! Pendaftaran Anda telah terverifikasi.\n\n*DETAIL TIKET*\nNama: {$fullName}\nKode Tiket: {$ticketCode}\nStatus: LUNAS / PAID\nKehadiran: {$attendanceMode}{$merchDetailsText}{$donationDetailsText}{$voucherDetailsText}\n\n*DETAIL ACARA*\nAcara: {$eventTitle}\nTanggal: {$eventDate}\nWaktu: {$eventTime}\nLokasi: {$eventLocation}{$onlineDetails}\n\nTampilkan QR Code tiket Anda saat memasuki lokasi acara dengan membuka link E-Tiket resmi berikut:\n{$ticketUrl}\n\n_📌 Catatan: Jika link E-Tiket di atas tidak bisa diklik, silakan balas pesan ini dan kami akan membantu Anda._\n\nSampai jumpa di lokasi acara!";
            }

            $sentWa = self::sendWhatsappViaFonnte($phone, $message, $fonnteToken);
        }

        return $sentEmail || $sentWa;
    }

    public static function sendThankYouToAttendee(Attendee $attendee)
    {
        if ($attendee->payment_status !== 'paid') {
            return false;
        }

        $form = $attendee->form;
        if (!$form) {
            return false;
        }

        // Extract Recipient Info
        $emailField = collect($form->fields_schema)->firstWhere('type', 'email');
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

        $eventTitle = Setting::getValue('event_title', 'Zawawalk 2026: The Fun Walk Festival');

        $sentEmail = false;
        $sentWa = false;

        $smtpHost = Setting::getValue('smtp_host');
        if ($email && $smtpHost) {
            config([
                'mail.default' => 'smtp',
                'mail.mailers.smtp.host' => $smtpHost,
                'mail.mailers.smtp.port' => Setting::getValue('smtp_port', '587'),
                'mail.mailers.smtp.username' => Setting::getValue('smtp_username'),
                'mail.mailers.smtp.password' => Setting::getValue('smtp_password'),
                'mail.mailers.smtp.encryption' => Setting::getValue('smtp_encryption', 'tls'),
                'mail.from.address' => Setting::getValue('smtp_from_address', 'no-reply@zawawalk.com'),
                'mail.from.name' => Setting::getValue('smtp_from_name', 'Panitia Zawawalk'),
            ]);

            try {
                $checkinTemplate = \App\Models\BroadcastTemplate::where('name', 'Konfirmasi Check-In')->first();
                if ($checkinTemplate) {
                    $subject = self::parsePlaceholders($checkinTemplate->email_subject ?: ($checkinTemplate->subject ?: ''), $attendee);
                    $body = self::parsePlaceholders(self::getEmailBody($checkinTemplate), $attendee);
                    $mailable = new \App\Mail\BroadcastMail($subject, $body, $checkinTemplate->email_banner);
                } else {
                    $mailable = new \App\Mail\CheckInThankYouMail($attendee);
                }
                \Illuminate\Support\Facades\Mail::to($email)->send($mailable);
                $sentEmail = true;
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::error('SMTP Thank You send failed: ' . $e->getMessage());
            }
        }

        $fonnteToken = Setting::getValue('fonnte_token');
        if ($phone && $fonnteToken) {
            $checkinTemplate = \App\Models\BroadcastTemplate::where('name', 'Konfirmasi Check-In')->first();
            if ($checkinTemplate) {
                $message = self::parsePlaceholders($checkinTemplate->whatsapp_body ?: $checkinTemplate->body, $attendee);
            } else {
                $message = "Halo {$fullName}, racepack Anda untuk acara {$eventTitle} telah berhasil diambil.\n\nSelamat menikmati keseruan jalan santai dan raih doorprize hari ini!\n\n📸 *Dokumentasi Acara*\nPantau terus keseruan hari ini! Dokumentasi acara akan diunggah secara berkala. Anda dapat mengeceknya secara berkala melalui tautan berikut:\n🔗 https://zlinks.id/Zawa-Walk-Fesyar-NTB-2026";
            }
            $sentWa = self::sendWhatsappViaFonnte($phone, $message, $fonnteToken);
        }

        return $sentEmail || $sentWa;
    }

    public static function sendWhatsappViaFonnte($phone, $message, $token)
    {
        if (empty($phone) || empty($token)) {
            return false;
        }

        $phone = preg_replace('/\D/', '', $phone);
        if (str_starts_with($phone, '0')) {
            $phone = '62' . substr($phone, 1);
        }

        try {
            $response = \Illuminate\Support\Facades\Http::timeout(5)->withHeaders([
                'Authorization' => $token,
            ])->post('https://api.fonnte.com/send', [
                        'target' => $phone,
                        'message' => $message,
                    ]);

            return $response->successful();
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\Log::error('Fonnte API send exception: ' . $e->getMessage());
            return false;
        }
    }

    public function publicReport(Request $request)
    {
        $settingsKeys = [
            'event_title',
            'event_description',
            'event_date',
            'event_time',
            'event_location',
            'event_banner',
            'event_favicon',
            'event_logo',
            'meta_description',
            'meta_keywords',
            'og_title',
            'og_description',
            'og_image',
            'realtime_enabled',
            'realtime_stop_at',
            'social_media_links',
            'event_organized_by',
            'event_developed_by',
            'event_organized_by_url',
            'event_developed_by_url'
        ];
        $settings = [];
        foreach ($settingsKeys as $key) {
            $settings[$key] = Setting::getValue($key, '');
        }

        // Only get paid attendees to save payload size and respect privacy/status
        $attendees = Attendee::where('payment_status', 'paid')
            ->orderBy('created_at', 'desc')
            ->get();

        return Inertia::render('PublicReport', [
            'settings' => $settings,
            'attendees' => $attendees
        ]);
    }

    public function liveCheckin(Request $request)
    {
        $settingsKeys = [
            'event_title',
            'event_banner',
            'event_logo',
            'event_favicon',
            'meta_description',
            'meta_keywords',
            'og_title',
            'og_description',
            'og_image',
            'realtime_enabled',
            'realtime_stop_at',
            'social_media_links',
            'event_organized_by',
            'event_developed_by',
            'event_organized_by_url',
            'event_developed_by_url'
        ];
        $settings = [];
        foreach ($settingsKeys as $key) {
            $settings[$key] = Setting::getValue($key, '');
        }

        // Get all checked-in attendees
        $attendees = Attendee::where('checked_in', true)
            ->orderBy('checked_in_at', 'desc')
            ->get();

        // Filter sensitive data
        $safeAttendees = $attendees->map(function ($att) {
            $data = $att->registration_data ?? [];

            // Extract Name
            $name = $data['fullname'] ?? null;
            if (!$name) {
                foreach ($data as $k => $v) {
                    if (str_contains(strtolower($k), 'nama') || str_contains(strtolower($k), 'name')) {
                        $name = $v;
                        break;
                    }
                }
            }
            $name = $name ?: 'Peserta Nostalgia';

            // Extract Photo
            $photo = null;
            foreach ($data as $k => $v) {
                if ((str_contains(strtolower($k), 'foto') || str_contains(strtolower($k), 'photo') || str_contains(strtolower($k), 'gambar') || str_contains(strtolower($k), 'image')) && is_string($v) && str_starts_with($v, '/storage/')) {
                    $photo = $v;
                    break;
                }
            }

            return [
                'id' => $att->id,
                'name' => $name,
                'photo' => $photo,
                'checked_in_at' => $att->checked_in_at ? $att->checked_in_at->diffForHumans() : 'Baru saja',
                'timestamp' => $att->checked_in_at ? $att->checked_in_at->timestamp : time()
            ];
        });

        return Inertia::render('LiveCheckIn', [
            'settings' => $settings,
            'attendees' => $safeAttendees
        ]);
    }

    public function showConfirmPayment($ticketCode)
    {
        $attendee = Attendee::where('ticket_code', $ticketCode)->with('form')->firstOrFail();
        $isVerified = session("payment_passcode_verified_{$ticketCode}") === true;

        $settingsKeys = [
            'event_title',
            'event_banner',
            'event_logo',
            'event_favicon',
            'meta_description',
            'meta_keywords',
            'og_title',
            'og_description',
            'og_image',
            'social_media_links',
            'event_organized_by',
            'event_developed_by',
            'event_organized_by_url',
            'event_developed_by_url'
        ];
        $settings = [];
        foreach ($settingsKeys as $key) {
            $settings[$key] = Setting::getValue($key, '');
        }

        if (!$isVerified) {
            $passcodeFullName = $attendee->registration_data['fullname'] ?? null;
            if (!$passcodeFullName) {
                foreach ($attendee->registration_data as $k => $v) {
                    if (str_contains(strtolower($k), 'nama') || str_contains(strtolower($k), 'name')) {
                        $passcodeFullName = $v;
                        break;
                    }
                }
            }
            $passcodeFullName = $passcodeFullName ?: 'Peserta';

            return Inertia::render('ConfirmPayment', [
                'attendee' => [
                    'ticket_code' => $attendee->ticket_code,
                    'fullname' => $passcodeFullName
                ],
                'requiresPasscode' => true,
                'settings' => $settings
            ]);
        }

        return Inertia::render('ConfirmPayment', [
            'attendee' => $attendee,
            'requiresPasscode' => false,
            'settings' => $settings
        ]);
    }

    public function verifyConfirmPaymentPasscode(Request $request, $ticketCode)
    {
        $request->validate([
            'passcode' => 'required|string'
        ]);

        $adminPasscode = Setting::getValue('admin_passcode', '123456');

        if ($request->input('passcode') === $adminPasscode) {
            session(["payment_passcode_verified_{$ticketCode}" => true]);
            return back()->with('success', 'Passcode terverifikasi.');
        }

        return back()->withErrors(['passcode' => 'Passcode salah! Silakan coba lagi.']);
    }

    public function verifyConfirmPayment(Request $request, $ticketCode)
    {
        if (session("payment_passcode_verified_{$ticketCode}") !== true) {
            return redirect()->route('event.confirm_payment', $ticketCode)->withErrors(['passcode' => 'Sesi kedaluwarsa atau tidak valid.']);
        }

        $attendee = Attendee::where('ticket_code', $ticketCode)->firstOrFail();

        $status = $request->input('payment_status', 'paid');
        $attendee->payment_status = $status;
        $attendee->save();

        if ($status === 'paid') {
            try {
                self::sendETicketToAttendee($attendee);
            } catch (\Exception $e) {
                // Ignore
            }
        }

        // Clean up session
        session()->forget("payment_passcode_verified_{$ticketCode}");

        return redirect()->route('event.confirm_payment', $ticketCode)->with('success', "Pembayaran untuk {$ticketCode} telah berhasil diverifikasi.");
    }

    public static function getEmailBody($template)
    {
        if (!$template) return '';
        $theme = $template->email_body ?: $template->body;
        if (str_contains($theme, '{email_narrative}')) {
            $narrative = $template->email_narrative ?: $template->body;
            $theme = str_replace('{email_narrative}', $narrative, $theme);
        }
        return $theme;
    }

    public static function parsePlaceholders($text, Attendee $attendee)
    {
        if (empty($text)) {
            return '';
        }

        $form = $attendee->form;

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

        // Calculate total price
        $total = floatval($attendee->registration_data['total_price'] ?? 0);

        // Get attendee info
        $email = null;
        if ($form) {
            $emailField = collect($form->fields_schema ?? [])->firstWhere('type', 'email');
            $email = $emailField ? ($attendee->registration_data[$emailField['name']] ?? null) : null;
        }
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

        $placeholders = [
            '{nama}' => $fullName,
            '{ticket_code}' => $attendee->ticket_code,
            '{attendance_mode}' => strtoupper($attendee->registration_data['attendance_mode'] ?? 'OFFLINE'),
            '{payment_status}' => strtoupper($attendee->payment_status),
            '{payment_method}' => strtoupper($attendee->payment_method),
            '{ticket_url}' => route('event.success', $attendee->ticket_code),
            '{confirm_payment_url}' => route('event.confirm_payment', $attendee->ticket_code),
            '{amount_paid}' => 'Rp ' . number_format($total, 0, ',', '.'),
            '{event_title}' => Setting::getValue('event_title', 'Zawawalk 2026: The Fun Walk Festival'),
            '{event_date}' => Setting::getValue('event_date', '26/09/2026'),
            '{event_time}' => Setting::getValue('event_time', '06.00 - 10.00 AM'),
            '{event_location}' => Setting::getValue('event_location', 'Balai Kartini'),
            '{wa_admin_number}' => Setting::getValue('wa_admin_number', ''),
            '{email}' => $email,
            '{phone}' => $phone,
        ];

        // Legacy compatibility
        $placeholders['{name}'] = $fullName;

        return str_replace(array_keys($placeholders), array_values($placeholders), $text);
    }
}
