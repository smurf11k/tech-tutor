<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreCommentRequest;
use App\Http\Requests\UpdateCommentRequest;
use App\Models\Comment;
use App\Models\Course;
use App\Models\Lesson;
use App\Models\User;
use App\Notifications\CommentReplyNotification;
use App\Notifications\NewCommentNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class CommentController extends Controller
{
    public function index(Request $request, Lesson $lesson): JsonResponse
    {
        $course = $this->resolveCourse($lesson);
        $this->authorize('view', $course);

        // Load only top-level comments (parent_comment_id is null)
        $comments = $lesson->comments()
            ->whereNull('parent_comment_id')
            ->with(['user', 'replies.user']);

        $user = $request->user();
        $isAdmin = $user?->isAdmin();
        $isInstructor = $user && ($isAdmin || $user->id === $course->instructor_id);

        // Instructors and admins see all comments; others see published OR their own comments
        if (!$isInstructor && !$isAdmin) {
            $comments->where(function ($query) use ($user) {
                $query->where('is_published', true)
                    ->orWhere('user_id', $user->id);
            })->whereHas('lesson', fn($q) => $q->where('is_published', true));
        }

        return response()->json($comments->get());
    }

    public function store(StoreCommentRequest $request, Lesson $lesson): JsonResponse
    {
        $course = $this->resolveCourse($lesson);
        $this->ensureAccess($request, $course);

        $validated = $request->validated();
        $parentCommentId = $validated['parent_comment_id'] ?? null;
        $parentComment = null;

        // If replying to a comment, verify it exists in this lesson
        if ($parentCommentId) {
            $parentComment = Comment::where('id', $parentCommentId)
                ->where('lesson_id', $lesson->id)
                ->firstOrFail();
        }

        $comment = $lesson->comments()->create([
            'user_id' => $request->user()->id,
            'body' => $validated['body'],
            'parent_comment_id' => $parentCommentId,
            'is_published' => true,
        ]);

        $comment->load(['user', 'lesson']);

        if ($parentComment) {
            $parentComment->load('user');
            if ($parentComment->user->canReceiveEmailNotification('comment_reply')) {
                $parentComment->user->notify(new CommentReplyNotification($comment, $course));
            }
        } else {
            $instructor = $course->instructor;

            if ($instructor && $instructor->canReceiveEmailNotification('new_comment')) {
                $instructor->notify(new NewCommentNotification($comment, $course));
            }

            $this->notifyThreadParticipants($comment, $course, $request->user()->id);
        }

        return response()->json($comment->load(['lesson', 'user', 'replies.user']), 201);
    }

    public function update(UpdateCommentRequest $request, Lesson $lesson, Comment $comment): JsonResponse
    {
        $course = $this->resolveCourse($lesson);
        $this->authorizeCommentManagement($request, $lesson, $comment, $course);

        $validated = $request->validated();

        $user = $request->user();
        $isAdmin = $user->isAdmin();
        $isInstructor = $isAdmin || $user->id === $course->instructor_id;

        // Only admins and instructors can publish/unpublish
        if (!$isAdmin && !$isInstructor) {
            unset($validated['is_published']);
        }

        $comment->update($validated);

        return response()->json($comment->fresh()->load(['lesson', 'user']));
    }

    public function destroy(Request $request, Lesson $lesson, Comment $comment): Response
    {
        $course = $this->resolveCourse($lesson);
        $this->authorizeCommentManagement($request, $lesson, $comment, $course);

        $comment->delete();

        return response()->noContent();
    }

    public function instructorPendingComments(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user instanceof User && ($user->isAdmin() || $user->isInstructor()), 403);

        $query = Comment::with(['user', 'lesson.module.course', 'replies'])
            ->whereNull('parent_comment_id')
            ->latest();

        if (!$user->isAdmin()) {
            $query->whereHas('lesson.module.course', function ($q) use ($user) {
                $q->where('instructor_id', $user->id);
            });
        }

        $comments = $query->get()
            ->filter(fn (Comment $comment) => $comment->replies->isEmpty())
            ->groupBy(function ($comment) {
                return $comment->lesson->module->course->id;
            })
            ->map(function ($courseComments) {
                return $courseComments->groupBy(function ($comment) {
                    return $comment->lesson_id;
                });
            });

        return response()->json($comments);
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

        // Allow instructors/admins of the course OR enrolled students to comment
        abort_unless($isInstructor || $isEnrolled, 403);
    }

    private function authorizeOwnerOrAdmin(Request $request, Lesson $lesson, Comment $comment): void
    {
        abort_unless($comment->lesson_id === $lesson->id, 404);

        $isAdmin = $request->user()->isAdmin();
        $isOwner = $request->user()->id === $comment->user_id;

        abort_unless($isAdmin || $isOwner, 403);
    }

    private function authorizeCommentManagement(Request $request, Lesson $lesson, Comment $comment, Course $course): void
    {
        abort_unless($comment->lesson_id === $lesson->id, 404);

        $user = $request->user();
        $isAdmin = $user->isAdmin();
        $isInstructor = $user->id === $course->instructor_id;
        $isOwner = $user->id === $comment->user_id;

        // Allow: comment owner, course instructor, or admin
        abort_unless($isOwner || $isInstructor || $isAdmin, 403);
    }

    private function notifyThreadParticipants(Comment $newComment, Course $course, int $excludeUserId): void
    {
        $participants = User::query()
            ->whereHas('comments', fn($query) => $query
                ->where('lesson_id', $newComment->lesson_id)
                ->whereNull('parent_comment_id')
                ->where('user_id', '!=', $excludeUserId)
            )
            ->where('id', '!=', $excludeUserId)
            ->distinct()
            ->get();

        foreach ($participants as $participant) {
            if ($participant->canReceiveEmailNotification('thread')) {
                $participant->notify(new NewCommentNotification($newComment, $course));
            }
        }
    }
}
