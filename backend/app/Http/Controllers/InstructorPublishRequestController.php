<?php

namespace App\Http\Controllers;

use App\Models\Course;
use App\Models\PublishRequest;
use App\Models\User;
use App\Notifications\CourseSubmittedForApprovalNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InstructorPublishRequestController extends Controller
{
    public function store(Request $request, Course $course): JsonResponse
    {
        $user = $request->user();

        $this->authorize('update', $course);

        if ($course->is_published) {
            abort(422, 'This course is already published.');
        }

        $alreadyPending = PublishRequest::query()
            ->where('course_id', $course->id)
            ->where('status', 'pending')
            ->exists();

        if ($alreadyPending) {
            abort(422, 'A publish request for this course is already pending review.');
        }

        $publishRequest = PublishRequest::create([
            'course_id' => $course->id,
            'requester_id' => $user->id,
            'status' => 'pending',
        ]);

        $admins = User::query()
            ->where('role', 'admin')
            ->where('id', '!=', $user->id)
            ->get();

        foreach ($admins as $admin) {
            if ($admin->canReceiveEmailNotification('course_submitted')) {
                $admin->notify(new CourseSubmittedForApprovalNotification($publishRequest));
            }
        }

        return response()->json($publishRequest, 201);
    }
}