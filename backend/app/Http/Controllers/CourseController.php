<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreCourseRequest;
use App\Http\Requests\UpdateCourseRequest;
use App\Models\Course;
use App\Models\PublishRequest;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class CourseController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

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

        $query = Course::with('instructor')
            ->withCount([
                'enrollments',
                'reviews as published_reviews_count' => fn ($query) => $query->where('is_published', true),
            ])
            ->withAvg([
                'reviews as average_rating' => fn ($query) => $query->where('is_published', true),
            ], 'rating');

        if ($user === null) {
            $query->where('is_published', true);
        }

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

        // Only admins can set the published flag via API
        if (($payload['is_published'] ?? false) && ! $request->user()->isAdmin()) {
            abort(403);
        }

        // If an instructor requests publishing, we'll create a PublishRequest record
        $requestPublish = $payload['request_publish'] ?? false;
        unset($payload['request_publish']);

        $course = $request->user()->taughtCourses()->create([
            ...$payload,
            'is_published' => $payload['is_published'] ?? false,
        ]);

        if ($requestPublish && ! $request->user()->isAdmin()) {
            PublishRequest::create([
                'course_id' => $course->id,
                'requester_id' => $request->user()->id,
                'status' => 'pending',
            ]);
        }

        return response()->json($course->load('instructor'), 201);
    }

    /**
     * Display the specified resource.
     */
    public function show(Course $course): JsonResponse
    {
        $this->authorize('view', $course);

        return response()->json($course->load(['instructor', 'modules.lessons']));
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(UpdateCourseRequest $request, Course $course): JsonResponse
    {
        $this->authorize('update', $course);

        $validated = $request->validated();
        $payload = $this->normalizePublicationPayload($validated, $course);

        // Only admins can change the published flag via API
        if (array_key_exists('is_published', $payload) && ! $request->user()->isAdmin()) {
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

        // After update: process request/accept/decline
        if ($requestPublish && ! $request->user()->isAdmin()) {
            // Create a new pending PublishRequest
            PublishRequest::create([
                'course_id' => $course->id,
                'requester_id' => $request->user()->id,
                'status' => 'pending',
            ]);
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

                // TODO: add notification/email for requester about decline and include a message.
            }
        }

        return response()->json($course->fresh()->load('instructor'));
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

    /**
     * @param  Builder<Course>  $query
     * @param  array<string, mixed>  $filters
     */
    private function applyCatalogFilters($query, array $filters): void
    {
        if (! empty($filters['q'])) {
            $search = strtolower($filters['q']);
            $like = '%'.addcslashes($search, '%_\\').'%';

            // TODO: Replace this relational fallback with MeiliSearch when the search service is wired in.
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
}
