import Echo from 'laravel-echo';
import Pusher from 'pusher-js';

// Required by pusher-js
(window as any).Pusher = Pusher;

// Enable pusher debug logging in dev mode to troubleshoot connection issues
if (import.meta.env.DEV) {
    Pusher.logToConsole = true;
}

interface Window {
    realtimeConfig?: {
        broadcaster?: string;
        pusherKey?: string;
        pusherCluster?: string;
    };
}

const config = (window as any).realtimeConfig || {};
const broadcaster = (config.broadcaster || import.meta.env.VITE_BROADCAST_CONNECTION || 'reverb') as 'reverb' | 'pusher';

const echo = broadcaster === 'pusher' 
    ? new Echo({
        broadcaster: 'pusher',
        key: (config.pusherKey || import.meta.env.VITE_PUSHER_APP_KEY || '') as string,
        cluster: (config.pusherCluster || import.meta.env.VITE_PUSHER_APP_CLUSTER || 'ap1') as string,
        forceTLS: true
      })
    : new Echo({
        broadcaster: 'reverb',
        key: import.meta.env.VITE_REVERB_APP_KEY as string,
        wsHost: import.meta.env.VITE_REVERB_HOST as string,
        wsPort: Number(import.meta.env.VITE_REVERB_PORT ?? 8080),
        wssPort: Number(import.meta.env.VITE_REVERB_PORT ?? 8080),
        forceTLS: (import.meta.env.VITE_REVERB_SCHEME ?? 'http') === 'https',
        enabledTransports: ['ws', 'wss'],
        disableStats: true,
      });

export default echo;
