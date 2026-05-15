<?php

namespace App\Notifications;

use App\Models\UserInvite;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class UserInviteNotification extends Notification
{
    public function __construct(public UserInvite $invite)
    {
    }

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        return (new MailMessage)
            ->subject('You are invited to TechTutor')
            ->line('An administrator invited you to join TechTutor as a **' . $this->invite->role . '**.')
            ->action('Accept invitation', $this->invite->inviteUrl())
            ->line('This invitation link expires in ' . UserInvite::EXPIRY_MINUTES . ' minutes.')
            ->line('If you were not expecting this invitation, you can ignore this email.')
            ->salutation('Best regards,')
            ->from(config('mail.from.address'), config('mail.from.name'));
    }
}
