<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $user_id
 * @property int $course_id
 * @property string $provider
 * @property string $amount
 * @property string $currency
 * @property string $status
 * @property string|null $transaction_id
 * @property string|null $receipt_number
 * @property string|null $receipt_issued_at
 * @property string|null $access_granted_at
 * @property array<string, mixed>|null $provider_payload
 * @property string|null $paid_at
 * @property-read User $user
 * @property-read Course $course
 */
class Payment extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'course_id',
        'provider',
        'amount',
        'currency',
        'status',
        'transaction_id',
        'receipt_number',
        'receipt_issued_at',
        'access_granted_at',
        'provider_payload',
        'paid_at',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'paid_at' => 'datetime',
            'receipt_issued_at' => 'datetime',
            'access_granted_at' => 'datetime',
            'provider_payload' => 'array',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }
}
