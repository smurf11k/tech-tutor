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

class AdminPlatformDashboardController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        abort_unless($request->user()?->isAdmin(), 403);

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
            ->map(fn ($items, string $status): array => [
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
            ->map(fn ($items): array => [
                'course_id' => $items->first()->course_id,
                'course_title' => $items->first()->course?->title,
                'payments_count' => $items->count(),
                'revenue_total' => number_format((float) $items->sum('amount'), 2, '.', ''),
            ])
            ->sortByDesc(fn (array $row): float => (float) $row['revenue_total'])
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
