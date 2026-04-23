<?php

namespace App\Http\Controllers;

use App\Models\Course;
use App\Models\Enrollment;
use App\Models\User;
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

    public function store(Request $request, Course $course)
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);

        $enrollment = Enrollment::firstOrCreate([
            'user_id' => $user->id,
            'course_id' => $course->id,
        ], [
            'status' => 'active',
            'enrolled_at' => now(),
        ]);

        return response()->json($enrollment->load(['user', 'course']), 201);
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
}