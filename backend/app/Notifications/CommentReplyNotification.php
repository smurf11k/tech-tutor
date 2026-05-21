<?php

namespace App\Notifications;

use App\Models\Comment;
use App\Models\Course;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class CommentReplyNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(
        protected Comment $reply,
        protected Course $course,
    ) {
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $lessonUrl = route('learning.lesson', [
            'course' => $this->course->slug,
            'lesson' => $this->reply->lesson->slug,
        ], true) . '#comment-' . $this->reply->id;

        return (new MailMessage)
            ->subject('Someone replied to your comment on ' . $this->course->title)
            ->line($this->reply->user->name . ' replied to your comment on the lesson "' . $this->reply->lesson->title . '"')
            ->line('Reply: ' . $this->reply->body)
            ->action('View Reply', $lessonUrl)
            ->line('Thank you for learning with us!');
    }
}
