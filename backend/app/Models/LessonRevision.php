<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $lesson_id
 * @property int|null $author_id
 * @property int $version
 * @property string $status
 * @property string $title
 * @property string $slug
 * @property string|null $content
 * @property string|null $video_name
 * @property string|null $video_url
 * @property string|null $video_path
 * @property int|null $estimated_time_minutes
 * @property bool $is_published
 * @property-read Lesson $lesson
 */
class LessonRevision extends Model
{
    use HasFactory;

    protected $fillable = [
        'lesson_id',
        'author_id',
        'version',
        'status',
        'title',
        'slug',
        'content',
        'video_name',
        'video_url',
        'video_path',
        'estimated_time_minutes',
        'is_published',
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
            'estimated_time_minutes' => 'integer',
            'is_published' => 'boolean',
            'reviewed_at' => 'datetime',
            'published_at' => 'datetime',
            'unpublished_at' => 'datetime',
        ];
    }

    public function lesson(): BelongsTo
    {
        return $this->belongsTo(Lesson::class);
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