<?php

namespace App\Notifications;

use App\Models\Comment;
use App\Models\Course;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class NewCommentNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        protected Comment $comment,
        protected Course $course,
    ) {
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $lesson = $this->comment->lesson;
        $lessonUrl = config('app.frontend_url') . '/courses/' . $this->course->id . '/lessons/' . $lesson->id;
        $moderationUrl = config('app.frontend_url') . '/instructor/moderation';

        return (new MailMessage)
            ->subject('New comment on ' . $this->course->title . ' - Lesson: ' . $lesson->title)
            ->line($this->comment->user->name . ' left a comment on your course "' . $this->course->title . '"')
            ->line('Lesson: ' . $lesson->title)
            ->line('Comment: ' . $this->comment->body)
            ->action('Answer in Lesson', $lessonUrl)
            ->action('Review All Comments', $moderationUrl)
            ->line('Please review and moderate this comment according to your course guidelines.');
    }
}
