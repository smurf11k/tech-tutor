<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $id
 * @property int $lesson_id
 * @property int $user_id
 * @property int|null $parent_comment_id
 * @property string $body
 * @property bool $is_published
 * @property-read Lesson $lesson
 * @property-read User $user
 * @property-read Comment|null $parentComment
 * @property-read \Illuminate\Database\Eloquent\Collection<int, Comment> $replies
 */
class Comment extends Model
{
    use HasFactory;

    protected $fillable = [
        'lesson_id',
        'user_id',
        'parent_comment_id',
        'body',
        'is_published',
        'moderated_at',
    ];

    protected function casts(): array
    {
        return [
            'is_published' => 'boolean',
            'moderated_at' => 'datetime',
        ];
    }

    public function lesson(): BelongsTo
    {
        return $this->belongsTo(Lesson::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function parentComment(): BelongsTo
    {
        return $this->belongsTo(Comment::class, 'parent_comment_id');
    }

    public function replies(): HasMany
    {
        return $this->hasMany(Comment::class, 'parent_comment_id')->latest();
    }
}
