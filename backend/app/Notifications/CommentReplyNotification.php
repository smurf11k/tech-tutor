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

    protected Comment $reply;
    protected Course $course;

    public function __construct(Comment $reply, Course $course)
    {
        $this->reply = $reply;
        $this->course = $course;
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $lessonUrl = config('services.frontend_url', 'http://localhost:5173') . '/learning/' . $this->course->slug . '?lesson=' . $this->reply->lesson->slug . '#comment-' . $this->reply->id;

        return (new MailMessage)
            ->subject('Someone replied to your comment on ' . $this->course->title)
            ->line($this->reply->user->name . ' replied to your comment on the lesson "' . $this->reply->lesson->title . '"')
            ->line('Reply: ' . $this->reply->body)
            ->action('View Reply', $lessonUrl)
            ->line('Thank you for learning with us!');
    }
}
