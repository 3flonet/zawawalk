<?php

namespace Plugins\Voucher;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Route;

class VoucherServiceProvider extends ServiceProvider
{
    public function register()
    {
        //
    }

    public function boot()
    {
        $this->registerRoutes();
    }

    protected function registerRoutes()
    {
        Route::middleware(['web'])
            ->group(function () {
                Route::post('/voucher-validate', function (\Illuminate\Http\Request $request) {
                    $code = $request->input('code');

                    if (empty($code)) {
                        return response()->json(['valid' => false, 'message' => 'Kode voucher tidak boleh kosong.']);
                    }

                    $voucher = \App\Models\Voucher::where('code', $code)->first();

                    if (!$voucher) {
                        return response()->json(['valid' => false, 'message' => 'Kode voucher tidak valid.']);
                    }

                    if (!$voucher->is_active) {
                        return response()->json(['valid' => false, 'message' => 'Voucher sudah tidak aktif.']);
                    }

                    if ($voucher->used_count >= $voucher->max_uses) {
                        return response()->json(['valid' => false, 'message' => 'Batas penggunaan voucher telah terpenuhi.']);
                    }

                    return response()->json([
                        'valid' => true,
                        'code' => $voucher->code,
                        'type' => $voucher->type,
                        'value' => (float)$voucher->value,
                        'category' => $voucher->category,
                        'message' => 'Voucher berhasil diterapkan!'
                    ]);
                });
            });
    }
}
