<?php

namespace App\Http\Controllers;

use App\Http\Requests\ModerateQueuedReviewRequest;
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

        return response()->json($reviews);
    }

    public function updateReview(ModerateQueuedReviewRequest $request, Review $review): JsonResponse
    {
        abort_unless($request->user()?->isAdmin(), 403);

        $review->update([
            'is_published' => $request->validated()['is_published'],
        ]);

        return response()->json($review->fresh()->load(['course', 'user']));
    }
}
