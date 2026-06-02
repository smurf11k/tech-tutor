<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreQuizRequest;
use App\Http\Requests\UpdateQuizRequest;
use App\Models\Course;
use App\Models\Quiz;
use App\Models\QuizRevision;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

class QuizController extends Controller
{
    public function index(Course $course): JsonResponse
    {
        $this->authorize('view', $course);

        $quizzes = $course->quizzes()
            ->with(['questions'])
            ->orderBy('position')
            ->get();

        // Hide correct_answers from students
        $user = request()->user();
        $isInstructor = $user && ($user->isAdmin() || $user->id === $course->instructor_id);

        // Filter unpublished quizzes for non-instructors
        if (!$isInstructor) {
            $quizzes = $quizzes->filter(fn($quiz) => $quiz->is_published)->values();
        }

        $quizzes->each(function ($quiz) use ($isInstructor) {
            $this->attachRevisionSnapshots($quiz);

            if (!$isInstructor) {
                $quiz->questions->each(function ($question) {
                    $question->makeHidden(['correct_answers']);
                });
                $quiz->unsetRelation('latestRevision');
                $quiz->unsetRelation('publishedRevision');
            }
        });

        return response()->json($quizzes);
    }

    public function store(StoreQuizRequest $request, Course $course): JsonResponse
    {
        $this->authorize('update', $course);

        $validated = $request->validated();
        $revisionStatus = $this->resolveRevisionStatus($validated);

        if (array_key_exists('revision_status', $validated) && $revisionStatus === 'published' && !$request->user()?->isAdmin()) {
            abort(403, 'Only admins can publish quizzes.');
        }

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
            ...$this->quizSnapshotFromPayload($validated),
            'module_id' => $validated['module_id'] ?? null,
            'pass_score' => $validated['pass_score'] ?? 70,
            'estimated_time_minutes' => $validated['estimated_time_minutes'] ?? null,
            'time_limit_seconds' => $validated['time_limit_seconds'] ?? null,
            'is_published' => false,
            'position' => $position,
        ]);

        $revision = $this->upsertRevision(
            $quiz,
            [
                ...$validated,
                'questions' => $questions,
                'position' => $position,
            ],
            $revisionStatus,
            $request->user(),
        );

        if ($revisionStatus === 'published') {
            $this->publishRevision($quiz, $revision, $request->user());
        } else {
            $this->syncQuestions($quiz, $questions);
        }

        return response()->json($this->attachRevisionSnapshots($quiz->fresh()->load(['questions'])), 201);
    }

    public function show(Course $course, Quiz $quiz): JsonResponse
    {
        $this->authorize('view', $course);

        abort_unless($quiz->course_id === $course->id, 404);

        $quiz = $this->attachRevisionSnapshots($quiz->load(['questions']));

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
            $quiz->unsetRelation('latestRevision');
            $quiz->unsetRelation('publishedRevision');
        }

        return response()->json($quiz);
    }

    public function update(UpdateQuizRequest $request, Course $course, Quiz $quiz): JsonResponse
    {
        $this->authorize('update', $course);

        abort_unless($quiz->course_id === $course->id, 404);

        $validated = $request->validated();

        $revisionStatus = $this->resolveRevisionStatus($validated);

        if (array_key_exists('revision_status', $validated) && $revisionStatus === 'published' && !$request->user()?->isAdmin()) {
            abort(403, 'Only admins can publish quizzes.');
        }

        $questions = $validated['questions'] ?? null;
        unset($validated['questions']);

        $editableRevision = $this->currentEditableRevision($quiz);

        if (!$quiz->is_published) {
            $quiz->update($this->quizSnapshotFromPayload($validated));

            if ($questions !== null) {
                $quiz->questions()->delete();
                $this->syncQuestions($quiz, $questions);
            }
        }

        $revision = $this->upsertRevision(
            $quiz,
            [
                ...$validated,
                'questions' => $questions ?? $editableRevision?->questions ?? [],
            ],
            $revisionStatus,
            $request->user(),
            $editableRevision,
        );

        if ($revisionStatus === 'published') {
            $this->publishRevision($quiz, $revision, $request->user());
        }

        $responseQuiz = $quiz->fresh()->load(['questions']);
        $responseQuiz->setRelation('latestRevision', $revision);
        $responseQuiz->setRelation(
            'publishedRevision',
            $revisionStatus === 'published'
            ? $revision
            : QuizRevision::query()
                ->where('quiz_id', $responseQuiz->id)
                ->where('status', 'published')
                ->orderByDesc('version')
                ->first(),
        );

        return response()->json($responseQuiz);
    }

    public function destroy(Course $course, Quiz $quiz): Response
    {
        $this->authorize('update', $course);

        abort_unless($quiz->course_id === $course->id, 404);

        $user = request()->user();
        $hasPublishedRevision = QuizRevision::query()
            ->where('quiz_id', $quiz->id)
            ->where('status', 'published')
            ->exists();

        abort_if(
            $user && !$user->isAdmin() && ($quiz->is_published || $hasPublishedRevision),
            409,
            'Published quizzes must be unpublished before deletion.',
        );

        $quiz->delete();

        return response()->noContent();
    }

    public function unpublish(Course $course, Quiz $quiz): JsonResponse
    {
        $this->ensureAdmin();

        abort_unless($quiz->course_id === $course->id, 404);

        $publishedRevision = QuizRevision::query()
            ->where('quiz_id', $quiz->id)
            ->where('status', 'published')
            ->latest('version')
            ->first();

        if ($publishedRevision) {
            $publishedRevision->update([
                'status' => 'draft',
                'unpublished_at' => now(),
                'reviewed_by_id' => request()->user()?->id,
                'reviewed_at' => now(),
            ]);
        }

        $quiz->update(['is_published' => false]);

        return response()->json($quiz->fresh()->load(['questions', 'latestRevision', 'publishedRevision']));
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

    private function currentEditableRevision(Quiz $quiz): ?QuizRevision
    {
        return QuizRevision::query()
            ->where('quiz_id', $quiz->id)
            ->whereIn('status', ['draft', 'pending_review'])
            ->latest('version')
            ->first();
    }

    private function resolveRevisionStatus(array $validated): string
    {
        if (array_key_exists('revision_status', $validated)) {
            return $validated['revision_status'];
        }

        return !empty($validated['is_published']) ? 'published' : 'draft';
    }

    /**
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    private function quizSnapshotFromPayload(array $payload): array
    {
        return array_intersect_key($payload, array_flip([
            'title',
            'description',
            'module_id',
            'pass_score',
            'estimated_time_minutes',
            'time_limit_seconds',
            'is_published',
            'position',
        ]));
    }

    /**
     * @param array<string, mixed> $payload
     */
    private function upsertRevision(
        Quiz $quiz,
        array $payload,
        string $status,
        User $author,
        ?QuizRevision $revision = null,
    ): QuizRevision {
        $revisionPayload = [
            'quiz_id' => $quiz->id,
            'author_id' => $author->id,
            'version' => $revision?->version ?? ((QuizRevision::query()->where('quiz_id', $quiz->id)->max('version') ?? 0) + 1),
            'status' => $status,
            'title' => $payload['title'] ?? $quiz->title,
            'description' => $payload['description'] ?? $quiz->description,
            'module_id' => array_key_exists('module_id', $payload) ? $payload['module_id'] : $quiz->module_id,
            'pass_score' => array_key_exists('pass_score', $payload) ? $payload['pass_score'] : $quiz->pass_score,
            'estimated_time_minutes' => array_key_exists('estimated_time_minutes', $payload)
                ? $payload['estimated_time_minutes']
                : $quiz->estimated_time_minutes,
            'time_limit_seconds' => array_key_exists('time_limit_seconds', $payload)
                ? $payload['time_limit_seconds']
                : $quiz->time_limit_seconds,
            'is_published' => array_key_exists('is_published', $payload)
                ? (bool) $payload['is_published']
                : (bool) $quiz->is_published,
            'position' => array_key_exists('position', $payload) ? $payload['position'] : $quiz->position,
            'questions' => $payload['questions'] ?? [],
            'reviewed_by_id' => null,
            'published_by_id' => null,
            'reviewed_at' => null,
            'published_at' => null,
            'unpublished_at' => null,
            'rejection_reason' => null,
        ];

        if ($revision) {
            $revision->update($revisionPayload);

            return $revision->fresh();
        }

        return $quiz->revisions()->create($revisionPayload);
    }

    private function publishRevision(Quiz $quiz, QuizRevision $revision, User $admin): void
    {
        $quiz->update([
            'title' => $revision->title,
            'description' => $revision->description,
            'module_id' => $revision->module_id,
            'pass_score' => $revision->pass_score,
            'estimated_time_minutes' => $revision->estimated_time_minutes,
            'time_limit_seconds' => $revision->time_limit_seconds,
            'is_published' => true,
            'position' => $revision->position,
        ]);

        $quiz->questions()->delete();
        $this->syncQuestions($quiz, $revision->questions ?? []);

        QuizRevision::query()
            ->where('quiz_id', $quiz->id)
            ->where('status', 'published')
            ->whereKeyNot($revision->id)
            ->update([
                'status' => 'draft',
                'unpublished_at' => now(),
                'reviewed_by_id' => $admin->id,
                'reviewed_at' => now(),
            ]);

        $revision->update([
            'status' => 'published',
            'reviewed_by_id' => $admin->id,
            'reviewed_at' => now(),
            'published_by_id' => $admin->id,
            'published_at' => now(),
            'unpublished_at' => null,
            'rejection_reason' => null,
        ]);
    }

    private function attachRevisionSnapshots(Quiz $quiz): Quiz
    {
        $quiz->setRelation(
            'latestRevision',
            QuizRevision::query()
                ->where('quiz_id', $quiz->id)
                ->orderByDesc('version')
                ->first(),
        );
        $quiz->setRelation(
            'publishedRevision',
            QuizRevision::query()
                ->where('quiz_id', $quiz->id)
                ->where('status', 'published')
                ->orderByDesc('version')
                ->first(),
        );

        return $quiz;
    }

    private function ensureAdmin(): void
    {
        $user = request()->user();

        abort_unless(
            $user && $user->isAdmin(),
            403,
            'Only admins can perform this action.',
        );
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