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

        $modules = $course->modules()->with(['lessons', 'quizzes.questions'])->get();

        $user = request()->user();
        $isInstructor = $this->isInstructor($user, $course);

        // Filter out unpublished lessons and quizzes for non-instructors
        if (!$isInstructor) {
            $modules->each(function ($module) {
                $module->lessons = $module->lessons->filter(fn($lesson) => $lesson->is_published)->values();
                $module->quizzes = $module->quizzes->filter(fn($quiz) => $quiz->is_published)->values();
                $module->quizzes->each(function ($quiz) {
                    $quiz->questions->each(function ($question) {
                        $question->makeHidden(['correct_answers']);
                    });
                });
            });
        } else {
            // Hide correct_answers from students
            $modules->each(function ($module) {
                $module->quizzes->each(function ($quiz) {
                    $quiz->questions->each(function ($question) {
                        $question->makeHidden(['correct_answers']);
                    });
                });
            });
        }

        return response()->json($modules);
    }

    private function isInstructor($user, $course): bool
    {
        return $user && ($user->isAdmin() || $user->id === $course->instructor_id);
    }

    public function store(StoreModuleRequest $request, Course $course): JsonResponse
    {
        $this->authorize('update', $course);

        $validated = $request->validated();

        $module = $course->modules()->create([
            ...$validated,
            'position' => $validated['position'] ?? 0,
        ]);

        $module = $module->load(['lessons', 'quizzes.questions']);

        // Hide correct_answers from students (though this is a create action, so only instructors)
        return response()->json($module, 201);
    }

    public function show(Course $course, Module $module): JsonResponse
    {
        $this->authorize('view', $course);

        abort_unless($module->course_id === $course->id, 404);

        $module = $module->load(['lessons', 'quizzes.questions']);

        $user = request()->user();
        $isInstructor = $this->isInstructor($user, $course);

        // Filter out unpublished lessons and quizzes for non-instructors
        if (!$isInstructor) {
            $module->setRelation(
                'lessons',
                $module->lessons->filter(fn($lesson) => $lesson->is_published)->values()
            );

            $module->setRelation(
                'quizzes',
                $module->quizzes->filter(fn($quiz) => $quiz->is_published)->values()
            );
        }

        // Hide correct_answers from students
        if (!$isInstructor) {
            $module->quizzes->each(function ($quiz) {
                $quiz->questions->each(function ($question) {
                    $question->makeHidden(['correct_answers']);
                });
            });
        }

        return response()->json($module);
    }

    public function update(UpdateModuleRequest $request, Course $course, Module $module): JsonResponse
    {
        $this->authorize('update', $course);

        abort_unless($module->course_id === $course->id, 404);

        $module->update($request->validated());

        $module = $module->fresh()->load(['lessons', 'quizzes.questions']);

        // Hide correct_answers from students (though this is an update action, so only instructors)
        return response()->json($module);
    }

    public function destroy(Course $course, Module $module): Response
    {
        $this->authorize('delete', $course);

        abort_unless($module->course_id === $course->id, 404);

        $module->delete();

        return response()->noContent();
    }
}