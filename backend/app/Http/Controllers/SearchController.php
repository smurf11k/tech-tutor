<?php

namespace App\Http\Controllers;

use App\Models\Course;
use App\Models\Lesson;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class SearchController extends Controller
{
    public function resolve(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'q' => ['required', 'string', 'max:255'],
        ]);

        $query = trim($validated['q']);
        $user = $request->user('sanctum') ?? $request->user();

        if ($query === '') {
            return response()->json([
                'message' => 'Searched thing not found.',
            ], 404);
        }

        try {
            $resolved = $this->resolveUsingSearchEngine($query, $user);

            if ($resolved !== null) {
                return response()->json($resolved);
            }
        } catch (\Throwable $throwable) {
            Log::warning('Content search resolver failed. Falling back to database search.', [
                'driver' => config('scout.driver'),
                'query' => $query,
                'exception' => $throwable::class,
                'message' => $throwable->getMessage(),
            ]);
        }

        $resolved = $this->resolveUsingDatabase($query, $user);

        if ($resolved !== null) {
            return response()->json($resolved);
        }

        return response()->json([
            'message' => 'Searched thing not found.',
        ], 404);
    }

    private function resolveUsingSearchEngine(string $query, ?User $user): ?array
    {
        if (config('scout.driver') !== 'meilisearch') {
            return null;
        }

        $lessons = Lesson::search($query)->take(10)->get();
        $lessons->loadMissing('module.course.enrollments');
        $lesson = $this->firstAccessibleLesson($lessons, $user);

        if ($lesson !== null) {
            return $this->lessonResponse($lesson, $user);
        }

        $courses = Course::search($query)->take(10)->get();
        $courses->loadMissing('enrollments');
        $course = $this->firstAccessibleCourse($courses, $user);

        if ($course !== null) {
            return $this->courseResponse($course, $user);
        }

        return null;
    }

    private function resolveUsingDatabase(string $query, ?User $user): ?array
    {
        $lessonQuery = Lesson::query()
            ->with(['module.course'])
            ->where(function ($builder) use ($query) {
                $like = '%' . addcslashes(mb_strtolower($query), '%_\\') . '%';

                $builder
                    ->whereRaw('LOWER(title) LIKE ?', [$like])
                    ->orWhereRaw('LOWER(slug) LIKE ?', [$like])
                    ->orWhereRaw("LOWER(COALESCE(content, '')) LIKE ?", [$like])
                    ->orWhereRaw("LOWER(COALESCE(video_name, '')) LIKE ?", [$like]);
            })
            ->latest('updated_at')
            ->get();

        $lesson = $this->firstAccessibleLesson($lessonQuery, $user);
        if ($lesson !== null) {
            return $this->lessonResponse($lesson, $user);
        }

        $courseQuery = Course::query()
            ->with(['modules.lessons', 'enrollments'])
            ->where(function ($builder) use ($query) {
                $like = '%' . addcslashes(mb_strtolower($query), '%_\\') . '%';

                $builder
                    ->whereRaw('LOWER(title) LIKE ?', [$like])
                    ->orWhereRaw('LOWER(slug) LIKE ?', [$like])
                    ->orWhereRaw("LOWER(COALESCE(description, '')) LIKE ?", [$like])
                    ->orWhereRaw("LOWER(COALESCE(subtitle, '')) LIKE ?", [$like]);
            })
            ->latest('updated_at')
            ->get();

        $course = $this->firstAccessibleCourse($courseQuery, $user);

        if ($course !== null) {
            return $this->courseResponse($course, $user);
        }

        return null;
    }

    private function firstAccessibleLesson($lessons, ?User $user)
    {
        return collect($lessons)->first(function (Lesson $lesson) use ($user) {
            $course = $lesson->module?->course;

            if (!$course || !$this->canAccessLesson($lesson, $course, $user)) {
                return false;
            }

            return true;
        });
    }

    private function canAccessLesson(Lesson $lesson, Course $course, ?User $user): bool
    {
        if ($user === null) {
            return false;
        }

        if ($user->isAdmin() || $user->id === $course->instructor_id) {
            return true;
        }

        return $lesson->is_published
            && $course->enrollments()
                ->where('user_id', $user->id)
                ->where('status', 'active')
                ->exists();
    }

    private function firstAccessibleCourse($courses, ?User $user)
    {
        return collect($courses)->first(fn(Course $course) => $this->canAccessCourse($course, $user));
    }

    private function canAccessCourse(Course $course, ?User $user): bool
    {
        if ($user === null) {
            return $course->is_published;
        }

        if ($user->isAdmin() || $user->id === $course->instructor_id) {
            return true;
        }

        return $course->is_published
            || $course->enrollments()
                ->where('user_id', $user->id)
                ->where('status', 'active')
                ->exists();
    }

    private function lessonResponse(Lesson $lesson, ?User $user): array
    {
        $course = $lesson->module?->course?->loadMissing('enrollments') ?? $lesson->module?->course;
        $courseRouteKey = (string) ($course?->getRouteKey() ?? $course?->id ?? '');

        return [
            'type' => 'lesson',
            'title' => $lesson->title,
            'message' => null,
            'url' => '/learning/' . $courseRouteKey . '?lesson=' . $lesson->id,
            'course' => $course ? [
                'id' => $course->id,
                'slug' => $course->slug,
                'title' => $course->title,
            ] : null,
            'lesson' => [
                'id' => $lesson->id,
                'slug' => $lesson->slug,
                'title' => $lesson->title,
            ],
        ];
    }

    private function courseResponse(Course $course, ?User $user): array
    {
        $routeKey = (string) $course->getRouteKey();
        $isEnrolled = $user instanceof User
            && $course->enrollments()
                ->where('user_id', $user->id)
                ->where('status', 'active')
                ->exists();

        return [
            'type' => 'course',
            'title' => $course->title,
            'message' => null,
            'url' => $isEnrolled && !$user?->isInstructor() && !$user?->isAdmin()
                ? '/learning/' . $routeKey
                : '/courses/' . $routeKey,
            'course' => [
                'id' => $course->id,
                'slug' => $course->slug,
                'title' => $course->title,
            ],
            'lesson' => null,
        ];
    }
}