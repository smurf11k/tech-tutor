<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreQuizAttemptRequest;
use App\Models\Course;
use App\Models\Quiz;
use App\Models\QuizAttempt;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class QuizAttemptController extends Controller
{
    private const MAX_STUDENT_ATTEMPTS = 3;

    public function index(Quiz $quiz): JsonResponse
    {
        $this->authorize('view', $quiz->course);

        return response()->json($quiz->attempts()->with('user')->latest()->get());
    }

    public function store(StoreQuizAttemptRequest $request, Quiz $quiz): JsonResponse
    {
        $user = $this->ensureAccess($request, $quiz);
        $this->ensureAttemptRules($user, $quiz);

        $validated = $request->validated();

        $score = $validated['score'] ?? 0;

        $attempt = QuizAttempt::create([
            'quiz_id' => $quiz->id,
            'user_id' => $user->id,
            'answers' => $validated['answers'],
            'score' => $score,
            'passed' => $score >= $quiz->pass_score,
            'started_at' => $validated['started_at'] ?? now(),
            'completed_at' => $validated['completed_at'] ?? now(),
        ]);

        return response()->json($attempt->load(['quiz', 'user']), 201);
    }

    private function ensureAccess(Request $request, Quiz $quiz): User
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);

        /** @var Course $course */
        $course = $quiz->course;
        $isInstructor = $user->isAdmin() || $user->id === $course->instructor_id;
        $isEnrolled = $course->enrollments()->where('user_id', $user->id)->exists();

        abort_unless($isInstructor || $isEnrolled, 403);

        return $user;
    }

    private function ensureAttemptRules(User $user, Quiz $quiz): void
    {
        $isPrivileged = $user->isAdmin() || $user->id === $quiz->course->instructor_id;

        if ($isPrivileged) {
            return;
        }

        abort_unless($quiz->is_published, 403);

        $attemptCount = QuizAttempt::query()
            ->where('quiz_id', $quiz->id)
            ->where('user_id', $user->id)
            ->count();

        if ($attemptCount >= self::MAX_STUDENT_ATTEMPTS) {
            abort(422, 'Attempt limit reached for this quiz.');
        }
    }
}