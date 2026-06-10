<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Laravel\Scout\Searchable;

/**
 * @property int $id
 * @property int $module_id
 * @property string $title
 * @property string $slug
 * @property string $type
 * @property string|null $content
 * @property string|null $video_name
 * @property string|null $video_url
 * @property string|null $video_path
 * @property int|null $estimated_time_minutes
 * @property int $position
 * @property bool $is_published
 * @property-read Module $module
 * @property-read \Illuminate\Database\Eloquent\Collection<int, Comment> $comments
 * @property-read LessonRevision|null $latestRevision
 * @property-read LessonRevision|null $publishedRevision
 * @property-read \Illuminate\Database\Eloquent\Collection<int, Progress> $progressEntries
 */
class Lesson extends Model
{
    use HasFactory;
    use Searchable;

    protected $fillable = [
        'module_id',
        'title',
        'slug',
        'type',
        'content',
        'video_name',
        'video_url',
        'video_path',
        'estimated_time_minutes',
        'position',
        'is_published',
    ];

    protected function casts(): array
    {
        return [
            'position' => 'integer',
            'estimated_time_minutes' => 'integer',
            'is_published' => 'boolean',
        ];
    }

    public function searchableAs(): string
    {
        return 'lessons';
    }

    public function toSearchableArray(): array
    {
        return [
            'id' => $this->id,
            'module_id' => $this->module_id,
            'course_id' => $this->module?->course_id,
            'title' => $this->title,
            'slug' => $this->slug,
            'type' => $this->type,
            'content' => $this->content,
            'video_name' => $this->video_name,
            'estimated_time_minutes' => $this->estimated_time_minutes,
            'position' => $this->position,
            'is_published' => $this->is_published,
        ];
    }

    public function module(): BelongsTo
    {
        return $this->belongsTo(Module::class);
    }

    public function progressEntries(): HasMany
    {
        return $this->hasMany(Progress::class);
    }

    public function comments(): HasMany
    {
        return $this->hasMany(Comment::class)->latest();
    }

    public function revisions(): HasMany
    {
        return $this->hasMany(LessonRevision::class);
    }

    public function latestRevision(): HasOne
    {
        return $this->hasOne(LessonRevision::class)->latestOfMany('version');
    }

    public function publishedRevision(): HasOne
    {
        return $this->hasOne(LessonRevision::class)
            ->where('status', 'published')
            ->latestOfMany('version');
    }
}
