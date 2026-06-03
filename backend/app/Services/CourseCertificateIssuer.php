<?php

namespace App\Services;

use App\Models\Course;
use App\Models\CourseCertificate;
use App\Models\User;
use App\Notifications\CourseCertificateIssuedNotification;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class CourseCertificateIssuer
{
    public function __construct(
        private readonly CourseProgressCalculator $progressCalculator,
        private readonly CertificateService $certificateService
    ) {}

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
            $certificatePath = $this->certificateService->store($course, $user);
            $user->notify(new CourseCertificateIssuedNotification($certificate, $certificatePath));
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

        $course->load([
            'modules.lessons' => fn ($query) => $query->where('is_published', true),
            'modules.quizzes' => fn ($query) => $query->where('is_published', true),
        ]);

        return $this->progressCalculator->forUser($course, $user)['is_complete'];
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