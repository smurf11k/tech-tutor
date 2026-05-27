<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreLessonRequest;
use App\Http\Requests\UpdateLessonRequest;
use App\Models\Course;
use App\Models\Lesson;
use App\Models\Module;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\UploadedFile;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class LessonController extends Controller
{
    public function index(Module $module): JsonResponse
    {
        /** @var Course $course */
        $course = $module->course;
        $this->authorize('view', $course);

        $user = request()->user();
        $isInstructor = $user && ($user->isAdmin() || $user->id === $course->instructor_id);

        $lessons = $module->lessons()->get();

        // Filter unpublished lessons for non-instructors
        if (!$isInstructor) {
            $lessons = $lessons->filter(fn($lesson) => $lesson->is_published)->values();
        }

        return response()->json($lessons);
    }

    public function store(StoreLessonRequest $request, Module $module): JsonResponse
    {
        /** @var Course $course */
        $course = $module->course;
        $this->authorize('update', $course);

        $validated = $request->validated();
        $payload = $this->prepareLessonPayload(
            $validated,
            $module,
            null,
            $request->file('video'),
            $request->boolean('remove_video')
        );

        // If position not provided, calculate it based on module content
        $position = $validated['position'] ?? null;
        if ($position === null) {
            $maxLessonPos = $module->lessons()->max('position') ?? -1;
            $maxQuizPos = $module->quizzes()->max('position') ?? -1;
            $position = max($maxLessonPos, $maxQuizPos) + 1;
        }

        $lesson = $module->lessons()->create([
            ...$payload,
            'type' => 'lesson',
            'position' => $position,
        ]);

        return response()->json($lesson, 201);
    }

    public function show(Module $module, Lesson $lesson): JsonResponse
    {
        /** @var Course $course */
        $course = $module->course;
        $this->authorize('view', $course);

        abort_unless($lesson->module_id === $module->id, 404);

        $user = request()->user();
        $isInstructor = $user && ($user->isAdmin() || $user->id === $course->instructor_id);

        // Check if lesson is published for non-instructors
        if (!$isInstructor && !$lesson->is_published) {
            abort(403, 'This lesson is not yet available.');
        }

        return response()->json($lesson);
    }

    public function update(UpdateLessonRequest $request, Module $module, Lesson $lesson): JsonResponse
    {
        /** @var Course $course */
        $course = $module->course;
        $this->authorize('update', $course);

        abort_unless($lesson->module_id === $module->id, 404);

        $validated = $request->validated();
        $payload = $this->prepareLessonPayload(
            $validated,
            $module,
            $lesson,
            $request->file('video'),
            $request->boolean('remove_video')
        );

        // Only admins can directly set is_published
        //TODO: add publish/unpublish request for instructors instead of throwing error when they try to publish
        if (array_key_exists('is_published', $payload) && !$request->user()->isAdmin()) {
            abort(403, 'Only admins can publish/unpublish lessons.');
        }

        $lesson->update($payload);

        return response()->json($lesson->fresh());
    }

    public function destroy(Module $module, Lesson $lesson): Response
    {
        /** @var Course $course */
        $course = $module->course;
        $this->authorize('delete', $course);

        abort_unless($lesson->module_id === $module->id, 404);

        if ($lesson->video_path) {
            Storage::disk('public')->delete($lesson->video_path);
        }

        $lesson->delete();

        return response()->noContent();
    }

    /**
     * @param  array<string, mixed>  $validated
     * @return array<string, mixed>
     */
    private function prepareLessonPayload(
        array $validated,
        Module $module,
        ?Lesson $lesson = null,
        ?UploadedFile $videoFile = null,
        bool $removeVideo = false,
    ): array {
        $payload = $validated;

        $payload['type'] = 'lesson';

        unset($payload['video'], $payload['video_name'], $payload['remove_video']);

        if ($removeVideo) {
            if ($lesson?->video_path) {
                Storage::disk('public')->delete($lesson->video_path);
            }

            $payload['video_url'] = null;
            $payload['video_path'] = null;

            return $payload;
        }

        if ($videoFile instanceof UploadedFile) {
            if ($lesson?->video_path) {
                Storage::disk('public')->delete($lesson->video_path);
            }

            $videoName = $this->resolveVideoFileName($validated, $module, $videoFile);
            $videoPath = $this->storeLessonVideo($module, $videoFile, $videoName);

            $payload['video_url'] = asset('storage/' . $videoPath);
            $payload['video_path'] = $videoPath;

            return $payload;
        }

        if (array_key_exists('video_url', $payload) && $payload['video_url'] !== null && $payload['video_url'] !== '') {
            if ($lesson?->video_path) {
                Storage::disk('public')->delete($lesson->video_path);
            }

            $payload['video_path'] = null;

            return $payload;
        }

        return $payload;
    }

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

    private function storeLessonVideo(Module $module, UploadedFile $videoFile, string $videoName): string
    {
        $directory = sprintf('lesson-videos/module-%d', $module->id);

        return $videoFile->storeAs($directory, $videoName, 'public');
    }
}
