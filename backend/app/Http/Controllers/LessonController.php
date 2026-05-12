<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreLessonRequest;
use App\Http\Requests\UpdateLessonRequest;
use App\Models\Course;
use App\Models\Lesson;
use App\Models\Module;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Storage;

class LessonController extends Controller
{
    public function index(Module $module): JsonResponse
    {
        /** @var Course $course */
        $course = $module->course;
        $this->authorize('view', $course);

        return response()->json($module->lessons()->get());
    }

    public function store(StoreLessonRequest $request, Module $module): JsonResponse
    {
        /** @var Course $course */
        $course = $module->course;
        $this->authorize('update', $course);

        $validated = $request->validated();
        $lessonFile = $request->file('lesson_file');
        $payload = $this->prepareLessonPayload($validated, $module, null, $lessonFile);

        $lesson = $module->lessons()->create([
            ...$payload,
            'type' => $validated['type'] ?? 'text',
            'position' => $validated['position'] ?? 0,
            'is_preview' => $validated['is_preview'] ?? false,
        ]);

        return response()->json($lesson, 201);
    }

    public function show(Module $module, Lesson $lesson): JsonResponse
    {
        /** @var Course $course */
        $course = $module->course;
        $this->authorize('view', $course);

        abort_unless($lesson->module_id === $module->id, 404);

        return response()->json($lesson);
    }

    public function update(UpdateLessonRequest $request, Module $module, Lesson $lesson): JsonResponse
    {
        /** @var Course $course */
        $course = $module->course;
        $this->authorize('update', $course);

        abort_unless($lesson->module_id === $module->id, 404);

        $validated = $request->validated();
        $lessonFile = $request->file('lesson_file');
        $payload = $this->prepareLessonPayload($validated, $module, $lesson, $lessonFile);

        $lesson->update($payload);

        return response()->json($lesson->fresh());
    }

    public function destroy(Module $module, Lesson $lesson): Response
    {
        /** @var Course $course */
        $course = $module->course;
        $this->authorize('delete', $course);

        abort_unless($lesson->module_id === $module->id, 404);

        $this->deleteLessonFile($lesson);

        $lesson->delete();

        return response()->noContent();
    }

    public function downloadAttachment(Lesson $lesson)
    {
        /** @var Course $course */
        $course = $lesson->module->course;
        $this->authorize('view', $course);

        if (blank($lesson->file_path)) {
            abort(404);
        }

        if (filter_var($lesson->file_path, FILTER_VALIDATE_URL)) {
            return redirect()->away($lesson->file_path);
        }

        if (!Storage::disk('public')->exists($lesson->file_path)) {
            abort(404);
        }

        $stream = Storage::disk('public')->readStream($lesson->file_path);

        if ($stream === false) {
            abort(404);
        }

        $filename = basename($lesson->file_path);

        return response()->streamDownload(function () use ($stream): void {
            fpassthru($stream);

            if (is_resource($stream)) {
                fclose($stream);
            }
        }, $filename);
    }

    /**
     * @param  array<string, mixed>  $validated
     * @return array<string, mixed>
     */
    private function prepareLessonPayload(array $validated, Module $module, ?Lesson $lesson, ?UploadedFile $lessonFile): array
    {
        $payload = $validated;
        unset($payload['lesson_file']);

        $effectiveType = (string) ($payload['type'] ?? $lesson?->type ?? 'text');
        $existingFilePath = $lesson?->file_path;

        if ($effectiveType !== 'file') {
            $this->deleteLessonFile($lesson);
            $payload['file_path'] = null;

            return $payload;
        }

        if ($lessonFile !== null) {
            $this->deleteLessonFile($lesson);
            $payload['file_path'] = $lessonFile->storePublicly(
                "lesson-files/module-{$module->id}",
                'public'
            );

            return $payload;
        }

        $manualFilePath = isset($payload['file_path']) && is_string($payload['file_path'])
            ? trim($payload['file_path'])
            : '';

        $payload['file_path'] = $manualFilePath !== ''
            ? $manualFilePath
            : $existingFilePath;

        return $payload;
    }

    private function deleteLessonFile(?Lesson $lesson): void
    {
        if ($lesson === null || blank($lesson->file_path) || filter_var($lesson->file_path, FILTER_VALIDATE_URL)) {
            return;
        }

        Storage::disk('public')->delete($lesson->file_path);
    }
}