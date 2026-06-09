<?php

namespace App\Notifications;

use App\Models\Enrollment;
use App\Models\Payment;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class NewEnrollmentNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(private readonly Enrollment $enrollment) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $course = $this->enrollment->course;
        $student = $this->enrollment->user;
        $payment = Payment::where('user_id', $student->id)
            ->where('course_id', $course->id)
            ->orderByDesc('paid_at')
            ->first();

        return (new MailMessage)
            ->subject('New enrollment: ' . $course->title)
            ->greeting('A new student enrolled in your course')
            ->line('Student: ' . $student->name)
            ->line('Course: ' . $course->title)
            ->line('Enrollment date: ' . $this->enrollment->enrolled_at?->format('Y-m-d H:i'))
            ->when($payment, function (MailMessage $message) use ($payment) {
                $message->line('Payment amount: ' . $payment->amount)
                    ->line('Payment status: ' . $payment->status);
            })
            ->action('View Course', config('app.frontend_url') . '/courses/' . $course->id);
    }
}
