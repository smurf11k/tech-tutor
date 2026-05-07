<?php

namespace App\Services;

use App\Models\Course;
use App\Models\Enrollment;
use App\Models\User;
use App\Notifications\EnrollmentCreatedNotification;

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
            $user->notify(new EnrollmentCreatedNotification($enrollment->load('course')));
        }

        return $enrollment->load(['user', 'course']);
    }
}
