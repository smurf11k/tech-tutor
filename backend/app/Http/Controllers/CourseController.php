<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreCourseRequest;
use App\Http\Requests\UpdateCourseRequest;
use App\Models\Course;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

class CourseController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(): JsonResponse
    {
        return response()->json(
            Course::with('instructor')->latest()->paginate(12)
        );
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(StoreCourseRequest $request): JsonResponse
    {
        $this->authorize('create', Course::class);

        $validated = $request->validated();

        $course = $request->user()->taughtCourses()->create([
            ...$validated,
            'is_published' => $validated['is_published'] ?? false,
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

        $course->update($validated);

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
}
