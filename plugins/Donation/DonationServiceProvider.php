<?php

namespace Plugins\Donation;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Route;

class DonationServiceProvider extends ServiceProvider
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
                Route::get('/donation-manual', function () {
                    return response()->json([
                        'message' => 'Modul Donasi Transfer Manual (Plugin Aktif)',
                        'instructions' => 'Silakan melakukan transfer donasi reuni ke Bank Mandiri: 9876-5432-10 a/n Reuni Alumni'
                    ]);
                });
            });
    }
}
