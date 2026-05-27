<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property int $course_id
 * @property int|null $module_id
 * @property string $title
 * @property string|null $description
 * @property int $pass_score
 * @property int|null $estimated_time_minutes
 * @property int|null $time_limit_seconds
 * @property bool $is_published
 * @property int $position
 * @property-read Course $course
 * @property-read Module|null $module
 * @property-read Collection<int, QuizQuestion> $questions
 * @property-read Collection<int, QuizAttempt> $attempts
 */
class Quiz extends Model
{
    use HasFactory;

    protected $fillable = [
        'course_id',
        'module_id',
        'title',
        'description',
        'pass_score',
        'estimated_time_minutes',
        'time_limit_seconds',
        'is_published',
        'position',
    ];

    protected function casts(): array
    {
        return [
            'pass_score' => 'integer',
            'estimated_time_minutes' => 'integer',
            'time_limit_seconds' => 'integer',
            'is_published' => 'boolean',
            'position' => 'integer',
        ];
    }

    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    public function module(): BelongsTo
    {
        return $this->belongsTo(Module::class);
    }

    public function attempts(): HasMany
    {
        return $this->hasMany(QuizAttempt::class);
    }

    public function questions(): HasMany
    {
        return $this->hasMany(QuizQuestion::class)->orderBy('position');
    }
}
