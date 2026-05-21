<?php

namespace App\Http\Controllers;

use App\Models\Course;
use App\Models\Lesson;
use App\Models\Module;
use App\Models\Quiz;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReorderController extends Controller
{
    /**
     * Reorder lessons within a module.
     * PATCH /modules/{module}/lessons/reorder
     *
     * Body: { "ids": [3, 1, 2] }  — ordered list of lesson IDs with positions 0, 1, 2...
     */
    public function reorderLessons(Request $request, Module $module): JsonResponse
    {
        /** @var Course $course */
        $course = $module->course;
        $this->authorize('update', $course);

        $request->validate([
            'ids' => ['required', 'array'],
            'ids.*' => ['integer'],
        ]);

        foreach ($request->ids as $position => $lessonId) {
            Lesson::where('id', $lessonId)
                ->where('module_id', $module->id)
                ->update(['position' => $position]);
        }

        return response()->json(['reordered' => true]);
    }

    /**
     * Reorder quizzes within a course (optionally scoped to a module).
     * PATCH /courses/{course}/quizzes/reorder
     *
     * Body: { "module_id": 5, "ids": [3, 1, 2] }  — ordered list of quiz IDs with positions 0, 1, 2...
     * If module_id is provided, reorder is scoped to that module.
     */
    public function reorderQuizzes(Request $request, Course $course): JsonResponse
    {
        $this->authorize('update', $course);

        $request->validate([
            'ids' => ['required', 'array'],
            'ids.*' => ['integer'],
            'module_id' => ['nullable', 'integer'],
        ]);

        $moduleId = $request->input('module_id');

        foreach ($request->ids as $position => $quizId) {
            $query = Quiz::where('id', $quizId)
                ->where('course_id', $course->id);
            
            if ($moduleId !== null) {
                $query->where('module_id', $moduleId);
            }
            
            $query->update(['position' => $position]);
        }

        return response()->json(['reordered' => true]);
    }

    /**
     * Reorder any content within a module (lessons and quizzes together).
     * PATCH /modules/{module}/content/reorder
     *
     * Body: { "items": [
     *   { "type": "lesson", "id": 1 },
     *   { "type": "quiz", "id": 5 },
     *   { "type": "lesson", "id": 2 }
     * ]}
     * 
     * Positions are assigned 0, 1, 2... based on order in array.
     */
    public function reorderModuleContent(Request $request, Module $module): JsonResponse
    {
        /** @var Course $course */
        $course = $module->course;
        $this->authorize('update', $course);

        $request->validate([
            'items' => ['required', 'array'],
            'items.*.type' => ['required', 'in:lesson,quiz'],
            'items.*.id' => ['required', 'integer'],
        ]);

        foreach ($request->items as $position => $item) {
            if ($item['type'] === 'lesson') {
                Lesson::where('id', $item['id'])
                    ->where('module_id', $module->id)
                    ->update(['position' => $position]);
            } else {
                Quiz::where('id', $item['id'])
                    ->where('module_id', $module->id)
                    ->update(['position' => $position]);
            }
        }

        return response()->json(['reordered' => true]);
    }

    /**
     * Reorder modules within a course.
     * PATCH /courses/{course}/modules/reorder
     *
     * Body: { "ids": [3, 1, 2] }  — ordered list of module IDs with positions 0, 1, 2...
     */
    public function reorderModules(Request $request, Course $course): JsonResponse
    {
        $this->authorize('update', $course);

        $request->validate([
            'ids' => ['required', 'array'],
            'ids.*' => ['integer'],
        ]);

        foreach ($request->ids as $position => $moduleId) {
            Module::where('id', $moduleId)
                ->where('course_id', $course->id)
                ->update(['position' => $position]);
        }

        return response()->json(['reordered' => true]);
    }
}