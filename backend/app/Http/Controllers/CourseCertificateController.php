<?php

namespace App\Http\Controllers;

use App\Models\Course;
use App\Models\CourseCertificate;
use App\Models\User;
use App\Services\CertificateService;
use App\Services\CourseCertificateIssuer;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class CourseCertificateController extends Controller
{
    public function __construct(
        private readonly CertificateService $certificateService
    ) {
    }

    /**
     * List all certificates for the authenticated user
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);

        $certificates = CourseCertificate::with(['course.instructor', 'user'])
            ->where('user_id', $user->id)
            ->latest('issued_at')
            ->get();

        return response()->json($certificates);
    }

    /**
     * Show a specific certificate
     */
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

    /**
     * Download the PDF certificate
     */
    public function download(Request $request, Course $course): StreamedResponse|JsonResponse
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);

        $certificate = CourseCertificate::where('course_id', $course->id)
            ->where('user_id', $user->id)
            ->first();

        abort_if($certificate === null, 404, 'Certificate not found');

        $pdfContent = $this->certificateService->getStoredPdf($course, $user);

        if ($pdfContent === null) {
            $this->certificateService->store($course, $user);
            $pdfContent = $this->certificateService->getStoredPdf($course, $user);
        }

        abort_unless($pdfContent !== null, 500, 'Failed to generate certificate');

        return response()->streamDownload(
            static function () use ($pdfContent): void {
                echo $pdfContent;
            },
            'certificate-' . $course->slug . '.pdf',
            ['Content-Type' => 'application/pdf']
        );
    }

    /**
     * Issue a new certificate if eligible
     */
    public function store(
        Request $request,
        Course $course,
        CourseCertificateIssuer $issuer
    ): JsonResponse {
        $user = $request->user();
        abort_unless($user instanceof User, 401);

        //TODO: make better instructor/admin check

        // Prevent instructors from issuing their own certificate unless admin
        abort_if($user->id === $course->instructor_id && !$user->isAdmin(), 403);

        // Prevent duplicate certificates
        $exists = CourseCertificate::query()
            ->where('course_id', $course->id)
            ->where('user_id', $user->id)
            ->exists();

        abort_if($exists, 409, 'Certificate already issued');

        $certificate = $issuer->issueIfEligible($course, $user);

        if ($certificate === null) {
            return response()->json([
                'message' => 'Course is not complete yet.',
            ], 422);
        }

        return response()->json($certificate, $certificate->wasRecentlyCreated ? 201 : 200);
    }
}
