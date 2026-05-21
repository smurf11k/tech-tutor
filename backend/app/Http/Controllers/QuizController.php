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

        $quizzes = $course->quizzes()->with('questions')->orderBy('position')->get();

        // Hide correct_answers from students
        $user = request()->user();
        $isInstructor = $user && ($user->isAdmin() || $user->id === $course->instructor_id);

        // Filter unpublished quizzes for non-instructors
        if (!$isInstructor) {
            $quizzes = $quizzes->filter(fn($quiz) => $quiz->is_published)->values();
        }

        $quizzes->each(function ($quiz) use ($isInstructor) {
            if (!$isInstructor) {
                $quiz->questions->each(function ($question) {
                    $question->makeHidden(['correct_answers']);
                });
            }
        });

        return response()->json($quizzes);
    }

    public function store(StoreQuizRequest $request, Course $course): JsonResponse
    {
        $this->authorize('update', $course);

        $validated = $request->validated();

        $questions = $validated['questions'] ?? [];
        unset($validated['questions']);

        // If position not provided, calculate it based on module content
        $position = $validated['position'] ?? null;
        if ($position === null && isset($validated['module_id'])) {
            $module = $course->modules()->find($validated['module_id']);
            if ($module) {
                $maxLessonPos = $module->lessons()->max('position') ?? -1;
                $maxQuizPos = $module->quizzes()->max('position') ?? -1;
                $position = max($maxLessonPos, $maxQuizPos) + 1;
            }
        }
        if ($position === null) {
            $position = 0;
        }

        $quiz = $course->quizzes()->create([
            ...$validated,
            'module_id' => $validated['module_id'] ?? null,
            'pass_score' => $validated['pass_score'] ?? 70,
            'is_published' => $validated['is_published'] ?? false,
            'position' => $position,
        ]);

        $this->syncQuestions($quiz, $questions);

        return response()->json($quiz->load('questions'), 201);
    }

    public function show(Course $course, Quiz $quiz): JsonResponse
    {
        $this->authorize('view', $course);

        abort_unless($quiz->course_id === $course->id, 404);

        $quiz = $quiz->load('questions');

        // Hide correct_answers from students
        $user = request()->user();
        $isInstructor = $user && ($user->isAdmin() || $user->id === $course->instructor_id);

        // Check if quiz is published for non-instructors
        if (!$isInstructor && !$quiz->is_published) {
            abort(403, 'This quiz is not yet available.');
        }

        if (!$isInstructor) {
            $quiz->questions->each(function ($question) {
                $question->makeHidden(['correct_answers']);
            });
        }

        return response()->json($quiz);
    }

    public function update(UpdateQuizRequest $request, Course $course, Quiz $quiz): JsonResponse
    {
        $this->authorize('update', $course);

        abort_unless($quiz->course_id === $course->id, 404);

        $validated = $request->validated();

        // Only admins can directly set is_published
        if (array_key_exists('is_published', $validated) && !$request->user()->isAdmin()) {
            abort(403, 'Only admins can publish/unpublish quizzes.');
        }

        $questions = $validated['questions'] ?? null;
        unset($validated['questions']);

        $quiz->update($validated);

        if ($questions !== null) {
            $quiz->questions()->delete();
            $this->syncQuestions($quiz, $questions);
        }

        return response()->json($quiz->fresh()->load('questions'));
    }

    public function destroy(Course $course, Quiz $quiz): Response
    {
        $this->authorize('delete', $course);

        abort_unless($quiz->course_id === $course->id, 404);

        $quiz->delete();

        return response()->noContent();
    }

    /**
     * @param  array<int, array<string, mixed>>  $questions
     */
    private function syncQuestions(Quiz $quiz, array $questions): void
    {
        foreach ($questions as $index => $question) {
            $prepared = $this->prepareQuestionPayload($question, $index + 1);
            $quiz->questions()->create($prepared);
        }
    }

    /**
     * @param  array<string, mixed>  $question
     * @return array<string, mixed>
     */
    private function prepareQuestionPayload(array $question, int $defaultPosition): array
    {
        $correctAnswers = collect($question['options'])
            ->filter(fn(array $option): bool => (bool) ($option['is_correct'] ?? false))
            ->pluck('key')
            ->map(fn(string $key): string => trim($key))
            ->values()
            ->all();

        abort_if($correctAnswers === [], 422, 'Each quiz question must have at least one correct option.');

        if ($question['type'] === 'single_choice' && count($correctAnswers) !== 1) {
            abort(422, 'Single choice questions must have exactly one correct option.');
        }

        $options = collect($question['options'])
            ->map(fn(array $option): array => [
                'key' => trim($option['key']),
                'text' => $option['text'],
            ])
            ->values()
            ->all();

        $optionKeys = array_column($options, 'key');
        abort_if(
            count($optionKeys) !== count(array_unique($optionKeys)),
            422,
            'Question option keys must be unique.'
        );

        return [
            'type' => $question['type'],
            'prompt' => $question['prompt'],
            'options' => $options,
            'correct_answers' => $correctAnswers,
            'points' => $question['points'] ?? 1,
            'position' => $question['position'] ?? $defaultPosition,
        ];
    }
}