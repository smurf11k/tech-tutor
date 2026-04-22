<?php

namespace App\Http\Controllers;

use App\Models\Course;
use App\Models\Enrollment;
use App\Models\User;
use Illuminate\Http\Request;

class EnrollmentController extends Controller
{
    public function index(Course $course)
    {
        $this->authorize('view', $course);

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

    public function destroy(Request $request, Course $course)
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);

        $enrollment = Enrollment::query()
            ->where('user_id', $user->id)
            ->where('course_id', $course->id)
            ->firstOrFail();

        $enrollment->delete();

        return response()->noContent();
    }
}