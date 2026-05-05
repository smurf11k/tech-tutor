<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreProgressRequest;
use App\Http\Requests\UpdateProgressRequest;
use App\Models\Course;
use App\Models\Lesson;
use App\Models\Progress;
use App\Models\User;
use App\Services\CourseCertificateIssuer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProgressController extends Controller
{
    public function store(StoreProgressRequest $request, Lesson $lesson, CourseCertificateIssuer $issuer): JsonResponse
    {
        $this->ensureAccess($request, $lesson);

        $validated = $request->validated();
        $user = $request->user();

        $progress = Progress::updateOrCreate(
            [
                'user_id' => $user->id,
                'lesson_id' => $lesson->id,
            ],
            [
                'progress_percent' => $validated['progress_percent'],
                'completed_at' => $validated['progress_percent'] >= 100 ? now() : null,
            ]
        );

        $certificate = $validated['progress_percent'] >= 100
            ? $issuer->issueIfEligible($lesson->module->course, $user)
            : null;

        return response()->json([
            'progress' => $progress->load(['user', 'lesson']),
            'certificate' => $certificate,
        ], 201);
    }

    public function update(UpdateProgressRequest $request, Lesson $lesson, CourseCertificateIssuer $issuer): JsonResponse
    {
        $this->ensureAccess($request, $lesson);

        $validated = $request->validated();
        $user = $request->user();

        $progress = Progress::updateOrCreate(
            [
                'user_id' => $user->id,
                'lesson_id' => $lesson->id,
            ],
            [
                'progress_percent' => $validated['progress_percent'],
                'completed_at' => $validated['progress_percent'] >= 100 ? now() : null,
            ]
        );

        $certificate = $validated['progress_percent'] >= 100
            ? $issuer->issueIfEligible($lesson->module->course, $user)
            : null;

        return response()->json([
            'progress' => $progress->load(['user', 'lesson']),
            'certificate' => $certificate,
        ]);
    }

    private function ensureAccess(Request $request, Lesson $lesson): void
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);

        /** @var Course $course */
        $course = $lesson->module->course;

        $isInstructor = $user->isAdmin() || $user->id === $course->instructor_id;
        $isEnrolled = $course->enrollments()->where('user_id', $user->id)->exists();

        abort_unless($isInstructor || $isEnrolled, 403);
    }
}
