<?php

namespace App\Notifications;

use App\Models\QuizAttempt;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class QuizAttemptCompletedNotification extends Notification
{
    use Queueable;

    public function __construct(private readonly QuizAttempt $attempt) {}

    /**
     * @return array<int, string>
     */
    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $quiz = $this->attempt->quiz;

        return (new MailMessage)
            ->subject('Quiz result: '.$quiz->title)
            ->greeting($this->attempt->passed ? 'Quiz passed' : 'Quiz submitted')
            ->line('Quiz: '.$quiz->title)
            ->line('Score: '.$this->attempt->score.'%')
            ->line('Pass threshold: '.$quiz->pass_score.'%')
            ->line($this->attempt->passed ? 'Nice work, you passed this quiz.' : 'Review the lesson material and try again when ready.')
            ->action('Open TechTutor', config('app.url'));
    }
}
