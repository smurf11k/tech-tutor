<?php

namespace App\Http\Controllers;

use App\Http\Requests\ModeratePublishRequestRequest;
use App\Http\Requests\ModerateQueuedCommentRequest;
use App\Http\Requests\ModerateQueuedReviewRequest;
use App\Models\Comment;
use App\Models\PublishRequest;
use App\Models\Review;
use App\Notifications\PublishRequestHandledNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
class AdminModerationQueueController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()?->isAdmin(), 403);

        $reviews = Review::query()
            ->with(['course', 'user'])
            ->where('is_published', false)
            ->whereNull('moderated_at')
            ->latest()
            ->get()
            ->map(fn (Review $review): array => [
                'content_type' => 'review',
                'review' => $review->toArray(),
            ]);

        $comments = Comment::query()
            ->with(['lesson.module.course', 'user'])
            ->where('is_published', false)
            ->whereNull('moderated_at')
            ->latest()
            ->get()
            ->map(fn (Comment $comment): array => [
                'content_type' => 'comment',
                'comment' => $comment->toArray(),
            ]);

        $publishRequests = PublishRequest::query()
            ->with(['course.instructor', 'requester'])
            ->where('status', 'pending')
            ->latest()
            ->get()
            ->map(fn (PublishRequest $publishRequest): array => [
                'content_type' => 'publish_request',
                'publish_request' => $publishRequest->toArray(),
            ]);

        return response()->json(
            $reviews
                ->concat($comments)
                ->concat($publishRequests)
                ->sortByDesc(fn (array $item): string => $this->queueTimestamp($item))
                ->values()
        );
    }

    public function updateReview(ModerateQueuedReviewRequest $request, Review $review): JsonResponse
    {
        abort_unless($request->user()?->isAdmin(), 403);

        $review->update([
            'is_published' => $request->validated()['is_published'],
            'moderated_at' => now(),
        ]);

        return response()->json($review->fresh()->load(['course', 'user']));
    }

    public function updateComment(ModerateQueuedCommentRequest $request, Comment $comment): JsonResponse
    {
        abort_unless($request->user()?->isAdmin(), 403);

        $comment->update([
            'is_published' => $request->validated()['is_published'],
            'moderated_at' => now(),
        ]);

        return response()->json($comment->fresh()->load(['lesson.module.course', 'user']));
    }

    public function updatePublishRequest(
        ModeratePublishRequestRequest $request,
        PublishRequest $publishRequest,
    ): JsonResponse {
        abort_unless($publishRequest->status === 'pending', 422, 'This publish request has already been handled.');

        $validated = $request->validated();
        $admin = $request->user();

        if ($validated['action'] === 'accept') {
            $course = $publishRequest->course;
            $course->update([
                'is_published' => true,
                'published_at' => $course->published_at ?? now(),
            ]);

            $publishRequest->update([
                'status' => 'accepted',
                'declined_reason' => null,
                'handled_by' => $admin->id,
                'handled_at' => now(),
            ]);
        } else {
            $publishRequest->update([
                'status' => 'declined',
                'declined_reason' => $validated['declined_reason'] ?? null,
                'handled_by' => $admin->id,
                'handled_at' => now(),
            ]);
        }

        $publishRequest->load(['course', 'requester']);
        $publishRequest->requester?->notify(new PublishRequestHandledNotification($publishRequest));

        return response()->json($publishRequest->fresh()->load(['course.instructor', 'requester']));
    }

    /**
     * @param  array<string, mixed>  $item
     */
    private function queueTimestamp(array $item): string
    {
        return $item['review']['created_at']
            ?? $item['comment']['created_at']
            ?? $item['publish_request']['created_at']
            ?? '';
    }
}
