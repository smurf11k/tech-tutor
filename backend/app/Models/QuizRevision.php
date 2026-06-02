<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $quiz_id
 * @property int|null $author_id
 * @property int $version
 * @property string $status
 * @property string $title
 * @property string|null $description
 * @property int|null $module_id
 * @property int $pass_score
 * @property int|null $estimated_time_minutes
 * @property int|null $time_limit_seconds
 * @property bool $is_published
 * @property int $position
 * @property array<int, array<string, mixed>> $questions
 */
class QuizRevision extends Model
{
    use HasFactory;

    protected $fillable = [
        'quiz_id',
        'author_id',
        'version',
        'status',
        'title',
        'description',
        'module_id',
        'pass_score',
        'estimated_time_minutes',
        'time_limit_seconds',
        'is_published',
        'position',
        'questions',
        'reviewed_by_id',
        'published_by_id',
        'reviewed_at',
        'published_at',
        'unpublished_at',
        'rejection_reason',
    ];

    protected function casts(): array
    {
        return [
            'version' => 'integer',
            'module_id' => 'integer',
            'pass_score' => 'integer',
            'estimated_time_minutes' => 'integer',
            'time_limit_seconds' => 'integer',
            'is_published' => 'boolean',
            'position' => 'integer',
            'questions' => 'array',
            'reviewed_at' => 'datetime',
            'published_at' => 'datetime',
            'unpublished_at' => 'datetime',
        ];
    }

    public function quiz(): BelongsTo
    {
        return $this->belongsTo(Quiz::class);
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'author_id');
    }

    public function reviewedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by_id');
    }

    public function publishedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'published_by_id');
    }
}