<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreLessonRequest;
use App\Http\Requests\UpdateLessonRequest;
use App\Models\Course;
use App\Models\Lesson;
use App\Models\LessonRevision;
use App\Models\Module;
use App\Models\User;
use App\Notifications\LessonSubmittedForApprovalNotification;
use App\Services\LessonVideoHlsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class LessonController extends Controller
{
    public function __construct(private readonly LessonVideoHlsService $videoService)
    {
    }

    public function index(Module $module): JsonResponse
    {
        /** @var Course $course */
        $course = $module->course;
        $this->authorize('view', $course);

        $user = request()->user();
        $isInstructor = $user && ($user->isAdmin() || $user->id === $course->instructor_id);

        $lessons = $module->lessons()
            ->with(['latestRevision', 'publishedRevision'])
            ->get();

        if (!$isInstructor) {
            $lessons = $lessons->filter(fn(Lesson $lesson) => $lesson->is_published)->values();
        }

        return response()->json($lessons);
    }

    public function store(StoreLessonRequest $request, Module $module): JsonResponse
    {
        /** @var Course $course */
        $course = $module->course;
        $this->authorize('update', $course);

        $validated = $request->validated();
        $revisionStatus = $this->resolveRevisionStatus($validated);

        $payload = $this->prepareLessonPayload(
            $validated,
            $module,
            null,
            $request->file('video'),
            $request->boolean('remove_video'),
            null,
        );

        $position = $validated['position'] ?? null;
        if ($position === null) {
            $maxLessonPos = $module->lessons()->max('position') ?? -1;
            $maxQuizPos = $module->quizzes()->max('position') ?? -1;
            $position = max($maxLessonPos, $maxQuizPos) + 1;
        }

        $lesson = $module->lessons()->create([
            ...$this->lessonSnapshotFromPayload($payload),
            'type' => 'lesson',
            'position' => $position,
            'is_published' => false,
        ]);

        $revision = $this->upsertRevision($lesson, $payload, $revisionStatus, $request->user());

        if ($revisionStatus === 'published') {
            $this->publishRevision($lesson, $revision, $request->user());
        }

        return response()->json($lesson->fresh()->load(['latestRevision', 'publishedRevision']), 201);
    }

    public function show(Module $module, Lesson $lesson): JsonResponse
    {
        /** @var Course $course */
        $course = $module->course;
        $this->authorize('view', $course);

        abort_unless($lesson->module_id === $module->id, 404);

        $user = request()->user();
        $isInstructor = $user && ($user->isAdmin() || $user->id === $course->instructor_id);

        if (!$isInstructor && !$lesson->is_published) {
            abort(403, 'This lesson is not yet available.');
        }

        return response()->json($lesson->load(['latestRevision', 'publishedRevision']));
    }

    public function update(UpdateLessonRequest $request, Module $module, Lesson $lesson): JsonResponse
    {
        /** @var Course $course */
        $course = $module->course;
        $this->authorize('update', $course);

        abort_unless($lesson->module_id === $module->id, 404);

        $validated = $request->validated();
        $revisionStatus = $this->resolveRevisionStatus($validated);
        $editableRevision = $this->currentEditableRevision($lesson);

        $payload = $this->prepareLessonPayload(
            $validated,
            $module,
            $lesson,
            $request->file('video'),
            $request->boolean('remove_video'),
            $editableRevision?->video_path ?? $lesson->video_path,
        );

        if (!$lesson->is_published) {
            $lesson->update($this->lessonSnapshotFromPayload($payload));
        }

        $revision = $this->upsertRevision($lesson, $payload, $revisionStatus, $request->user(), $editableRevision);

        if ($revisionStatus === 'published') {
            $this->publishRevision($lesson, $revision, $request->user());
        } elseif ($revisionStatus === 'pending_review') {
            $this->notifyAdminsOfLessonSubmission($revision);
        }

        return response()->json($lesson->fresh()->load(['latestRevision', 'publishedRevision']));
    }

    public function unpublish(Module $module, Lesson $lesson): JsonResponse
    {
        $this->ensureAdmin();
        abort_unless($lesson->module_id === $module->id, 404);

        $publishedRevision = LessonRevision::query()
            ->where('lesson_id', $lesson->id)
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

        $lesson->update(['is_published' => false]);

        return response()->json($lesson->fresh()->load(['latestRevision', 'publishedRevision']));
    }

    public function destroy(Module $module, Lesson $lesson): Response
    {
        /** @var Course $course */
        $course = $module->course;
        $this->authorize('update', $course);

        abort_unless($lesson->module_id === $module->id, 404);

        $user = request()->user();
        $hasPublishedRevision = LessonRevision::query()
            ->where('lesson_id', $lesson->id)
            ->where('status', 'published')
            ->exists();

        abort_if(
            $user && !$user->isAdmin() && ($lesson->is_published || $hasPublishedRevision),
            409,
            'Published lessons must be unpublished before deletion.',
        );

        $this->deleteStoredVideo($lesson->video_path);
        $lesson->delete();

        return response()->noContent();
    }

    /**
     * @param array<string, mixed> $validated
     * @return array<string, mixed>
     */
    private function prepareLessonPayload(
        array $validated,
        Module $module,
        ?Lesson $lesson = null,
        ?UploadedFile $videoFile = null,
        bool $removeVideo = false,
        ?string $currentVideoPath = null,
    ): array {
        $payload = $validated;

        $payload['type'] = 'lesson';

        unset($payload['video'], $payload['video_name'], $payload['remove_video'], $payload['revision_status']);

        if ($removeVideo) {
            $this->deleteStoredVideo($currentVideoPath);

            $payload['video_url'] = null;
            $payload['video_path'] = null;
            $payload['video_name'] = null;

            return $payload;
        }

        if ($videoFile instanceof UploadedFile) {
            $videoName = $this->resolveVideoFileName($validated, $module, $videoFile);
            $videoDirectory = sprintf('lesson-videos/module-%d/%s', $module->id, pathinfo($videoName, PATHINFO_FILENAME));
            $videoAsset = $this->videoService->queueTranscoding($videoFile, $videoDirectory);

            $this->deleteStoredVideo($currentVideoPath);

            $payload['video_name'] = $videoName;
            $payload['video_url'] = $videoAsset['manifest_url'];
            $payload['video_path'] = $videoAsset['manifest_path'];

            return $payload;
        }

        if (array_key_exists('video_url', $payload) && $payload['video_url'] !== null && $payload['video_url'] !== '') {
            $this->deleteStoredVideo($currentVideoPath);

            $payload['video_path'] = null;
            $payload['video_name'] = null;

            return $payload;
        }

        return $payload;
    }

    /**
     * @param array<string, mixed> $validated
     */
    private function resolveVideoFileName(array $validated, Module $module, UploadedFile $videoFile): string
    {
        $requestedName = (string) ($validated['video_name'] ?? '');

        if ($requestedName !== '') {
            $baseName = pathinfo($requestedName, PATHINFO_FILENAME);
            $extension = strtolower(pathinfo($requestedName, PATHINFO_EXTENSION) ?: $videoFile->getClientOriginalExtension() ?: 'mp4');

            return Str::slug($baseName) . '.' . $extension;
        }

        $extension = strtolower($videoFile->getClientOriginalExtension() ?: $videoFile->extension() ?: 'mp4');
        $timestamp = now()->format('Ymd-His');
        $baseName = Str::slug(implode('-', array_filter([
            $module->course->slug ?? 'course',
            $module->slug ?? 'module',
            $validated['slug'] ?? $validated['title'] ?? 'lesson',
            $timestamp,
        ])));

        return $baseName . '.' . $extension;
    }

    private function deleteStoredVideo(?string $videoPath): void
    {
        if (!$videoPath) {
            return;
        }

        Storage::disk('s3')->deleteDirectory(dirname($videoPath));
    }

    /**
     * @param array<string, mixed> $payload
     * @return array<string, mixed>
     */
    private function lessonSnapshotFromPayload(array $payload): array
    {
        return array_intersect_key($payload, array_flip([
            'title',
            'slug',
            'content',
            'video_name',
            'video_url',
            'video_path',
            'estimated_time_minutes',
            'position',
        ]));
    }

    /**
     * @param array<string, mixed> $validated
     */
    private function resolveRevisionStatus(array $validated): string
    {
        return $validated['revision_status'] ?? 'draft';
    }

    private function currentEditableRevision(Lesson $lesson): ?LessonRevision
    {
        return $lesson->revisions()
            ->whereIn('status', ['draft', 'pending_review'])
            ->latest('version')
            ->first();
    }

    /**
     * @param array<string, mixed> $payload
     */
    private function upsertRevision(
        Lesson $lesson,
        array $payload,
        string $status,
        User $author,
        ?LessonRevision $revision = null,
    ): LessonRevision {
        $source = $revision ?? $lesson;

        $revisionPayload = [
            'lesson_id' => $lesson->id,
            'author_id' => $author->id,
            'version' => $revision?->version ?? (($lesson->revisions()->max('version') ?? 0) + 1),
            'status' => $status,
            'title' => $payload['title'] ?? $lesson->title,
            'slug' => $payload['slug'] ?? $lesson->slug,
            'content' => array_key_exists('content', $payload) ? $payload['content'] : $source->content,
            'video_name' => array_key_exists('video_name', $payload) ? $payload['video_name'] : $source->video_name,
            'video_url' => array_key_exists('video_url', $payload) ? $payload['video_url'] : $source->video_url,
            'video_path' => array_key_exists('video_path', $payload) ? $payload['video_path'] : $source->video_path,
            'estimated_time_minutes' => array_key_exists('estimated_time_minutes', $payload)
                ? $payload['estimated_time_minutes']
                : $source->estimated_time_minutes,
            'is_published' => array_key_exists('is_published', $payload)
                ? (bool) $payload['is_published']
                : (bool) $source->is_published,
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

        return $lesson->revisions()->create($revisionPayload);
    }

    private function publishRevision(Lesson $lesson, LessonRevision $lessonRevision, User $admin): void
    {
        $lesson->update([
            'title' => $lessonRevision->title,
            'slug' => $lessonRevision->slug,
            'content' => $lessonRevision->content,
            'video_name' => $lessonRevision->video_name,
            'video_url' => $lessonRevision->video_url,
            'video_path' => $lessonRevision->video_path,
            'estimated_time_minutes' => $lessonRevision->estimated_time_minutes,
            'is_published' => (bool) $lessonRevision->is_published,
        ]);

        $lesson->revisions()
            ->where('status', 'published')
            ->whereKeyNot($lessonRevision->id)
            ->update([
                'status' => 'draft',
                'unpublished_at' => now(),
                'reviewed_by_id' => $admin->id,
                'reviewed_at' => now(),
            ]);

        $lessonRevision->update([
            'status' => 'published',
            'reviewed_by_id' => $admin->id,
            'reviewed_at' => now(),
            'published_by_id' => $admin->id,
            'published_at' => now(),
            'unpublished_at' => null,
            'rejection_reason' => null,
        ]);
    }

    private function ensureAdmin(): void
    {
        $user = request()->user();

        abort_unless(
            $user && $user->isAdmin(),
            403,
            'Only admins can publish or unpublish lessons.',
        );
    }

    private function notifyAdminsOfLessonSubmission(LessonRevision $lessonRevision): void
    {
        $admins = User::query()
            ->where('role', 'admin')
            ->where('id', '!=', $lessonRevision->author_id)
            ->get();

        foreach ($admins as $admin) {
            if ($admin->canReceiveEmailNotification('lesson_submitted')) {
                $admin->notify(new LessonSubmittedForApprovalNotification($lessonRevision));
            }
        }
    }
}
