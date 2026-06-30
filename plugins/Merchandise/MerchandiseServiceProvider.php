<?php

namespace Plugins\Merchandise;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Route;

class MerchandiseServiceProvider extends ServiceProvider
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
                Route::get('/merchandise-catalog', function () {
                    return response()->json([
                        'message' => 'Modul Order Merchandise (Kaos, Jacket, Tumbler)',
                        'items' => [
                            ['id' => 'kaos', 'name' => 'Kaos Retro 1996', 'price' => 75000],
                            ['id' => 'jacket', 'name' => 'Jaket Varsity SMA 78', 'price' => 250000],
                            ['id' => 'tumbler', 'name' => 'Tumbler Nostalgic', 'price' => 50000]
                        ]
                    ]);
                });
            });
    }
}
