<?php

namespace App\Notifications;

use App\Models\Enrollment;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class EnrollmentCreatedNotification extends Notification
{
    use Queueable;

    public function __construct(private readonly Enrollment $enrollment) {}

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $course = $this->enrollment->course;

        return (new MailMessage)
            ->subject('Enrollment confirmed')
            ->greeting('Welcome to '.$course->title)
            ->line('Your enrollment is active and you can start learning now.')
            ->line('Course: '.$course->title)
            ->action('Open TechTutor', config('app.url'));
    }
}
