<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $quiz_id
 * @property string $type
 * @property string $prompt
 * @property array<int, array<string, string>> $options
 * @property array<int, string> $correct_answers
 * @property int $points
 * @property int $position
 * @property-read Quiz $quiz
 */
class QuizQuestion extends Model
{
    use HasFactory;

    protected $fillable = [
        'quiz_id',
        'type',
        'prompt',
        'options',
        'correct_answers',
        'points',
        'position',
    ];

    protected $hidden = [
        'correct_answers',
    ];

    protected function casts(): array
    {
        return [
            'options' => 'array',
            'correct_answers' => 'array',
            'points' => 'integer',
            'position' => 'integer',
        ];
    }

    public function quiz(): BelongsTo
    {
        return $this->belongsTo(Quiz::class);
    }
}
