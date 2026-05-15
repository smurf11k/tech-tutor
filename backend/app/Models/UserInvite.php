<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

/**
 * @property int $id
 * @property int $invited_by_user_id
 * @property string $email
 * @property string $role
 * @property string $token
 * @property \Illuminate\Support\Carbon $expires_at
 * @property \Illuminate\Support\Carbon|null $used_at
 */
class UserInvite extends Model
{
    public const EXPIRY_MINUTES = 5;

    protected $fillable = [
        'invited_by_user_id',
        'email',
        'role',
        'token',
        'expires_at',
        'used_at',
    ];

    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
            'used_at' => 'datetime',
        ];
    }

    public function invitedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'invited_by_user_id');
    }

    public function isValid(): bool
    {
        return $this->used_at === null && $this->expires_at->isFuture();
    }

    public function markAsUsed(): void
    {
        $this->forceFill(['used_at' => now()])->save();
    }

    public function inviteUrl(): string
    {
        return rtrim((string) config('app.frontend_url'), '/') . '/invite?token=' . $this->token;
    }

    public static function issue(User $admin, string $email, string $role): self
    {
        self::query()
            ->where('email', $email)
            ->whereNull('used_at')
            ->where('expires_at', '>', now())
            ->delete();

        return self::create([
            'invited_by_user_id' => $admin->id,
            'email' => $email,
            'role' => $role,
            'token' => Str::random(64),
            'expires_at' => now()->addMinutes(self::EXPIRY_MINUTES),
        ]);
    }

    public static function findValidToken(string $token): ?self
    {
        return self::query()
            ->where('token', $token)
            ->whereNull('used_at')
            ->where('expires_at', '>', now())
            ->first();
    }
}
