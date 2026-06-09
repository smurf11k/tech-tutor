<?php

namespace App\Http\Controllers;

use App\Http\Requests\ModeratePublishRequestRequest;
use App\Http\Requests\ModerateLessonRevisionRequest;
use App\Http\Requests\ModerateQuizRevisionRequest;
use App\Http\Requests\ModerateQueuedReviewRequest;
use App\Models\LessonRevision;
use App\Models\PublishRequest;
use App\Models\QuizRevision;
use App\Models\Review;
use App\Notifications\PublishRequestHandledNotification;
use App\Notifications\ReviewDeclinedNotification;
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
            ->map(fn(Review $review): array => [
                'content_type' => 'review',
                'review' => $review->toArray(),
            ]);

        $publishRequests = PublishRequest::query()
            ->with(['course.instructor', 'requester'])
            ->where('status', 'pending')
            ->latest()
            ->get()
            ->map(fn(PublishRequest $publishRequest): array => [
                'content_type' => 'publish_request',
                'publish_request' => array_merge(
                    $publishRequest->toArray(),
                    ['request_type' => $publishRequest->request_type ?? $publishRequest->type ?? 'publish']
                ),
            ]);

        $lessonRevisions = LessonRevision::query()
            ->with(['lesson.module.course', 'author'])
            ->whereIn('status', ['pending_review', 'pending_unpublish'])
            ->latest()
            ->get()
            ->map(fn(LessonRevision $lessonRevision): array => [
                'content_type' => 'lesson_revision',
                'lesson_revision' => $lessonRevision->toArray(),
            ]);

        $quizRevisions = QuizRevision::query()
            ->with(['quiz.module.course', 'author'])
            ->whereIn('status', ['pending_review', 'pending_unpublish'])
            ->latest()
            ->get()
            ->map(fn(QuizRevision $quizRevision): array => [
                'content_type' => 'quiz_revision',
                'quiz_revision' => $quizRevision->toArray(),
            ]);

        return response()->json(
            $reviews
                ->concat($publishRequests)
                ->concat($lessonRevisions)
                ->concat($quizRevisions)
                ->sortByDesc(fn(array $item): string => $this->queueTimestamp($item))
                ->values()
        );
    }

    public function updateReview(ModerateQueuedReviewRequest $request, Review $review): JsonResponse
    {
        abort_unless($request->user()?->isAdmin(), 403);

        $validated = $request->validated();

        if ($validated['is_published'] === false) {
            $reviewer = $review->user;
            if ($reviewer && $reviewer->canReceiveEmailNotification('review_declined')) {
                $reviewer->notify(new ReviewDeclinedNotification($review, $validated['declined_reason'] ?? null));
            }
            $review->delete();

            return response()->json(null, 204);
        }

        $review->update([
            'is_published' => true,
            'moderated_at' => now(),
        ]);

        return response()->json($review->fresh()->load(['course', 'user']));
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

    public function updateLessonRevision(
        ModerateLessonRevisionRequest $request,
        LessonRevision $lessonRevision,
    ): JsonResponse {
        abort_unless($request->user()?->isAdmin(), 403);

        $validated = $request->validated();
        $lesson = $lessonRevision->lesson;
        abort_unless($lesson !== null, 404);

        if ($validated['action'] === 'accept' && $lessonRevision->status === 'pending_unpublish') {
            $lesson->update([
                'title' => $lessonRevision->title,
                'slug' => $lessonRevision->slug,
                'content' => $lessonRevision->content,
                'video_name' => $lessonRevision->video_name,
                'video_url' => $lessonRevision->video_url,
                'video_path' => $lessonRevision->video_path,
                'estimated_time_minutes' => $lessonRevision->estimated_time_minutes,
                'is_published' => false,
            ]);

            $lessonRevision->update([
                'status' => 'draft',
                'reviewed_by_id' => $request->user()->id,
                'reviewed_at' => now(),
                'published_by_id' => null,
                'published_at' => null,
                'unpublished_at' => now(),
                'rejection_reason' => null,
            ]);
        } elseif ($validated['action'] === 'accept') {
            $lesson->update([
                'title' => $lessonRevision->title,
                'slug' => $lessonRevision->slug,
                'content' => $lessonRevision->content,
                'video_name' => $lessonRevision->video_name,
                'video_url' => $lessonRevision->video_url,
                'video_path' => $lessonRevision->video_path,
                'estimated_time_minutes' => $lessonRevision->estimated_time_minutes,
                'is_published' => true,
            ]);

            $lesson->revisions()
                ->where('status', 'published')
                ->whereKeyNot($lessonRevision->id)
                ->update([
                    'status' => 'draft',
                    'unpublished_at' => now(),
                    'reviewed_by_id' => $request->user()->id,
                    'reviewed_at' => now(),
                ]);

            $lessonRevision->update([
                'status' => 'published',
                'reviewed_by_id' => $request->user()->id,
                'reviewed_at' => now(),
                'published_by_id' => $request->user()->id,
                'published_at' => now(),
                'unpublished_at' => null,
                'rejection_reason' => null,
            ]);
        } else {
            $lessonRevision->update([
                'status' => 'draft',
                'reviewed_by_id' => $request->user()->id,
                'reviewed_at' => now(),
                'rejection_reason' => $validated['declined_reason'] ?? null,
            ]);
        }

        return response()->json($lessonRevision->fresh()->load(['lesson.module.course', 'author', 'reviewedBy', 'publishedBy']));
    }

    public function updateQuizRevision(
        ModerateQuizRevisionRequest $request,
        QuizRevision $quizRevision,
    ): JsonResponse {
        abort_unless($request->user()?->isAdmin(), 403);

        $validated = $request->validated();
        $quiz = $quizRevision->quiz;
        abort_unless($quiz !== null, 404);

        if ($validated['action'] === 'accept' && $quizRevision->status === 'pending_unpublish') {
            $quiz->update([
                'title' => $quizRevision->title,
                'description' => $quizRevision->description,
                'module_id' => $quizRevision->module_id,
                'pass_score' => $quizRevision->pass_score,
                'estimated_time_minutes' => $quizRevision->estimated_time_minutes,
                'time_limit_seconds' => $quizRevision->time_limit_seconds,
                'is_published' => false,
                'position' => $quizRevision->position,
            ]);

            $quizRevision->update([
                'status' => 'draft',
                'reviewed_by_id' => $request->user()->id,
                'reviewed_at' => now(),
                'published_by_id' => null,
                'published_at' => null,
                'unpublished_at' => now(),
                'rejection_reason' => null,
            ]);
        } elseif ($validated['action'] === 'accept') {
            $quiz->update([
                'title' => $quizRevision->title,
                'description' => $quizRevision->description,
                'module_id' => $quizRevision->module_id,
                'pass_score' => $quizRevision->pass_score,
                'estimated_time_minutes' => $quizRevision->estimated_time_minutes,
                'time_limit_seconds' => $quizRevision->time_limit_seconds,
                'is_published' => true,
                'position' => $quizRevision->position,
            ]);

            $quiz->questions()->delete();
            foreach ($quizRevision->questions ?? [] as $index => $question) {
                $quiz->questions()->create([
                    'type' => $question['type'],
                    'prompt' => $question['prompt'],
                    'options' => collect($question['options'] ?? [])
                        ->map(fn(array $option): array => [
                            'key' => trim($option['key']),
                            'text' => $option['text'],
                        ])
                        ->values()
                        ->all(),
                    'correct_answers' => collect($question['options'] ?? [])
                        ->filter(fn(array $option): bool => (bool) ($option['is_correct'] ?? false))
                        ->pluck('key')
                        ->map(fn(string $key): string => trim($key))
                        ->values()
                        ->all(),
                    'points' => $question['points'] ?? 1,
                    'position' => $question['position'] ?? ($index + 1),
                ]);
            }

            $quiz->revisions()
                ->where('status', 'published')
                ->whereKeyNot($quizRevision->id)
                ->update([
                    'status' => 'draft',
                    'unpublished_at' => now(),
                    'reviewed_by_id' => $request->user()->id,
                    'reviewed_at' => now(),
                ]);

            $quizRevision->update([
                'status' => 'published',
                'reviewed_by_id' => $request->user()->id,
                'reviewed_at' => now(),
                'published_by_id' => $request->user()->id,
                'published_at' => now(),
                'unpublished_at' => null,
                'rejection_reason' => null,
            ]);
        } else {
            $quizRevision->update([
                'status' => 'draft',
                'reviewed_by_id' => $request->user()->id,
                'reviewed_at' => now(),
                'rejection_reason' => $validated['declined_reason'] ?? null,
            ]);
        }

        return response()->json($quizRevision->fresh()->load(['quiz.module.course', 'author', 'reviewedBy', 'publishedBy']));
    }

    /**
     * @param  array<string, mixed>  $item
     */
    private function queueTimestamp(array $item): string
    {
        return $item['review']['created_at']
            ?? $item['publish_request']['created_at']
            ?? $item['lesson_revision']['created_at']
            ?? $item['quiz_revision']['created_at']
            ?? '';
    }
}
