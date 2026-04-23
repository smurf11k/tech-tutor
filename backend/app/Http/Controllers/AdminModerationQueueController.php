<?php

namespace App\Http\Controllers;

use App\Http\Requests\ModerateQueuedCommentRequest;
use App\Http\Requests\ModerateQueuedReviewRequest;
use App\Models\Comment;
use App\Models\Review;
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
            ->latest()
            ->get()
            ->map(fn (Review $review): array => [
                'content_type' => 'review',
                'review' => $review->toArray(),
            ]);

        $comments = Comment::query()
            ->with(['lesson.module.course', 'user'])
            ->where('is_published', false)
            ->latest()
            ->get()
            ->map(fn (Comment $comment): array => [
                'content_type' => 'comment',
                'comment' => $comment->toArray(),
            ]);

        return response()->json(
            $reviews
                ->concat($comments)
                ->sortByDesc(fn (array $item): string => $item['review']['created_at'] ?? $item['comment']['created_at'])
                ->values()
        );
    }

    public function updateReview(ModerateQueuedReviewRequest $request, Review $review): JsonResponse
    {
        abort_unless($request->user()?->isAdmin(), 403);

        $review->update([
            'is_published' => $request->validated()['is_published'],
        ]);

        return response()->json($review->fresh()->load(['course', 'user']));
    }

    public function updateComment(ModerateQueuedCommentRequest $request, Comment $comment): JsonResponse
    {
        abort_unless($request->user()?->isAdmin(), 403);

        $comment->update([
            'is_published' => $request->validated()['is_published'],
        ]);

        return response()->json($comment->fresh()->load(['lesson.module.course', 'user']));
    }
}
