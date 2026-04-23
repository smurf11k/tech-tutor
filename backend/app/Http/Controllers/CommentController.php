<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreCommentRequest;
use App\Http\Requests\UpdateCommentRequest;
use App\Models\Comment;
use App\Models\Course;
use App\Models\Lesson;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class CommentController extends Controller
{
    public function index(Request $request, Lesson $lesson): JsonResponse
    {
        $course = $this->resolveCourse($lesson);
        $this->authorize('view', $course);

        $comments = $lesson->comments()->with('user');

        if (! $request->user()->isAdmin()) {
            $comments->where('is_published', true);
        }

        return response()->json($comments->get());
    }

    public function store(StoreCommentRequest $request, Lesson $lesson): JsonResponse
    {
        $course = $this->resolveCourse($lesson);
        $this->ensureAccess($request, $course);

        $comment = $lesson->comments()->create([
            'user_id' => $request->user()->id,
            'body' => $request->validated()['body'],
            'is_published' => false,
        ]);

        return response()->json($comment->load(['lesson', 'user']), 201);
    }

    public function update(UpdateCommentRequest $request, Lesson $lesson, Comment $comment): JsonResponse
    {
        $this->authorizeOwnerOrAdmin($request, $lesson, $comment);

        $validated = $request->validated();

        if (! $request->user()->isAdmin()) {
            unset($validated['is_published']);
        }

        $comment->update($validated);

        return response()->json($comment->fresh()->load(['lesson', 'user']));
    }

    public function destroy(Request $request, Lesson $lesson, Comment $comment): Response
    {
        $this->authorizeOwnerOrAdmin($request, $lesson, $comment);

        $comment->delete();

        return response()->noContent();
    }

    private function resolveCourse(Lesson $lesson): Course
    {
        /** @var Course $course */
        $course = $lesson->module->course;

        return $course;
    }

    private function ensureAccess(Request $request, Course $course): void
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);

        $isInstructor = $user->isAdmin() || $user->id === $course->instructor_id;
        $isEnrolled = $course->enrollments()->where('user_id', $user->id)->exists();

        abort_unless($isInstructor || $isEnrolled, 403);
    }

    private function authorizeOwnerOrAdmin(Request $request, Lesson $lesson, Comment $comment): void
    {
        abort_unless($comment->lesson_id === $lesson->id, 404);

        $isAdmin = $request->user()->isAdmin();
        $isOwner = $request->user()->id === $comment->user_id;

        abort_unless($isAdmin || $isOwner, 403);
    }
}
