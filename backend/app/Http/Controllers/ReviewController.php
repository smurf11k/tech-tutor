<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreReviewRequest;
use App\Http\Requests\UpdateReviewRequest;
use App\Models\Course;
use App\Models\Review;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

class ReviewController extends Controller
{
    public function index(Request $request, Course $course): JsonResponse
    {
        $this->authorize('view', $course);

        $reviews = $course->reviews()
            ->with('user')
            ->latest();

        $user = $request->user();

        // If the requester is not an admin (or unauthenticated), only show published reviews
        if (!($user instanceof User) || !$user->isAdmin()) {
            $reviews->where('is_published', true);
        }

        return response()->json($reviews->get());
    }

    public function store(StoreReviewRequest $request, Course $course): JsonResponse
    {
        $this->ensureAccess($request, $course);

        $validated = $request->validated();

        $review = Review::updateOrCreate(
            [
                'course_id' => $course->id,
                'user_id' => $request->user()->id,
            ],
            [
                'rating' => $validated['rating'],
                'comment' => $validated['comment'] ?? null,
                'is_published' => false,
            ]
        );

        return response()->json($review->load(['course', 'user']), 201);
    }

    public function update(UpdateReviewRequest $request, Course $course, Review $review): JsonResponse
    {
        $this->authorizeOwnerOrAdmin($request, $course, $review);

        $validated = $request->validated();

        if (!$request->user()->isAdmin()) {
            unset($validated['is_published']);
        }

        $review->update($validated);

        return response()->json($review->fresh()->load(['course', 'user']));
    }

    public function destroy(Request $request, Course $course, Review $review): Response
    {
        $this->authorizeOwnerOrAdmin($request, $course, $review);

        $review->delete();

        return response()->noContent();
    }

    private function ensureAccess(Request $request, Course $course): void
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);

        $isAdmin = $user->isAdmin();
        $isInstructorOwner = $user->id === $course->instructor_id;
        $isEnrolled = $course->enrollments()->where('user_id', $user->id)->exists();

        // Instructors may not review their own course unless they are admin
        if ($isInstructorOwner && !$isAdmin) {
            abort(403);
        }

        abort_unless($isAdmin || $isEnrolled, 403);
    }

    private function authorizeOwnerOrAdmin(Request $request, Course $course, Review $review): void
    {
        abort_unless($review->course_id === $course->id, 404);
        $user = $request->user();
        abort_unless($user instanceof User, 401);

        $isAdmin = $user->isAdmin();
        $isOwner = $user->id === $review->user_id;

        // Allow owners to update their reviews, but only admins may delete reviews
        if ($request->isMethod('delete')) {
            abort_unless($isAdmin, 403);
        }

        abort_unless($isAdmin || $isOwner, 403);
    }
}
