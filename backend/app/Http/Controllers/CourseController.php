<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreCourseRequest;
use App\Http\Requests\UpdateCourseRequest;
use App\Models\Course;
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

        $query = Course::with('instructor')->latest();

        if ($user === null) {
            $query->where('is_published', true);
        }

        return response()->json(
            $query->paginate(12)
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

        $course = $request->user()->taughtCourses()->create([
            ...$payload,
            'is_published' => $payload['is_published'] ?? false,
        ]);

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

        $course->update($payload);

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
     * @param array<string, mixed> $payload
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
}
