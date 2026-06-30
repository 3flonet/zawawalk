<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta name="csrf-token" content="{{ csrf_token() }}">

        @php
            $eventTitle = \App\Models\Setting::getValue('event_title', 'Zawawalk 2026: The Fun Walk Festival');
            $eventDesc = \App\Models\Setting::getValue('meta_description') ?: \App\Models\Setting::getValue('event_description');
            $metaKeywords = \App\Models\Setting::getValue('meta_keywords') ?: 'zawawalk, fun walk';
            $ogTitle = \App\Models\Setting::getValue('og_title') ?: $eventTitle;
            $ogDesc = \App\Models\Setting::getValue('og_description') ?: $eventDesc;
            $ogImage = \App\Models\Setting::getValue('og_image') ?: \App\Models\Setting::getValue('event_banner');
            if ($ogImage && !str_starts_with($ogImage, 'http')) {
                $ogImage = url($ogImage);
            }
            
            $routeName = request()->route() ? request()->route()->getName() : '';
            $isNoIndex = in_array($routeName, ['event.confirm_payment', 'dashboard', 'login', 'register']) || str_starts_with($routeName, 'admin.');
        @endphp

        <title inertia>{{ $eventTitle }}</title>

        <!-- SEO & Meta Tags -->
        <meta name="description" content="{{ $eventDesc }}">
        <meta name="keywords" content="{{ $metaKeywords }}">
        @if($isNoIndex)
            <meta name="robots" content="noindex, nofollow">
        @else
            <meta name="robots" content="index, follow">
        @endif

        <!-- Open Graph / Facebook -->
        <meta property="og:type" content="website">
        <meta property="og:site_name" content="{{ $eventTitle }}">
        <meta property="og:locale" content="id_ID">
        <meta property="og:title" content="{{ $ogTitle }}">
        <meta property="og:description" content="{{ $ogDesc }}">
        @if($ogImage)
            <meta property="og:image" content="{{ $ogImage }}">
        @endif

        <!-- Twitter -->
        <meta name="twitter:card" content="summary_large_image">
        <meta name="twitter:title" content="{{ $ogTitle }}">
        <meta name="twitter:description" content="{{ $ogDesc }}">
        @if($ogImage)
            <meta name="twitter:image" content="{{ $ogImage }}">
        @endif

        <!-- Favicon -->
        <link rel="icon" href="{{ \App\Models\Setting::getValue('event_favicon') ?: '/favicon.ico' }}">

        <!-- Fonts -->
        <link rel="preconnect" href="https://fonts.bunny.net">
        <link href="https://fonts.bunny.net/css?family=figtree:400,500,600&display=swap" rel="stylesheet" />

        <!-- Leaflet CSS & JS -->
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin="" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>

        <!-- Global Realtime Config -->
        <script>
            window.realtimeConfig = {
                broadcaster: "{{ \App\Models\Setting::getValue('broadcaster_type') ?: env('BROADCAST_CONNECTION', 'reverb') }}",
                pusherKey: "{{ \App\Models\Setting::getValue('pusher_app_key') ?: env('PUSHER_APP_KEY') }}",
                pusherCluster: "{{ \App\Models\Setting::getValue('pusher_app_cluster') ?: env('PUSHER_APP_CLUSTER') }}"
            };
        </script>

        <!-- Scripts -->
        @routes
        @viteReactRefresh
        @vite(['resources/js/app.tsx', "resources/js/Pages/{$page['component']}.tsx"])
        @inertiaHead
    </head>
    <body class="font-sans antialiased">
        @inertia
    </body>
</html>
