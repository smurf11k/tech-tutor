<?php

namespace App\Services;

use App\Models\Course;
use App\Models\CourseCertificate;
use App\Models\User;
use App\Notifications\CourseCertificateIssuedNotification;
use Illuminate\Support\Str;

class CourseCertificateIssuer
{
    public function issueIfEligible(Course $course, User $user): ?CourseCertificate
    {
        if (! $this->isEligible($course, $user)) {
            return null;
        }

        $certificate = CourseCertificate::firstOrCreate(
            [
                'course_id' => $course->id,
                'user_id' => $user->id,
            ],
            [
                'certificate_number' => $this->makeCertificateNumber($course, $user),
                'issued_at' => now(),
            ]
        )->load(['course.instructor', 'user']);

        if ($certificate->wasRecentlyCreated) {
            $user->notify(new CourseCertificateIssuedNotification($certificate));
        }

        return $certificate;
    }

    public function isEligible(Course $course, User $user): bool
    {
        $isEnrolled = $course->enrollments()
            ->where('user_id', $user->id)
            ->where('status', 'active')
            ->exists();

        if (! $isEnrolled) {
            return false;
        }

        $lessonIds = $course->modules()
            ->with('lessons:id,module_id')
            ->get()
            ->flatMap(fn ($module) => $module->lessons->pluck('id'))
            ->values();

        if ($lessonIds->isEmpty()) {
            return false;
        }

        $completedLessonsCount = $user->progressEntries()
            ->whereIn('lesson_id', $lessonIds)
            ->whereNotNull('completed_at')
            ->count();

        return $completedLessonsCount >= $lessonIds->count();
    }

    private function makeCertificateNumber(Course $course, User $user): string
    {
        return sprintf(
            'TT-%s-%s-%s-%s',
            $course->id,
            $user->id,
            now()->format('Ymd'),
            Str::upper(Str::random(6))
        );
    }
}
