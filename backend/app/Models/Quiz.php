<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property int $course_id
 * @property string $title
 * @property string|null $description
 * @property int $pass_score
 * @property bool $is_published
 * @property-read Course $course
 * @property-read \Illuminate\Database\Eloquent\Collection<int, QuizAttempt> $attempts
 */
class Quiz extends Model
{
    use HasFactory;

    protected $fillable = [
        'course_id',
        'title',
        'description',
        'pass_score',
        'is_published',
    ];

    protected function casts(): array
    {
        return [
            'pass_score' => 'integer',
            'is_published' => 'boolean',
        ];
    }

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    public function attempts(): HasMany
    {
        return $this->hasMany(QuizAttempt::class);
    }
}
