<?php

namespace App\Http\Controllers;

use App\Models\Course;
use App\Models\Progress;
use App\Models\QuizAttempt;
use App\Models\User;
use App\Services\CourseProgressCalculator;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LearningController extends Controller
{
    public function courses(Request $request, CourseProgressCalculator $progressCalculator): JsonResponse
    {
        $user = $request->user();

        $courses = Course::query()
            ->whereHas('enrollments', function ($query) use ($user) {
                $query
                    ->where('user_id', $user->id)
                    ->where('status', 'active');
            })
            ->with('instructor')
            ->withCount([
                'enrollments',
                'reviews as published_reviews_count' => fn($query) => $query->where('is_published', true),
            ])
            ->withAvg([
                'reviews as average_rating' => fn($query) => $query->where('is_published', true),
            ], 'rating')
            ->with(['modules.lessons.latestRevision', 'modules.lessons.publishedRevision', 'modules.quizzes', 'quizzes'])
            ->latest('updated_at')
            ->paginate($request->integer('per_page', 50) ?: 50);

        $isAdmin = $user->isAdmin();
        $userId = $user->id;

        $courses->getCollection()->transform(function (Course $course) use ($user, $progressCalculator, $isAdmin, $userId) {
            // Filter out unpublished lessons for non-admins/non-instructors
            $isPrivileged = $isAdmin || $userId === $course->instructor_id;
            if (!$isPrivileged) {
                $course->modules->each(function ($module) {
                    $module->setRelation('lessons', $module->lessons->filter(fn($lesson) => $lesson->is_published)->values());
                    if ($module->relationLoaded('quizzes')) {
                        $module->setRelation('quizzes', $module->quizzes->filter(fn($quiz) => $quiz->is_published)->values());
                    }
                });
                $course->setRelation('quizzes', $course->quizzes->filter(fn($quiz) => $quiz->is_published)->values());

                // Filter out modules with no published lessons or quizzes.
                $course->setRelation('modules', $course->modules->filter(
                    fn($module) => $module->lessons->count() > 0 || ($module->relationLoaded('quizzes') && $module->quizzes->count() > 0)
                )->values());
            }

            $progress = $progressCalculator->forUser($course, $user);
            $course->setAttribute('progress_percent', $progress['progress_percent']);
            $course->setAttribute('is_complete', $progress['is_complete']);

            return $course;
        });

        return response()->json($courses);
    }

    public function show(Request $request, Course $course): JsonResponse
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);

        $this->authorizeUserAccess($user, $course);

        $course->load(['modules.lessons.latestRevision', 'modules.lessons.publishedRevision', 'modules.quizzes.questions']);

        // Filter out unpublished lessons/quizzes for non-admins/non-instructors
        $isPrivileged = $user->isAdmin() || $user->id === $course->instructor_id;
        if (!$isPrivileged) {
            $course->modules->each(function ($module) {
                $module->setRelation('lessons', $module->lessons->filter(fn($lesson) => $lesson->is_published)->values());
                $module->setRelation('quizzes', $module->quizzes->filter(fn($quiz) => $quiz->is_published)->values());
            });

            // Filter out modules with no published lessons/quizzes
            $course->setRelation('modules', $course->modules->filter(
                fn($module) => $module->lessons->count() > 0 || $module->quizzes->count() > 0
            )->values());
        } else {
            // Privileged users still see all, but ensure module.quizzes is loaded
            $course->modules->each(function ($module) {
                if (!$module->relationLoaded('quizzes')) {
                    $module->setRelation('quizzes', collect());
                }
            });
        }

        $completedLessonIds = $this->getCompletedLessonIds($user, $course);
        $quizSummaries = $this->getQuizSummaries($user, $course);
        $progress = app(CourseProgressCalculator::class)->forUser($course, $user);

        return response()->json([
            'course' => $course,
            'completed_lesson_ids' => $completedLessonIds,
            'quiz_summaries' => $quizSummaries,
            'progress_percent' => $progress['progress_percent'],
            'is_complete' => $progress['is_complete'],
        ]);
    }

    private function authorizeUserAccess(User $user, Course $course): void
    {
        // Allow access if:
        // 1. User is admin, OR
        // 2. User is the course instructor, OR  
        // 3. User is enrolled in the course

        $isAdmin = $user->isAdmin();
        $isInstructor = (int) $user->id === (int) $course->instructor_id;
        $isEnrolled = $course->enrollments()
            ->where('user_id', $user->id)
            ->where('status', 'active')
            ->exists();

        abort_unless($isAdmin || $isInstructor || $isEnrolled, 403);
    }

    private function getCompletedLessonIds(User $user, Course $course): mixed
    {
        $lessonIds = $course->modules
            ->flatMap(fn($module) => $module->lessons)
            ->pluck('id');

        return Progress::query()
            ->where('user_id', $user->id)
            ->whereIn('lesson_id', $lessonIds)
            ->where('progress_percent', '>=', 100)
            ->pluck('lesson_id')
            ->values();
    }

    private function getQuizSummaries(User $user, Course $course): mixed
    {
        $quizIds = $course->modules->flatMap(fn($module) => $module->quizzes)->pluck('id');

        $attempts = QuizAttempt::query()
            ->where('user_id', $user->id)
            ->whereIn('quiz_id', $quizIds)
            ->latest('completed_at')
            ->get();

        return $quizIds->mapWithKeys(function ($quizId) use ($attempts) {
            $quizAttempts = $attempts->where('quiz_id', $quizId)->values();

            return [
                $quizId => [
                    'attempts_count' => $quizAttempts->count(),
                    'latest_attempt' => $quizAttempts->first(),
                    'best_score' => $quizAttempts->max('score'),
                    'passed' => $quizAttempts->contains(fn($attempt) => $attempt->passed),
                ],
            ];
        });
    }
}
