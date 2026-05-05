<?php

namespace App\Notifications;

use App\Models\PublishRequest;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class PublishRequestHandledNotification extends Notification
{
    use Queueable;

    public function __construct(private readonly PublishRequest $publishRequest) {}

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $course = $this->publishRequest->course;
        $accepted = $this->publishRequest->status === 'accepted';

        $message = (new MailMessage)
            ->subject($accepted ? 'Course publish request approved' : 'Course publish request declined')
            ->greeting($accepted ? 'Your course is published' : 'Publish request update')
            ->line('Course: '.$course->title);

        if ($accepted) {
            return $message
                ->line('An admin approved your publish request.')
                ->action('Open TechTutor', config('app.url'));
        }

        return $message
            ->line('An admin declined your publish request.')
            ->line('Reason: '.($this->publishRequest->declined_reason ?: 'No reason provided.'))
            ->action('Open TechTutor', config('app.url'));
    }
}
