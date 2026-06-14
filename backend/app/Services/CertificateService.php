<?php

namespace App\Services;

use App\Models\Course;
use App\Models\User;
use App\Services\StorageUrlService;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\View;

class CertificateService
{
    public function __construct(private readonly StorageUrlService $storageUrlService)
    {
    }

    public function generate(Course $course, User $user): string
    {
        $certificate = $this->buildCertificateData($course, $user);
        $html = View::make('certificates.certificate', $certificate)->render();

        $pdf = $this->createPdf();
        $pdf->loadHtml($html);
        $pdf->setPaper('a4', 'landscape');
        $pdf->render();

        return $pdf->output();
    }

    private function createPdf(): \Dompdf\Dompdf
    {
        $options = new \Dompdf\Options();
        $options->set('defaultFont', 'serif');
        $options->set('isRemoteEnabled', true);
        $options->set('isHtml5ParserEnabled', true);

        return new \Dompdf\Dompdf($options);
    }

    public function store(Course $course, User $user): string
    {
        $pdfContent = $this->generate($course, $user);

        $path = $this->getCertificatePath($user->id, $course->id);

        Storage::disk('local')->put($path, $pdfContent);

        return $path;
    }

    public function getStoredPath(Course $course, User $user): ?string
    {
        $path = $this->getCertificatePath($user->id, $course->id);

        return Storage::disk('local')->exists($path) ? $path : null;
    }

    public function getStoredPdf(Course $course, User $user): ?string
    {
        $path = $this->getStoredPath($course, $user);

        return $path ? Storage::disk('local')->get($path) : null;
    }

    private function getCertificatePath(int $userId, int $courseId): string
    {
        return sprintf('certificates/%d/%d.pdf', $userId, $courseId);
    }

    private function buildCertificateData(Course $course, User $user): array
    {
        $course->loadMissing('instructor');

        $instructor = $course->instructor;
        $signatureImageUrl = null;

        if ($instructor && $instructor->avatar_path) {
            $signatureImageUrl = $this->storageUrlService->publicUrl($instructor->avatar_path);
        }

        return [
            'recipient_name' => $user->name,
            'course_title' => $course->title,
            'completion_date' => now()->toDateString(),
            'organization_name' => config('app.name', 'TechTutor'),
            'logo_url' => null,
            'signature_name' => $instructor->name ?? 'Instructor',
            'signature_role' => 'Instructor',
            'signature_image_url' => $signatureImageUrl,
        ];
    }
}