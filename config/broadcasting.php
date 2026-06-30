<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Default Broadcaster
    |--------------------------------------------------------------------------
    |
    | This option controls the default broadcaster that will be used by the
    | framework when an event needs to be broadcast. You may set this to
    | any of the connections defined in the "connections" array below.
    |
    | Supported: "reverb", "pusher", "ably", "redis", "log", "null"
    |
    */

    'default' => (function() {
        try {
            if (class_exists(\App\Models\Setting::class) && app()->has('db')) {
                return \App\Models\Setting::getValue('broadcaster_type', env('BROADCAST_CONNECTION', 'reverb'));
            }
        } catch (\Throwable $e) {}
        return env('BROADCAST_CONNECTION', 'reverb');
    })(),

    /*
    |--------------------------------------------------------------------------
    | Broadcast Connections
    |--------------------------------------------------------------------------
    |
    | Here you may define all of the broadcast connections that will be used
    | to broadcast events to other systems or over WebSockets. Samples of
    | each available type of connection are provided inside this array.
    |
    */

    'connections' => [

        'reverb' => [
            'driver' => 'reverb',
            'key' => env('REVERB_APP_KEY'),
            'secret' => env('REVERB_APP_SECRET'),
            'app_id' => env('REVERB_APP_ID'),
            'options' => [
                'host' => env('REVERB_HOST'),
                'port' => env('REVERB_PORT', 443),
                'scheme' => env('REVERB_SCHEME', 'https'),
                'useTLS' => env('REVERB_SCHEME', 'https') === 'https',
            ],
            'client_options' => [
                // Guzzle client options: https://docs.guzzlephp.org/en/stable/request-options.html
            ],
        ],

        'pusher' => [
            'driver' => 'pusher',
            'key' => (function() {
                try {
                    if (class_exists(\App\Models\Setting::class) && app()->has('db')) {
                        return \App\Models\Setting::getValue('pusher_app_key', env('PUSHER_APP_KEY'));
                    }
                } catch (\Throwable $e) {}
                return env('PUSHER_APP_KEY');
            })(),
            'secret' => (function() {
                try {
                    if (class_exists(\App\Models\Setting::class) && app()->has('db')) {
                        return \App\Models\Setting::getValue('pusher_app_secret', env('PUSHER_APP_SECRET'));
                    }
                } catch (\Throwable $e) {}
                return env('PUSHER_APP_SECRET');
            })(),
            'app_id' => (function() {
                try {
                    if (class_exists(\App\Models\Setting::class) && app()->has('db')) {
                        return \App\Models\Setting::getValue('pusher_app_id', env('PUSHER_APP_ID'));
                    }
                } catch (\Throwable $e) {}
                return env('PUSHER_APP_ID');
            })(),
            'options' => [
                'cluster' => (function() {
                    try {
                        if (class_exists(\App\Models\Setting::class) && app()->has('db')) {
                            return \App\Models\Setting::getValue('pusher_app_cluster', env('PUSHER_APP_CLUSTER'));
                        }
                    } catch (\Throwable $e) {}
                    return env('PUSHER_APP_CLUSTER');
                })(),
                'host' => env('PUSHER_HOST') ?: 'api-'.((function() {
                    try {
                        if (class_exists(\App\Models\Setting::class) && app()->has('db')) {
                            return \App\Models\Setting::getValue('pusher_app_cluster', env('PUSHER_APP_CLUSTER', 'mt1'));
                        }
                    } catch (\Throwable $e) {}
                    return env('PUSHER_APP_CLUSTER', 'mt1');
                })()).'.pusher.com',
                'port' => env('PUSHER_PORT', 443),
                'scheme' => env('PUSHER_SCHEME', 'https'),
                'encrypted' => true,
                'useTLS' => env('PUSHER_SCHEME', 'https') === 'https',
            ],
            'client_options' => [
                // Guzzle client options: https://docs.guzzlephp.org/en/stable/request-options.html
            ],
        ],

        'ably' => [
            'driver' => 'ably',
            'key' => env('ABLY_KEY'),
        ],

        'log' => [
            'driver' => 'log',
        ],

        'null' => [
            'driver' => 'null',
        ],

    ],

];
