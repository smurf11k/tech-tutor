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

        return response()->json($course->quizzes()->with('questions')->latest()->get());
    }

    public function store(StoreQuizRequest $request, Course $course): JsonResponse
    {
        $this->authorize('update', $course);

        $validated = $request->validated();

        $questions = $validated['questions'] ?? [];
        unset($validated['questions']);

        $quiz = $course->quizzes()->create([
            ...$validated,
            'pass_score' => $validated['pass_score'] ?? 70,
            'is_published' => $validated['is_published'] ?? false,
        ]);

        $this->syncQuestions($quiz, $questions);

        return response()->json($quiz->load('questions'), 201);
    }

    public function show(Course $course, Quiz $quiz): JsonResponse
    {
        $this->authorize('view', $course);

        abort_unless($quiz->course_id === $course->id, 404);

        return response()->json($quiz->load('questions'));
    }

    public function update(UpdateQuizRequest $request, Course $course, Quiz $quiz): JsonResponse
    {
        $this->authorize('update', $course);

        abort_unless($quiz->course_id === $course->id, 404);

        $validated = $request->validated();

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
            ->filter(fn (array $option): bool => (bool) ($option['is_correct'] ?? false))
            ->pluck('key')
            ->map(fn (string $key): string => trim($key))
            ->values()
            ->all();

        abort_if($correctAnswers === [], 422, 'Each quiz question must have at least one correct option.');

        if ($question['type'] === 'single_choice' && count($correctAnswers) !== 1) {
            abort(422, 'Single choice questions must have exactly one correct option.');
        }

        $options = collect($question['options'])
            ->map(fn (array $option): array => [
                'key' => trim($option['key']),
                'text' => $option['text'],
            ])
            ->values()
            ->all();

        $optionKeys = array_column($options, 'key');
        abort_if(count($optionKeys) !== count(array_unique($optionKeys)), 422, 'Question option keys must be unique.');

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
