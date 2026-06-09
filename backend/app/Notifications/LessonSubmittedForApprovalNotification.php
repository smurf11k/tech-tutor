<?php

namespace App\Notifications;

use App\Models\LessonRevision;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class LessonSubmittedForApprovalNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(private readonly LessonRevision $lessonRevision) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $lesson = $this->lessonRevision->lesson;
        $module = $lesson?->module;
        $course = $module?->course;
        $author = $this->lessonRevision->author;

        return (new MailMessage)
            ->subject('Lesson submitted for approval: ' . ($lesson?->title ?? 'Unknown'))
            ->greeting('A lesson is awaiting approval')
            ->line('Lesson: ' . ($lesson?->title ?? 'Unknown'))
            ->line('Course: ' . ($course?->title ?? 'Unknown'))
            ->line('Submitted by: ' . ($author?->name ?? 'Unknown'))
            ->line('Submission date: ' . $this->lessonRevision->created_at?->format('Y-m-d H:i'))
            ->action('Review in Moderation Queue', config('app.frontend_url') . '/admin/moderation');
    }
}
