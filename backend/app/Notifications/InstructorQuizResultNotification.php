<?php

namespace App\Notifications;

use App\Models\QuizAttempt;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class InstructorQuizResultNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(private readonly QuizAttempt $attempt) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $quiz = $this->attempt->quiz;
        $student = $this->attempt->user;
        $course = $quiz->course;

        return (new MailMessage)
            ->subject('Quiz result: ' . $quiz->title . ' - ' . $student->name)
            ->greeting('A student completed a quiz in your course')
            ->line('Student: ' . $student->name)
            ->line('Course: ' . $course->title)
            ->line('Quiz: ' . $quiz->title)
            ->line('Score: ' . $this->attempt->score . '%')
            ->line('Pass threshold: ' . $quiz->pass_score . '%')
            ->line($this->attempt->passed ? 'The student passed this quiz.' : 'The student did not pass this quiz.')
            ->action('View Course', config('app.frontend_url') . '/courses/' . $course->id);
    }
}
