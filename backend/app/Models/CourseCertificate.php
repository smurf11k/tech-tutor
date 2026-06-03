<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

/**
 * @property int $id
 * @property int $course_id
 * @property int $user_id
 * @property string $certificate_number
 * @property string $issued_at
 * @property-read Course $course
 * @property-read User $user
 */
class CourseCertificate extends Model
{
    use HasFactory;

    protected $fillable = [
        'course_id',
        'user_id',
        'certificate_number',
        'issued_at',
    ];

    protected function casts(): array
    {
        return [
            'issued_at' => 'datetime',
        ];
    }

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function getStoragePath(): string
    {
        return sprintf('certificates/%d/%d.pdf', $this->user_id, $this->course_id);
    }

    public function getPdfContent(): ?string
    {
        return Storage::disk('local')->exists($this->getStoragePath())
            ? Storage::disk('local')->get($this->getStoragePath())
            : null;
    }
}
