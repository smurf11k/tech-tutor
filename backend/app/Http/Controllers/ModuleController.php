<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreModuleRequest;
use App\Http\Requests\UpdateModuleRequest;
use App\Models\Course;
use App\Models\Module;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

class ModuleController extends Controller
{
    public function index(Course $course): JsonResponse
    {
        $this->authorize('view', $course);

        return response()->json($course->modules()->with('lessons')->get());
    }

    public function store(StoreModuleRequest $request, Course $course): JsonResponse
    {
        $this->authorize('update', $course);

        $validated = $request->validated();

        $module = $course->modules()->create([
            ...$validated,
            'position' => $validated['position'] ?? 0,
        ]);

        return response()->json($module->load('lessons'), 201);
    }

    public function show(Course $course, Module $module): JsonResponse
    {
        $this->authorize('view', $course);

        abort_unless($module->course_id === $course->id, 404);

        return response()->json($module->load('lessons'));
    }

    public function update(UpdateModuleRequest $request, Course $course, Module $module): JsonResponse
    {
        $this->authorize('update', $course);

        abort_unless($module->course_id === $course->id, 404);

        $validated = $request->validated();

        $module->update($validated);

        return response()->json($module->fresh()->load('lessons'));
    }

    public function destroy(Course $course, Module $module): Response
    {
        $this->authorize('delete', $course);

        abort_unless($module->course_id === $course->id, 404);

        $module->delete();

        return response()->noContent();
    }
}