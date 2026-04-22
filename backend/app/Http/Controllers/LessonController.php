<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreLessonRequest;
use App\Http\Requests\UpdateLessonRequest;
use App\Models\Course;
use App\Models\Lesson;
use App\Models\Module;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

class LessonController extends Controller
{
    public function index(Module $module): JsonResponse
    {
        /** @var Course $course */
        $course = $module->course;
        $this->authorize('view', $course);

        return response()->json($module->lessons()->get());
    }

    public function store(StoreLessonRequest $request, Module $module): JsonResponse
    {
        /** @var Course $course */
        $course = $module->course;
        $this->authorize('update', $course);

        $validated = $request->validated();

        $lesson = $module->lessons()->create([
            ...$validated,
            'type' => $validated['type'] ?? 'text',
            'position' => $validated['position'] ?? 0,
            'is_preview' => $validated['is_preview'] ?? false,
        ]);

        return response()->json($lesson, 201);
    }

    public function show(Module $module, Lesson $lesson): JsonResponse
    {
        /** @var Course $course */
        $course = $module->course;
        $this->authorize('view', $course);

        abort_unless($lesson->module_id === $module->id, 404);

        return response()->json($lesson);
    }

    public function update(UpdateLessonRequest $request, Module $module, Lesson $lesson): JsonResponse
    {
        /** @var Course $course */
        $course = $module->course;
        $this->authorize('update', $course);

        abort_unless($lesson->module_id === $module->id, 404);

        $validated = $request->validated();

        $lesson->update($validated);

        return response()->json($lesson->fresh());
    }

    public function destroy(Module $module, Lesson $lesson): Response
    {
        /** @var Course $course */
        $course = $module->course;
        $this->authorize('delete', $course);

        abort_unless($lesson->module_id === $module->id, 404);

        $lesson->delete();

        return response()->noContent();
    }
}