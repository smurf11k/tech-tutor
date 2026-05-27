<?php

namespace App\Services;

use App\Models\Course;
use App\Models\Progress;
use App\Models\QuizAttempt;
use App\Models\User;
use Illuminate\Support\Collection;

class CourseProgressCalculator
{
    /**
     * @return array{progress_percent: int, is_complete: bool, completed_items: int, total_items: int}
     */
    public function forUser(Course $course, User $user): array
    {
        $course->loadMissing(['modules.lessons', 'modules.quizzes']);

        $lessonIds = $course->modules
            ->flatMap(fn ($module) => $module->lessons)
            ->pluck('id');

        $quizIds = $course->modules
            ->flatMap(fn ($module) => $module->quizzes)
            ->pluck('id');
        $totalItems = $lessonIds->count() + $quizIds->count();

        if ($totalItems === 0) {
            return [
                'progress_percent' => 0,
                'is_complete' => false,
                'completed_items' => 0,
                'total_items' => 0,
            ];
        }

        $completedLessons = Progress::query()
            ->where('user_id', $user->id)
            ->whereIn('lesson_id', $lessonIds)
            ->where('progress_percent', '>=', 100)
            ->count();

        $passedQuizzes = $this->passedQuizCount($user->id, $quizIds);

        $completedItems = $completedLessons + $passedQuizzes;
        $progressPercent = (int) round(($completedItems / $totalItems) * 100);

        return [
            'progress_percent' => min(100, $progressPercent),
            'is_complete' => $completedItems >= $totalItems,
            'completed_items' => $completedItems,
            'total_items' => $totalItems,
        ];
    }

    private function passedQuizCount(int $userId, Collection $quizIds): int
    {
        if ($quizIds->isEmpty()) {
            return 0;
        }

        return QuizAttempt::query()
            ->where('user_id', $userId)
            ->whereIn('quiz_id', $quizIds)
            ->where('passed', true)
            ->distinct('quiz_id')
            ->count('quiz_id');
    }
}
