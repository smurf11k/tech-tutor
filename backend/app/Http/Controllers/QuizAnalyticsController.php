<?php

namespace App\Http\Controllers;

use App\Models\Quiz;
use App\Models\QuizAttempt;
use App\Models\QuizQuestion;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

class QuizAnalyticsController extends Controller
{
    public function show(Request $request, Quiz $quiz): JsonResponse
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);

        $course = $quiz->course;
        abort_unless($user->isAdmin() || $user->id === $course->instructor_id, 403);

        $quiz->load(['course', 'questions']);
        $attempts = $quiz->attempts()->with('user')->get();

        return response()->json([
            'quiz' => [
                'id' => $quiz->id,
                'course_id' => $quiz->course_id,
                'title' => $quiz->title,
                'pass_score' => $quiz->pass_score,
                'questions_count' => $quiz->questions->count(),
            ],
            'attempts_count' => $attempts->count(),
            'unique_students_count' => $attempts->pluck('user_id')->unique()->count(),
            'average_score' => $attempts->isEmpty() ? null : round($attempts->avg('score'), 2),
            'highest_score' => $attempts->isEmpty() ? null : $attempts->max('score'),
            'lowest_score' => $attempts->isEmpty() ? null : $attempts->min('score'),
            'passed_count' => $attempts->where('passed', true)->count(),
            'failed_count' => $attempts->where('passed', false)->count(),
            'pass_rate' => $this->percentage($attempts->where('passed', true)->count(), $attempts->count()),
            'question_breakdown' => $this->questionBreakdown($quiz, $attempts),
            'recent_attempts' => $attempts
                ->sortByDesc('created_at')
                ->take(10)
                ->values()
                ->map(fn (QuizAttempt $attempt): array => [
                    'id' => $attempt->id,
                    'user_id' => $attempt->user_id,
                    'user_name' => $attempt->user?->name,
                    'score' => $attempt->score,
                    'passed' => $attempt->passed,
                    'completed_at' => $attempt->completed_at,
                ]),
        ]);
    }

    /**
     * @param  Collection<int, QuizAttempt>  $attempts
     * @return array<int, array<string, mixed>>
     */
    private function questionBreakdown(Quiz $quiz, $attempts): array
    {
        return $quiz->questions
            ->map(function (QuizQuestion $question) use ($attempts): array {
                $correctCount = $attempts->filter(function (QuizAttempt $attempt) use ($question): bool {
                    $submittedAnswer = $attempt->answers[(string) $question->id] ?? $attempt->answers[$question->id] ?? null;

                    if ($submittedAnswer === null) {
                        return false;
                    }

                    return $this->normalizeAnswerSet($submittedAnswer) === $this->normalizeAnswerSet($question->correct_answers);
                })->count();

                return [
                    'question_id' => $question->id,
                    'type' => $question->type,
                    'prompt' => $question->prompt,
                    'points' => $question->points,
                    'attempts_count' => $attempts->count(),
                    'correct_count' => $correctCount,
                    'incorrect_count' => $attempts->count() - $correctCount,
                    'correct_rate' => $this->percentage($correctCount, $attempts->count()),
                ];
            })
            ->values()
            ->all();
    }

    private function percentage(int $part, int $total): ?float
    {
        if ($total === 0) {
            return null;
        }

        return round(($part / $total) * 100, 2);
    }

    /**
     * @return array<int, string>
     */
    private function normalizeAnswerSet(mixed $answer): array
    {
        $answers = is_array($answer) ? $answer : [$answer];

        $normalized = collect($answers)
            ->filter(fn (mixed $value): bool => is_string($value) || is_numeric($value))
            ->map(fn (mixed $value): string => (string) $value)
            ->map(fn (string $value): string => trim($value))
            ->filter()
            ->unique()
            ->values()
            ->all();

        sort($normalized);

        return $normalized;
    }
}
