<?php

namespace App\Notifications;

use App\Models\CourseCertificate;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Storage;

class CourseCertificateIssuedNotification extends Notification
{
    use Queueable;

    public function __construct(private readonly CourseCertificate $certificate)
    {
    }

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $user = $this->certificate->user;
        $course = $this->certificate->course;
        $storagePath = sprintf('certificates/%d/%d.pdf', $user->id, $course->id);

        return (new MailMessage)
            ->subject('Your Certificate of Completion - ' . $course->title)
            ->greeting('Congratulations, ' . $user->name . '!')
            ->line('You have successfully completed the course: ' . $course->title)
            ->line('Your certificate is attached to this email.')
            ->attach(
                Storage::disk('local')->path($storagePath),
                [
                    'as' => 'certificate-' . $course->slug . '.pdf',
                    'mime' => 'application/pdf',
                ]
            );
    }
}
