<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreCourseRequest;
use App\Http\Requests\UpdateCourseRequest;
use App\Models\Course;
use App\Models\Tag;
use App\Models\PublishRequest;
use App\Models\User;
use App\Services\CourseProgressCalculator;
use App\Notifications\PublishRequestHandledNotification;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Laravel\Scout\Builder as ScoutBuilder;

class CourseController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user('sanctum') ?? $request->user();

        $filters = $request->validate([
            'q' => ['nullable', 'string', 'max:255'],
            'category' => ['nullable', 'string', 'max:100'],
            'level' => ['nullable', 'string', 'max:50'],
            'language' => ['nullable', 'string', 'max:50'],
            'instructor_id' => ['nullable', 'integer', 'exists:users,id'],
            'price_type' => ['nullable', 'in:free,paid'],
            'min_price' => ['nullable', 'numeric', 'min:0'],
            'max_price' => ['nullable', 'numeric', 'min:0'],
            'sort' => ['nullable', 'in:newest,oldest,title,price_asc,price_desc,rating'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:50'],
        ]);

        $useScoutSearch = !empty($filters['q'])
            && config('scout.driver') === 'meilisearch'
            && ($filters['sort'] ?? 'newest') !== 'rating'
            && !($user instanceof User && $user->isInstructor() && !$user->isAdmin());

        if ($useScoutSearch) {
            try {
                $query = Course::search($filters['q']);

                $this->applyCatalogVisibilityToScout($query, $user);
                $this->applyCatalogSearchFilters($query, $filters);

                if (($filters['sort'] ?? 'newest') !== 'rating') {
                    $this->applyCatalogSearchSort($query, $filters['sort'] ?? 'newest');
                }

                $query->query(
                    function (Builder $query) use ($user) {
                        $this->applyCatalogVisibility($query, $user);

                        return $query
                            ->with(['instructor', 'tags'])
                            ->withCount([
                                'enrollments',
                                'reviews as published_reviews_count' => fn($query) => $query->where('is_published', true),
                            ])
                            ->withAvg([
                                'reviews as average_rating' => fn($query) => $query->where('is_published', true),
                            ], 'rating');
                    }
                );

                return response()->json(
                    $query->paginate($filters['per_page'] ?? 12)
                );
            } catch (\Throwable $throwable) {
                // Fall back to the database search path when Scout is unavailable.
            }
        }

        $query = Course::with(['instructor', 'tags'])
            ->withCount([
                'enrollments',
                'reviews as published_reviews_count' => fn($query) => $query->where('is_published', true),
            ])
            ->withAvg([
                'reviews as average_rating' => fn($query) => $query->where('is_published', true),
            ], 'rating');

        $this->applyCatalogVisibility($query, $user);
        $this->applyCatalogFilters($query, $filters);
        $this->applyCatalogSort($query, $filters['sort'] ?? 'newest');

        return response()->json(
            $query->paginate($filters['per_page'] ?? 12)
        );
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreCourseRequest $request): JsonResponse
    {
        $this->authorize('create', Course::class);

        $validated = $request->validated();
        $payload = $this->normalizePublicationPayload($validated);
        $tags = $payload['tags'] ?? [];
        unset($payload['tags']);

        // Only admins can set the published flag via API
        if (($payload['is_published'] ?? false) && !$request->user()->isAdmin()) {
            abort(403);
        }

        // If an instructor requests publishing, we'll create a PublishRequest record
        $requestPublish = $payload['request_publish'] ?? false;
        unset($payload['request_publish']);

        $course = $request->user()->taughtCourses()->create([
            ...$payload,
            'is_published' => $payload['is_published'] ?? false,
        ]);

        $this->syncCourseTags($course, $tags);

        if ($requestPublish && !$request->user()->isAdmin()) {
            $this->createPendingPublishRequest($course, $request->user()->id);
        }

        return response()->json($course->load(['instructor', 'tags']), 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Request $request, Course $course, CourseProgressCalculator $progressCalculator): JsonResponse
    {
        if (!$course->is_published) {
            $user = $request->user('sanctum') ?? $request->user();

            abort_unless(
                $user !== null && ($user->isAdmin() || $user->id === $course->instructor_id),
                403
            );
        }

        $user = $request->user('sanctum') ?? $request->user();

        $course->load(['instructor', 'tags', 'modules.lessons', 'modules.quizzes', 'quizzes']);

        // Filter out unpublished lessons and quizzes for non-privileged users
        $isPrivileged = $user instanceof User && ($user->isAdmin() || $user->id === $course->instructor_id);
        if (!$isPrivileged) {
            $course->modules->each(function ($module) {
                $module->setRelation('lessons', $module->lessons->filter(fn($lesson) => $lesson->is_published)->values());
                $module->setRelation('quizzes', $module->quizzes->filter(fn($quiz) => $quiz->is_published)->values());
            });
            $course->setRelation('quizzes', $course->quizzes->filter(fn($quiz) => $quiz->is_published)->values());

            // Filter out modules with no published lessons or quizzes
            $course->setRelation('modules', $course->modules->filter(
                fn($module) => $module->lessons->count() > 0 || $module->quizzes->count() > 0
            )->values());
        }

        $course->loadCount(['enrollments']);
        $course->loadCount([
            'reviews as published_reviews_count' => fn($query) => $query->where('is_published', true),
        ]);
        $course->loadAvg([
            'reviews as average_rating' => fn($query) => $query->where('is_published', true),
        ], 'rating');

        // Only set enrollment/progress for regular users — admins and instructors don't enroll
        if ($user instanceof User && !$isPrivileged) {
            $isEnrolled = $course->enrollments()
                ->where('user_id', $user->id)
                ->where('status', 'active')
                ->exists();

            $course->setAttribute('is_enrolled', $isEnrolled);

            if ($isEnrolled) {
                $progress = $progressCalculator->forUser($course, $user);
                $course->setAttribute('progress_percent', $progress['progress_percent']);
                $course->setAttribute('is_complete', $progress['is_complete']);
            }
        }

        return response()->json($course);
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateCourseRequest $request, Course $course): JsonResponse
    {
        $this->authorize('update', $course);

        $validated = $request->validated();
        $payload = $this->normalizePublicationPayload($validated, $course);
        $tags = $payload['tags'] ?? [];
        unset($payload['tags']);

        // Only admins can change the published flag via API
        if (array_key_exists('is_published', $payload) && !$request->user()->isAdmin()) {
            abort(403);
        }

        // Handle instructor publish request flag
        $requestPublish = $payload['request_publish'] ?? null;
        if ($requestPublish !== null) {
            unset($payload['request_publish']);
        }

        // Admin decline handling: admin may decline a pending publish request
        $declinePublish = $payload['decline_publish'] ?? null;
        $declineReason = $payload['publish_request_declined_reason'] ?? null;
        if ($declinePublish !== null) {
            unset($payload['decline_publish']);
            unset($payload['publish_request_declined_reason']);
        }

        $course->update($payload);
        $this->syncCourseTags($course, $tags);

        // After update: process request/accept/decline
        if ($requestPublish && !$request->user()->isAdmin()) {
            $this->createPendingPublishRequest($course, $request->user()->id);
        }

        if (array_key_exists('is_published', $payload) && $payload['is_published'] === true && $request->user()->isAdmin()) {
            // Admin accepted publishing — mark any pending request as accepted
            $pending = PublishRequest::where('course_id', $course->id)->where('status', 'pending')->first();
            if ($pending) {
                $pending->update([
                    'status' => 'accepted',
                    'handled_by' => $request->user()->id,
                    'handled_at' => now(),
                ]);

                $pending->load(['course', 'requester']);
                $pending->requester?->notify(new PublishRequestHandledNotification($pending));
            }
        }

        if ($declinePublish && $request->user()->isAdmin()) {
            // Admin declines the publish request
            $pending = PublishRequest::where('course_id', $course->id)->where('status', 'pending')->first();
            if ($pending) {
                $pending->update([
                    'status' => 'declined',
                    'declined_reason' => $declineReason,
                    'handled_by' => $request->user()->id,
                    'handled_at' => now(),
                ]);

                $pending->load(['course', 'requester']);
                $pending->requester?->notify(new PublishRequestHandledNotification($pending));
            }
        }

        return response()->json($course->fresh()->load(['instructor', 'tags']));
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Course $course): Response
    {
        $this->authorize('delete', $course);

        $course->delete();

        return response()->noContent();
    }

    /**
     * Keep publish timestamp consistent with publish state.
     *
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    private function normalizePublicationPayload(array $payload, ?Course $course = null): array
    {
        if (array_key_exists('is_published', $payload)) {
            if ($payload['is_published']) {
                $payload['published_at'] = $payload['published_at'] ?? ($course?->published_at ?? now());
            } else {
                $payload['published_at'] = null;
            }
        }

        if (($payload['published_at'] ?? null) !== null) {
            $payload['is_published'] = true;
        }

        return $payload;
    }

    public function catalogOptions(Request $request): JsonResponse
    {
        $user = $request->user('sanctum') ?? $request->user();

        $query = Course::query();
        $this->applyCatalogVisibility($query, $user);

        $categories = (clone $query)
            ->whereNotNull('category')
            ->where('category', '!=', '')
            ->distinct()
            ->orderBy('category')
            ->pluck('category')
            ->values();

        $levels = (clone $query)
            ->whereNotNull('level')
            ->where('level', '!=', '')
            ->distinct()
            ->orderBy('level')
            ->pluck('level')
            ->values();

        return response()->json([
            'categories' => $categories,
            'levels' => $levels,
        ]);
    }

    private function createPendingPublishRequest(Course $course, int $requesterId): void
    {
        $hasPending = PublishRequest::query()
            ->where('course_id', $course->id)
            ->where('status', 'pending')
            ->exists();

        if ($hasPending) {
            return;
        }

        PublishRequest::create([
            'course_id' => $course->id,
            'requester_id' => $requesterId,
            'status' => 'pending',
        ]);
    }

    /**
     * @param array<int, string> $tagNames
     */
    private function syncCourseTags(Course $course, array $tagNames): void
    {
        $tagIds = collect($tagNames)
            ->map(fn(string $tagName): string => \Illuminate\Support\Str::slug($tagName))
            ->filter()
            ->unique()
            ->map(function (string $slug): int {
                return Tag::query()->firstOrCreate(
                    ['slug' => $slug],
                    ['name' => str_replace('-', ' ', $slug)],
                )->id;
            })
            ->values()
            ->all();

        $course->tags()->sync($tagIds);
    }

    /**
     * @param  Builder<Course>  $query
     */
    private function applyCatalogVisibility(Builder $query, ?User $user): void
    {
        if ($user === null || (!$user->isAdmin() && !$user->isInstructor())) {
            $query->where('is_published', true);

            return;
        }

        if ($user->isAdmin()) {
            return;
        }

        $query->where(function (Builder $query) use ($user) {
            $query->where('is_published', true)
                ->orWhere('instructor_id', $user->id);
        });
    }

    /**
     * @param  ScoutBuilder<Course>  $query
     */
    private function applyCatalogVisibilityToScout(ScoutBuilder $query, ?User $user): void
    {
        if ($user === null || (!$user->isAdmin() && !$user->isInstructor())) {
            $query->where('is_published', true);
        }
    }

    /**
     * @param  Builder<Course>  $query
     * @param  array<string, mixed>  $filters
     */
    private function applyCatalogFilters($query, array $filters): void
    {
        if (!empty($filters['q'])) {
            $search = strtolower($filters['q']);
            $like = '%' . addcslashes($search, '%_\\') . '%';

            $query->where(function ($query) use ($like) {
                $query->whereRaw('LOWER(title) LIKE ?', [$like])
                    ->orWhereRaw('LOWER(subtitle) LIKE ?', [$like])
                    ->orWhereRaw('LOWER(description) LIKE ?', [$like])
                    ->orWhereRaw('LOWER(category) LIKE ?', [$like])
                    ->orWhereRaw('LOWER(slug) LIKE ?', [$like]);
            });
        }

        foreach (['category', 'level', 'language', 'instructor_id'] as $field) {
            if (array_key_exists($field, $filters) && $filters[$field] !== null && $filters[$field] !== '') {
                $query->where($field, $filters[$field]);
            }
        }

        if (($filters['price_type'] ?? null) === 'free') {
            $query->where('price', 0);
        }

        if (($filters['price_type'] ?? null) === 'paid') {
            $query->where('price', '>', 0);
        }

        if (array_key_exists('min_price', $filters) && $filters['min_price'] !== null) {
            $query->where('price', '>=', $filters['min_price']);
        }

        if (array_key_exists('max_price', $filters) && $filters['max_price'] !== null) {
            $query->where('price', '<=', $filters['max_price']);
        }
    }

    /**
     * @param  Builder<Course>  $query
     */
    private function applyCatalogSort($query, string $sort): void
    {
        match ($sort) {
            'oldest' => $query->oldest(),
            'title' => $query->orderBy('title'),
            'price_asc' => $query->orderBy('price')->latest(),
            'price_desc' => $query->orderByDesc('price')->latest(),
            'rating' => $query->orderByDesc('average_rating')->latest(),
            default => $query->latest(),
        };
    }

    /**
     * @param  ScoutBuilder<Course>  $query
     * @param  array<string, mixed>  $filters
     */
    private function applyCatalogSearchFilters(ScoutBuilder $query, array $filters): void
    {
        foreach (['category', 'level', 'language', 'instructor_id'] as $field) {
            if (array_key_exists($field, $filters) && $filters[$field] !== null && $filters[$field] !== '') {
                $query->where($field, $filters[$field]);
            }
        }

        if (($filters['price_type'] ?? null) === 'free') {
            $query->where('price', '=', 0);
        }

        if (($filters['price_type'] ?? null) === 'paid') {
            $query->where('price', '>', 0);
        }

        if (array_key_exists('min_price', $filters) && $filters['min_price'] !== null) {
            $query->where('price', '>=', $filters['min_price']);
        }

        if (array_key_exists('max_price', $filters) && $filters['max_price'] !== null) {
            $query->where('price', '<=', $filters['max_price']);
        }
    }

    /**
     * @param  ScoutBuilder<Course>  $query
     */
    private function applyCatalogSearchSort(ScoutBuilder $query, string $sort): void
    {
        match ($sort) {
            'oldest' => $query->orderBy('published_at', 'asc'),
            'title' => $query->orderBy('title', 'asc'),
            'price_asc' => $query->orderBy('price', 'asc'),
            'price_desc' => $query->orderBy('price', 'desc'),
            default => $query->orderBy('published_at', 'desc'),
        };
    }
}