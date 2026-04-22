<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreQuizRequest;
use App\Http\Requests\UpdateQuizRequest;
use App\Models\Course;
use App\Models\Quiz;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

class QuizController extends Controller
{
    public function index(Course $course): JsonResponse
    {
        $this->authorize('view', $course);

        return response()->json($course->quizzes()->latest()->get());
    }

    public function store(StoreQuizRequest $request, Course $course): JsonResponse
    {
        $this->authorize('update', $course);

        $validated = $request->validated();

        $quiz = $course->quizzes()->create([
            ...$validated,
            'pass_score' => $validated['pass_score'] ?? 70,
            'is_published' => $validated['is_published'] ?? false,
        ]);

        return response()->json($quiz, 201);
    }

    public function show(Course $course, Quiz $quiz): JsonResponse
    {
        $this->authorize('view', $course);

        abort_unless($quiz->course_id === $course->id, 404);

        return response()->json($quiz);
    }

    public function update(UpdateQuizRequest $request, Course $course, Quiz $quiz): JsonResponse
    {
        $this->authorize('update', $course);

        abort_unless($quiz->course_id === $course->id, 404);

        $validated = $request->validated();

        $quiz->update($validated);

        return response()->json($quiz->fresh());
    }

    public function destroy(Course $course, Quiz $quiz): Response
    {
        $this->authorize('delete', $course);

        abort_unless($quiz->course_id === $course->id, 404);

        $quiz->delete();

        return response()->noContent();
    }
}