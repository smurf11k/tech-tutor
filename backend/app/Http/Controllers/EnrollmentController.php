<?php

namespace App\Http\Controllers;

use App\Models\Course;
use App\Models\Enrollment;
use App\Models\User;
use App\Services\CourseEnrollmentService;
use Illuminate\Http\Request;

class EnrollmentController extends Controller
{
    public function index(Request $request, Course $course)
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);

        $canViewRoster = $user->isAdmin() || $user->id === $course->instructor_id;
        abort_unless($canViewRoster, 403);

        return response()->json($course->enrollments()->with('user')->latest()->get());
    }

    public function store(Request $request, Course $course, CourseEnrollmentService $enrollments)
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);

        if (! $this->canEnrollWithoutPurchase($user, $course) && ! $this->hasPaidForCourse($user, $course)) {
            return response()->json([
                'message' => 'Purchase this course before enrolling.',
            ], 402);
        }

        return response()->json($enrollments->enroll($user, $course), 201);
    }

    public function destroy(Request $request, Course $course, Enrollment $enrollment)
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);

        abort_unless($enrollment->course_id === $course->id, 404);

        $canDelete = $user->isAdmin()
            || $user->id === $enrollment->user_id
            || $user->id === $course->instructor_id;

        abort_unless($canDelete, 403);

        $enrollment->delete();

        return response()->noContent();
    }

    private function canEnrollWithoutPurchase(User $user, Course $course): bool
    {
        return (float) $course->price <= 0
            || $user->isAdmin()
            || $user->id === $course->instructor_id;
    }

    private function hasPaidForCourse(User $user, Course $course): bool
    {
        return $course->payments()
            ->where('user_id', $user->id)
            ->where('status', 'paid')
            ->whereNotNull('paid_at')
            ->exists();
    }
}
