<?php

namespace App\Http\Controllers;

use App\Models\Course;
use App\Models\Payment;
use App\Models\Progress;
use App\Models\QuizAttempt;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InstructorDashboardController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);
        abort_unless($user->isInstructor(), 403);

        $courses = Course::query()
            ->with(['modules.lessons', 'enrollments', 'certificates', 'payments', 'quizzes'])
            ->when(! $user->isAdmin(), fn ($query) => $query->where('instructor_id', $user->id))
            ->latest()
            ->get();

        $courseRows = $courses->map(fn (Course $course): array => $this->courseMetrics($course))->values();

        return response()->json([
            'summary' => [
                'courses_count' => $courseRows->count(),
                'published_courses_count' => $courseRows->where('is_published', true)->count(),
                'draft_courses_count' => $courseRows->where('is_published', false)->count(),
                'enrollments_count' => $courseRows->sum('enrollments_count'),
                'certificates_count' => $courseRows->sum('certificates_count'),
                'revenue_total' => number_format((float) $courseRows->sum('revenue_total'), 2, '.', ''),
                'average_progress' => $this->average($courseRows->pluck('average_progress')->filter(fn ($value) => $value !== null)->all()),
                'average_quiz_score' => $this->average($courseRows->pluck('average_quiz_score')->filter(fn ($value) => $value !== null)->all()),
            ],
            'courses' => $courseRows,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function courseMetrics(Course $course): array
    {
        $lessonIds = $course->modules->flatMap(fn ($module) => $module->lessons->pluck('id'))->values();
        $enrollmentUserIds = $course->enrollments->where('status', 'active')->pluck('user_id')->unique()->values();
        $quizIds = $course->quizzes->pluck('id')->values();

        $averageProgress = $this->averageCourseProgress($lessonIds->all(), $enrollmentUserIds->all());
        $averageQuizScore = $quizIds->isEmpty()
            ? null
            : $this->average(
                QuizAttempt::query()
                    ->whereIn('quiz_id', $quizIds)
                    ->pluck('score')
                    ->all()
            );

        $paidPayments = Payment::query()
            ->where('course_id', $course->id)
            ->where('status', 'paid')
            ->get();

        return [
            'course_id' => $course->id,
            'title' => $course->title,
            'slug' => $course->slug,
            'is_published' => $course->is_published,
            'modules_count' => $course->modules->count(),
            'lessons_count' => $lessonIds->count(),
            'quizzes_count' => $course->quizzes->count(),
            'enrollments_count' => $enrollmentUserIds->count(),
            'certificates_count' => $course->certificates->count(),
            'completion_rate' => $this->percentage($course->certificates->count(), $enrollmentUserIds->count()),
            'average_progress' => $averageProgress,
            'average_quiz_score' => $averageQuizScore,
            'payments_count' => $paidPayments->count(),
            'revenue_total' => number_format((float) $paidPayments->sum('amount'), 2, '.', ''),
        ];
    }

    /**
     * @param  array<int, int>  $lessonIds
     * @param  array<int, int>  $userIds
     */
    private function averageCourseProgress(array $lessonIds, array $userIds): ?float
    {
        if ($lessonIds === [] || $userIds === []) {
            return null;
        }

        $completedCounts = Progress::query()
            ->whereIn('lesson_id', $lessonIds)
            ->whereIn('user_id', $userIds)
            ->whereNotNull('completed_at')
            ->selectRaw('user_id, COUNT(*) as completed_count')
            ->groupBy('user_id')
            ->pluck('completed_count', 'user_id');

        $progressValues = collect($userIds)
            ->map(fn (int $userId): float => ((int) ($completedCounts[$userId] ?? 0) / count($lessonIds)) * 100)
            ->all();

        return $this->average($progressValues);
    }

    /**
     * @param  array<int, float|int|string>  $values
     */
    private function average(array $values): ?float
    {
        if ($values === []) {
            return null;
        }

        return round(collect($values)->avg(), 2);
    }

    private function percentage(int $part, int $total): ?float
    {
        if ($total === 0) {
            return null;
        }

        return round(($part / $total) * 100, 2);
    }
}
