<?php

namespace App\Notifications;

use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class EmailVerificationCodeNotification extends Notification
{
    public function __construct(public string $code)
    {
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('TechTutor Email Verification Code')
            ->line('Welcome to TechTutor! To complete your registration, please enter the following verification code:')
            ->line('**' . $this->code . '**')
            ->line('This code will expire in 15 minutes.')
            ->line('If you did not sign up for a TechTutor account, you can safely ignore this email.')
            ->salutation('Best regards,')
            ->from(config('mail.from.address'), config('mail.from.name'));
    }
}
