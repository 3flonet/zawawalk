<?php

use Illuminate\Support\Facades\Broadcast;

/*
|--------------------------------------------------------------------------
| Broadcast Channels
|--------------------------------------------------------------------------
| All channels are public (no authentication required) since these are
| public-facing display pages (live check-in screen, public report).
*/

Broadcast::channel('live-checkin', function () {
    return true; // Public channel
});

Broadcast::channel('public-report', function () {
    return true; // Public channel
});

Broadcast::channel('realtime-control', function () {
    return true; // Public channel
});
