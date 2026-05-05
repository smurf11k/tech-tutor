<?php

namespace Tests\Feature;

use App\Models\Course;
use App\Models\CourseCertificate;
use App\Models\Enrollment;
use App\Models\Payment;
use App\Models\Quiz;
use App\Models\QuizAttempt;
use App\Models\Review;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminPanelFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_list_users_change_role_and_ban_user(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $student = User::factory()->create(['role' => 'student']);

        Sanctum::actingAs($admin);

        $response = $this->getJson('/api/admin/users')
            ->assertOk()
            ->assertJsonCount(2, 'data');

        $this->assertContains($student->id, array_column($response->json('data'), 'id'));

        $this->patchJson("/api/admin/users/{$student->id}", [
            'role' => 'instructor',
            'is_banned' => true,
        ])->assertOk()
            ->assertJsonPath('role', 'instructor')
            ->assertJsonPath('is_banned', true);

        $this->assertDatabaseHas('users', [
            'id' => $student->id,
            'role' => 'instructor',
            'is_banned' => true,
        ]);
    }

    public function test_non_admin_cannot_access_admin_user_management_or_moderation_queue(): void
    {
        $student = User::factory()->create(['role' => 'student']);

        Sanctum::actingAs($student);

        $this->getJson('/api/admin/users')->assertForbidden();
        $this->getJson('/api/admin/platform-dashboard')->assertForbidden();
        $this->getJson('/api/admin/moderation-queue')->assertForbidden();
    }

    public function test_admin_can_fetch_platform_activity_and_payment_monitoring(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $instructor = User::factory()->create(['role' => 'instructor']);
        $student = User::factory()->create(['role' => 'student']);
        $banned = User::factory()->create(['role' => 'student', 'is_banned' => true, 'banned_at' => now()]);

        $course = Course::create([
            'instructor_id' => $instructor->id,
            'title' => 'Admin Monitor Course',
            'slug' => 'admin-monitor-course',
            'description' => 'Admin monitoring test',
            'price' => 40,
            'is_published' => true,
            'published_at' => now(),
        ]);

        $draftCourse = Course::create([
            'instructor_id' => $instructor->id,
            'title' => 'Admin Monitor Draft',
            'slug' => 'admin-monitor-draft',
            'description' => 'Draft monitoring test',
            'price' => 20,
            'is_published' => false,
            'published_at' => null,
        ]);

        Enrollment::create([
            'course_id' => $course->id,
            'user_id' => $student->id,
            'status' => 'active',
            'enrolled_at' => now(),
        ]);

        CourseCertificate::create([
            'course_id' => $course->id,
            'user_id' => $student->id,
            'certificate_number' => 'TT-ADMIN-MONITOR',
            'issued_at' => now(),
        ]);

        Payment::create([
            'course_id' => $course->id,
            'user_id' => $student->id,
            'provider' => 'stripe',
            'amount' => 40,
            'currency' => 'USD',
            'status' => 'paid',
            'transaction_id' => 'admin_monitor_paid',
            'paid_at' => now(),
        ]);

        Payment::create([
            'course_id' => $draftCourse->id,
            'user_id' => $student->id,
            'provider' => 'stripe',
            'amount' => 20,
            'currency' => 'USD',
            'status' => 'pending',
            'transaction_id' => 'admin_monitor_pending',
            'paid_at' => null,
        ]);

        $quiz = Quiz::create([
            'course_id' => $course->id,
            'title' => 'Admin Monitor Quiz',
            'pass_score' => 60,
            'is_published' => true,
        ]);

        QuizAttempt::create([
            'quiz_id' => $quiz->id,
            'user_id' => $student->id,
            'score' => 90,
            'passed' => true,
            'answers' => [],
            'completed_at' => now(),
        ]);

        Review::create([
            'course_id' => $course->id,
            'user_id' => $student->id,
            'rating' => 5,
            'comment' => 'Pending moderation',
            'is_published' => false,
        ]);

        Sanctum::actingAs($admin);

        $this->getJson('/api/admin/platform-dashboard')
            ->assertOk()
            ->assertJsonPath('summary.users_count', 4)
            ->assertJsonPath('summary.students_count', 2)
            ->assertJsonPath('summary.instructors_count', 1)
            ->assertJsonPath('summary.admins_count', 1)
            ->assertJsonPath('summary.banned_users_count', 1)
            ->assertJsonPath('summary.courses_count', 2)
            ->assertJsonPath('summary.published_courses_count', 1)
            ->assertJsonPath('summary.draft_courses_count', 1)
            ->assertJsonPath('summary.enrollments_count', 1)
            ->assertJsonPath('summary.certificates_count', 1)
            ->assertJsonPath('summary.quiz_attempts_count', 1)
            ->assertJsonPath('summary.pending_reviews_count', 1)
            ->assertJsonPath('summary.payments_count', 2)
            ->assertJsonPath('summary.paid_payments_count', 1)
            ->assertJsonPath('summary.revenue_total', '40.00')
            ->assertJsonFragment([
                'status' => 'paid',
                'count' => 1,
                'amount' => '40.00',
            ])
            ->assertJsonFragment([
                'course_id' => $course->id,
                'course_title' => 'Admin Monitor Course',
                'payments_count' => 1,
                'revenue_total' => '40.00',
            ])
            ->assertJsonFragment([
                'type' => 'payment_recorded',
            ]);
    }

    public function test_banned_user_cannot_access_protected_routes(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $instructor = User::factory()->create(['role' => 'instructor']);
        $student = User::factory()->create(['role' => 'student']);

        $course = Course::create([
            'instructor_id' => $instructor->id,
            'title' => 'Protected Access Course',
            'slug' => 'protected-access-course',
            'description' => 'Used for ban enforcement',
            'price' => 10,
            'is_published' => true,
            'published_at' => now(),
        ]);

        Sanctum::actingAs($admin);

        $this->patchJson("/api/admin/users/{$student->id}", [
            'is_banned' => true,
        ])->assertOk();

        Sanctum::actingAs($student->fresh());

        $this->postJson("/api/courses/{$course->id}/enrollments")
            ->assertForbidden()
            ->assertJsonPath('message', 'User account is banned.');
    }

    public function test_new_reviews_appear_in_content_moderation_queue_and_admin_can_publish_them(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $instructor = User::factory()->create(['role' => 'instructor']);
        $student = User::factory()->create(['role' => 'student']);

        $course = Course::create([
            'instructor_id' => $instructor->id,
            'title' => 'Moderated Review Course',
            'slug' => 'moderated-review-course',
            'description' => 'Used for moderation queue',
            'price' => 30,
            'is_published' => true,
            'published_at' => now(),
        ]);

        Sanctum::actingAs($student);

        $this->postJson("/api/courses/{$course->id}/enrollments")->assertCreated();

        $reviewResponse = $this->postJson("/api/courses/{$course->id}/reviews", [
            'rating' => 5,
            'comment' => 'Queue me for approval',
        ])->assertCreated()
            ->assertJsonPath('is_published', false);

        $reviewId = $reviewResponse->json('id');

        $this->getJson("/api/courses/{$course->id}/reviews")
            ->assertOk()
            ->assertJsonCount(0);

        Sanctum::actingAs($admin);

        $this->getJson('/api/admin/moderation-queue')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.content_type', 'review')
            ->assertJsonPath('0.review.id', $reviewId);

        $this->patchJson("/api/admin/moderation-queue/reviews/{$reviewId}", [
            'is_published' => true,
        ])->assertOk()
            ->assertJsonPath('id', $reviewId)
            ->assertJsonPath('is_published', true);

        Sanctum::actingAs($student);

        $this->getJson("/api/courses/{$course->id}/reviews")
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.id', $reviewId)
            ->assertJsonPath('0.is_published', true);
    }
}
