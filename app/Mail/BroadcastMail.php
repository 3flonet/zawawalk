<?php

namespace App\Mail;

use App\Models\Setting;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class BroadcastMail extends Mailable
{
    use Queueable, SerializesModels;

    public string $customSubject;
    public string $customBody;
    public ?string $customBanner;

    public function __construct(string $customSubject, string $customBody, ?string $customBanner = null)
    {
        $this->customSubject = $customSubject;
        $this->customBody = $customBody;
        $this->customBanner = $customBanner;
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: $this->customSubject,
        );
    }

    public function content(): Content
    {
        return new Content(
            htmlString: $this->buildHtml(),
        );
    }

    protected function buildHtml(): string
    {
        $eventTitle = Setting::getValue('event_title', 'Zawawalk 2026: The Fun Walk Festival');
        $bodyHtml = $this->customBody; // raw html support

        $headerHtml = '';
        if (!empty($this->customBanner)) {
            $bannerUrl = url($this->customBanner);
            $headerHtml = '
            <tr>
                <td style="padding: 0; text-align: center; border-bottom: 3px solid #000000;">
                    <img src="' . $bannerUrl . '" style="width: 100%; max-width: 600px; height: auto; display: block;" alt="Event Banner" />
                </td>
            </tr>';
        } else {
            $headerHtml = '
            <tr>
                <td style="background-color: #000000; padding: 25px 20px; text-align: center; border-bottom: 3px solid #000000;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px;">
                        📢 ' . htmlspecialchars($eventTitle) . '
                    </h1>
                </td>
            </tr>';
        }

        return '
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>' . htmlspecialchars($this->customSubject) . '</title>
        </head>
        <body style="margin: 0; padding: 20px; background-color: #f3f4f6; font-family: \'Helvetica Neue\', Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale;">
            <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 3px solid #000000; box-shadow: 4px 4px 0px #000000;">
                <!-- Header -->
                ' . $headerHtml . '
                <!-- Content -->
                <tr>
                    <td style="padding: 30px 25px; font-size: 14px; line-height: 1.6; color: #1f2937;">
                        ' . $bodyHtml . '
                    </td>
                </tr>
                <!-- Footer -->
                <tr>
                    <td style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 3px solid #000000; font-size: 11px; font-weight: bold; color: #4b5563; text-transform: uppercase;">
                        &copy; ' . date('Y') . ' ' . htmlspecialchars($eventTitle) . '. All Rights Reserved.
                    </td>
                </tr>
            </table>
        </body>
        </html>';
    }
}
