<?php

namespace App\Events;

use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Contracts\Broadcasting\ShouldBroadcast;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class RealtimeStatusChanged implements ShouldBroadcast
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public bool $active;
    public ?string $stopAt;
    public string $message;

    public function __construct(bool $active, ?string $stopAt = null, string $message = '')
    {
        $this->active = $active;
        $this->stopAt = $stopAt;
        $this->message = $message ?: ($active ? 'Realtime aktif' : 'Sesi realtime telah dihentikan oleh Admin.');
    }

    /**
     * Get the channels the event should broadcast on.
     */
    public function broadcastOn(): array
    {
        return [
            new Channel('realtime-control'),
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'status.changed';
    }

    /**
     * Data to broadcast.
     */
    public function broadcastWith(): array
    {
        return [
            'active'   => $this->active,
            'stop_at'  => $this->stopAt,
            'message'  => $this->message,
        ];
    }
}
