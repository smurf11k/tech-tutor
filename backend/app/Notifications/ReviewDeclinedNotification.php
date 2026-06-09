<?php

namespace App\Notifications;

use App\Models\Review;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ReviewDeclinedNotification extends Notification
{
    use Queueable;

    public function __construct(
        private readonly Review $review,
        private readonly ?string $declinedReason,
    ) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $course = $this->review->course;

        $message = (new MailMessage)
            ->subject('Your review was declined')
            ->greeting('Review update')
            ->line('Your review for "'.$course->title.'" was declined by an administrator.');

        if ($this->declinedReason) {
            $message->line('Reason: '.$this->declinedReason);
        }

        return $message->action('Open TechTutor', config('app.url'));
    }
}
