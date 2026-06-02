<?php

namespace App\Http\Controllers;

use App\Models\Course;
use App\Models\CourseCertificate;
use App\Models\User;
use App\Services\CourseCertificateIssuer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CourseCertificateController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);

        return response()->json(
            CourseCertificate::with(['course.instructor', 'user'])
                ->where('user_id', $user->id)
                ->latest('issued_at')
                ->get()
        );
    }

    public function show(Request $request, CourseCertificate $certificate): JsonResponse
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);

        $certificate->load(['course.instructor', 'user']);

        $canView = $user->isAdmin()
            || $user->id === $certificate->user_id
            || $user->id === $certificate->course->instructor_id;

        abort_unless($canView, 403);

        return response()->json($certificate);
    }

    public function store(Request $request, Course $course, CourseCertificateIssuer $issuer): JsonResponse
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);

        abort_if($user->id === $course->instructor_id && !$user->isAdmin(), 403);

        abort_if(
            CourseCertificate::query()
                ->where('course_id', $course->id)
                ->where('user_id', $user->id)
                ->exists(),
            409,
            'certificate already issued'
        );

        $certificate = $issuer->issueIfEligible($course, $user);

        if ($certificate === null) {
            return response()->json([
                'message' => 'Course is not complete yet.',
            ], 422);
        }

        return response()->json($certificate, $certificate->wasRecentlyCreated ? 201 : 200);
    }
}
