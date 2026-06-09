<?php

namespace App\Services;

use App\Models\Course;
use App\Models\Enrollment;
use App\Models\User;
use App\Notifications\EnrollmentCreatedNotification;
use App\Notifications\NewEnrollmentNotification;

class CourseEnrollmentService
{
    public function enroll(User $user, Course $course): Enrollment
    {
        $enrollment = Enrollment::firstOrCreate([
            'user_id' => $user->id,
            'course_id' => $course->id,
        ], [
            'status' => 'active',
            'enrolled_at' => now(),
        ]);

        if ($enrollment->wasRecentlyCreated) {
            if ($user->email_notifications_enabled) {
                $user->notify(new EnrollmentCreatedNotification($enrollment->load('course')));
            }

            $instructor = $course->instructor;

            if ($instructor && $instructor->canReceiveEmailNotification('new_enrollment')) {
                $instructor->notify(new NewEnrollmentNotification($enrollment));
            }
        }

        return $enrollment->load(['user', 'course']);
    }
}
