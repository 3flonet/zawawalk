<?php

namespace App\Jobs;

use App\Models\Attendee;
use App\Http\Controllers\EventController;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class SendCheckInThankYouJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected $attendeeId;

    /**
     * Create a new job instance.
     */
    public function __construct($attendeeId)
    {
        $this->attendeeId = $attendeeId;
    }

    /**
     * Execute the job.
     */
    public function handle(): void
    {
        $attendee = Attendee::with('form')->find($this->attendeeId);
        if ($attendee) {
            EventController::sendThankYouToAttendee($attendee);
        }
    }
}
