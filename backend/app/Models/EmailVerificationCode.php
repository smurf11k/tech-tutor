<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property string $email
 * @property string $code
 * @property string $expires_at
 * @property bool $used
 * @property string $created_at
 * @property string $updated_at
 */
class EmailVerificationCode extends Model
{
    protected $fillable = [
        'email',
        'code',
        'expires_at',
        'used',
    ];

    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
            'used' => 'boolean',
        ];
    }

    /**
     * Scope: Get active (unused and not expired) codes for an email.
     */
    public function scopeActive($query, string $email)
    {
        return $query->where('email', $email)
            ->where('used', false)
            ->where('expires_at', '>', now());
    }

    /**
     * Check if a code is valid for a given email.
     */
    public static function isValid(string $email, string $code): bool
    {
        $record = self::active($email)
            ->where('code', $code)
            ->first();

        return $record !== null;
    }

    /**
     * Mark a code as used.
     */
    public static function markAsUsed(string $email, string $code): void
    {
        self::where('email', $email)
            ->where('code', $code)
            ->where('used', false)
            ->update(['used' => true]);
    }

    /**
     * Clean up expired codes.
     */
    public static function cleanupExpired(): void
    {
        self::where('expires_at', '<', now())->delete();
    }
}
