<?php

namespace App\Notifications;

use App\Models\CourseCertificate;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class CourseCertificateIssuedNotification extends Notification
{
    use Queueable;

    public function __construct(private readonly CourseCertificate $certificate) {}

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('Certificate issued')
            ->greeting('Congratulations!')
            ->line('You completed '.$this->certificate->course->title.'.')
            ->line('Certificate number: '.$this->certificate->certificate_number)
            ->action('Open TechTutor', config('app.url'));
    }
}
