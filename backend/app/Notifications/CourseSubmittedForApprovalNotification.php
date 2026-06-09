<?php

namespace App\Notifications;

use App\Models\PublishRequest;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class CourseSubmittedForApprovalNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(private readonly PublishRequest $publishRequest) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $course = $this->publishRequest->course;
        $requester = $this->publishRequest->requester;

        return (new MailMessage)
            ->subject('Course submitted for approval: ' . $course->title)
            ->greeting('A new course is awaiting approval')
            ->line('Course: ' . $course->title)
            ->line('Submitted by: ' . ($requester?->name ?? 'Unknown'))
            ->line('Submission date: ' . $this->publishRequest->created_at?->format('Y-m-d H:i'))
            ->action('Review in Moderation Queue', config('app.frontend_url') . '/admin/moderation');
    }
}
