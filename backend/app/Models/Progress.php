<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $user_id
 * @property int $lesson_id
 * @property int $progress_percent
 * @property string|null $completed_at
 * @property-read User $user
 * @property-read Lesson $lesson
 */
class Progress extends Model
{
    use HasFactory;

    protected $table = 'progress';

    protected $fillable = [
        'user_id',
        'lesson_id',
        'progress_percent',
        'completed_at',
    ];

    protected function casts(): array
    {
        return [
            'progress_percent' => 'integer',
            'completed_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function lesson(): BelongsTo
    {
        return $this->belongsTo(Lesson::class);
    }
}
