<?php

namespace App\Http\Controllers;

use App\Models\Comment;
use App\Models\Course;
use App\Models\CourseCertificate;
use App\Models\Enrollment;
use App\Models\Payment;
use App\Models\QuizAttempt;
use App\Models\Review;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AdminPlatformDashboardController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        abort_unless($request->user()?->isAdmin(), 403);

        $recentCertificates = CourseCertificate::query()->with(['user', 'course'])
            ->latest('issued_at')
            ->get();
        $payments = Payment::query()->with(['course', 'user'])->latest()->get();
        $paidPayments = $payments->where('status', 'paid');

        return response()->json([
            'summary' => [
                'users_count' => User::query()->count(),
                'students_count' => User::query()->where('role', 'student')->count(),
                'instructors_count' => User::query()->where('role', 'instructor')->count(),
                'admins_count' => User::query()->where('role', 'admin')->count(),
                'banned_users_count' => User::query()->where('is_banned', true)->count(),
                'courses_count' => Course::query()->count(),
                'published_courses_count' => Course::query()->where('is_published', true)->count(),
                'draft_courses_count' => Course::query()->where('is_published', false)->count(),
                'enrollments_count' => Enrollment::query()->count(),
                'certificates_count' => CourseCertificate::query()->count(),
                'quiz_attempts_count' => QuizAttempt::query()->count(),
                'pending_reviews_count' => Review::query()->where('is_published', false)->count(),
                'pending_comments_count' => Comment::query()->where('is_published', false)->count(),
                'payments_count' => $payments->count(),
                'paid_payments_count' => $paidPayments->count(),
                'revenue_total' => number_format((float) $paidPayments->sum('amount'), 2, '.', ''),
            ],
            'payment_statuses' => $this->paymentStatuses($payments),
            'revenue_by_course' => $this->revenueByCourse($paidPayments),
            'recent_certificates' => $recentCertificates,
            'recent_activity' => $this->recentActivity(),
        ]);
    }

    /**
     * @param  Collection<int, Payment>  $payments
     * @return array<int, array<string, mixed>>
     */
    private function paymentStatuses($payments): array
    {
        return $payments
            ->groupBy('status')
            ->map(fn($items, string $status): array => [
                'status' => $status,
                'count' => $items->count(),
                'amount' => number_format((float) $items->sum('amount'), 2, '.', ''),
            ])
            ->values()
            ->all();
    }

    /**
     * @param  Collection<int, Payment>  $payments
     * @return array<int, array<string, mixed>>
     */
    private function revenueByCourse($payments): array
    {
        return $payments
            ->groupBy('course_id')
            ->map(fn($items): array => [
                'course_id' => $items->first()->course_id,
                'course_title' => $items->first()->course?->title,
                'payments_count' => $items->count(),
                'revenue_total' => number_format((float) $items->sum('amount'), 2, '.', ''),
            ])
            ->sortByDesc(fn(array $row): float => (float) $row['revenue_total'])
            ->values()
            ->all();
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function recentActivity(): array
    {
        $activities = collect()
            ->concat($this->activityRows(User::query()->latest()->take(5)->get(), 'user_registered', 'name'))
            ->concat($this->activityRows(Course::query()->latest()->take(5)->get(), 'course_created', 'title'))
            ->concat($this->activityRows(Enrollment::query()->with(['user', 'course'])->latest()->take(5)->get(), 'enrollment_created'))
            ->concat($this->activityRows(Payment::query()->with(['user', 'course'])->latest()->take(5)->get(), 'payment_recorded'))
            ->concat($this->activityRows(CourseCertificate::query()->with(['user', 'course'])->latest()->take(5)->get(), 'certificate_issued'));

        return $activities
            ->sortByDesc('created_at')
            ->take(15)
            ->values()
            ->all();
    }

    public function export(Request $request): StreamedResponse
    {
        abort_unless($request->user()?->isAdmin(), 403);

        return response()->streamDownload(
            function (): void {
                $handle = fopen('php://output', 'w');

                if ($handle === false) {
                    abort(500, 'Unable to open CSV output stream.');
                }

                try {
                    $this->writeRaw($handle, "\xEF\xBB\xBF");
                    $this->writeUsers($handle);
                    $this->writeCourses($handle);
                    $this->writeEnrollments($handle);
                    $this->writePayments($handle);
                } finally {
                    fclose($handle);
                }
            },
            'platform-data-' . now()->format('Y-m-d_H-i-s') . '.csv',
            [
                'Content-Type' => 'text/csv; charset=UTF-8',
                'Cache-Control' => 'no-store, no-cache, must-revalidate, max-age=0',
                'Pragma' => 'no-cache',
                'Expires' => '0',
            ],
        );
    }

    private function writeUsers($handle): void
    {
        $this->writeSection($handle, 'Users');
        $this->writeCsv($handle, ['User ID', 'Name', 'Email', 'Role', 'Created At']);

        User::query()
            ->select(['id', 'name', 'email', 'role', 'created_at'])
            ->orderBy('id')
            ->chunk(500, function ($users) use ($handle): void {
                foreach ($users as $user) {
                    $this->writeCsv($handle, [
                        $user->id,
                        $user->name,
                        $user->email,
                        $user->role,
                        $this->formatDateTime($user->created_at),
                    ]);
                }
            });
    }

    private function writeCourses($handle): void
    {
        $this->writeSection($handle, 'Courses');
        $this->writeCsv($handle, ['Course ID', 'Title', 'Instructor', 'Status', 'Price', 'Created At']);

        Course::query()
            ->select([
                'courses.id',
                'courses.title',
                'users.name as instructor_name',
                'courses.is_published',
                'courses.price',
                'courses.created_at',
            ])
            ->join('users', 'users.id', '=', 'courses.instructor_id')
            ->orderBy('courses.id')
            ->chunk(500, function ($courses) use ($handle): void {
                foreach ($courses as $course) {
                    $this->writeCsv($handle, [
                        $course->id,
                        $course->title,
                        $course->instructor_name,
                        $this->courseStatus($course->is_published),
                        $this->formatPrice($course->price),
                        $this->formatDateTime($course->created_at),
                    ]);
                }
            });
    }

    private function writeEnrollments($handle): void
    {
        $this->writeSection($handle, 'Enrollments');
        $this->writeCsv($handle, ['Enrollment ID', 'User', 'User Email', 'Course', 'Status', 'Enrollment Date']);

        Enrollment::query()
            ->select([
                'enrollments.id',
                'users.name as user_name',
                'users.email as user_email',
                'courses.title as course_title',
                'enrollments.status',
                'enrollments.enrolled_at',
            ])
            ->join('users', 'users.id', '=', 'enrollments.user_id')
            ->join('courses', 'courses.id', '=', 'enrollments.course_id')
            ->orderBy('enrollments.id')
            ->chunk(500, function ($enrollments) use ($handle): void {
                foreach ($enrollments as $enrollment) {
                    $this->writeCsv($handle, [
                        $enrollment->id,
                        $enrollment->user_name,
                        $enrollment->user_email,
                        $enrollment->course_title,
                        $enrollment->status,
                        $this->formatDateTime($enrollment->enrolled_at),
                    ]);
                }
            });
    }

    private function writePayments($handle): void
    {
        $this->writeSection($handle, 'Payments');
        $this->writeCsv($handle, ['Payment ID', 'User', 'User Email', 'Course', 'Amount', 'Currency', 'Status', 'Payment Date']);

        Payment::query()
            ->selectRaw('
                payments.id,
                users.name as user_name,
                users.email as user_email,
                courses.title as course_title,
                payments.amount,
                payments.currency,
                payments.status,
                COALESCE(payments.paid_at, payments.created_at) as payment_date
            ')
            ->join('users', 'users.id', '=', 'payments.user_id')
            ->join('courses', 'courses.id', '=', 'payments.course_id')
            ->orderBy('payments.id')
            ->chunk(500, function ($payments) use ($handle): void {
                foreach ($payments as $payment) {
                    $this->writeCsv($handle, [
                        $payment->id,
                        $payment->user_name,
                        $payment->user_email,
                        $payment->course_title,
                        $this->formatPrice($payment->amount),
                        $payment->currency,
                        $payment->status,
                        $this->formatDateTime($payment->payment_date),
                    ]);
                }
            });
    }

    private function writeSection($handle, string $section): void
    {
        $this->writeCsv($handle, ['Section', $section]);
    }

    private function writeCsv($handle, array $row): void
    {
        if (fputcsv($handle, $row, ',', '"', '') === false) {
            abort(500, 'Unable to write CSV row.');
        }
    }

    private function writeRaw($handle, string $content): void
    {
        if (fwrite($handle, $content) === false) {
            abort(500, 'Unable to write CSV output.');
        }
    }

    private function formatDateTime($value): string
    {
        if (! $value) {
            return '';
        }

        if (is_string($value)) {
            return $value;
        }

        return $value->format('Y-m-d H:i:s');
    }

    private function formatPrice($value): string
    {
        return number_format((float) ($value ?? 0), 2, '.', '');
    }

    private function courseStatus($isPublished): string
    {
        return $isPublished ? 'Published' : 'Draft';
    }

    /**
     * @param  Collection<int, mixed>  $models
     * @return array<int, array<string, mixed>>
     */
    private function activityRows($models, string $type, ?string $labelAttribute = null): array
    {
        return $models
            ->map(function ($model) use ($type, $labelAttribute): array {
                return [
                    'type' => $type,
                    'id' => $model->id,
                    'label' => $this->activityLabel($model, $labelAttribute),
                    'created_at' => $model->created_at,
                ];
            })
            ->all();
    }

    private function activityLabel($model, ?string $labelAttribute): string
    {
        if ($labelAttribute !== null) {
            return (string) $model->{$labelAttribute};
        }

        if ($model instanceof Enrollment) {
            return sprintf('%s enrolled in %s', $model->user?->name ?? 'Student', $model->course?->title ?? 'course');
        }

        if ($model instanceof Payment) {
            return sprintf('%s paid for %s', $model->user?->name ?? 'Student', $model->course?->title ?? 'course');
        }

        if ($model instanceof CourseCertificate) {
            return sprintf('%s earned %s', $model->user?->name ?? 'Student', $model->course?->title ?? 'course');
        }

        return 'Activity';
    }
}
