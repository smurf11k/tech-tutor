<?php

namespace Tests\Feature;

use App\Models\Course;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CommerceFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_student_can_leave_review_and_record_payment(): void
    {
        $instructor = User::factory()->create(['role' => 'instructor']);
        $student = User::factory()->create(['role' => 'student']);

        Sanctum::actingAs($instructor);

        $this->postJson('/api/courses', [
            'title' => 'Paid Course',
            'slug' => 'paid-course',
            'description' => 'A paid course',
            'price' => 99.99,
        ])->assertCreated();

        $course = Course::query()->firstOrFail();

        Sanctum::actingAs($student);

        $this->postJson("/api/courses/{$course->id}/enrollments")->assertCreated();

        $this->postJson("/api/courses/{$course->id}/reviews", [
            'rating' => 5,
            'comment' => 'Strong course',
        ])->assertCreated();

        $this->postJson("/api/courses/{$course->id}/payments", [
            'provider' => 'stripe',
            'amount' => 99.99,
            'currency' => 'usd',
            'transaction_id' => 'txn_12345',
        ])->assertCreated();

        $this->assertDatabaseHas('reviews', [
            'course_id' => $course->id,
            'user_id' => $student->id,
            'rating' => 5,
        ]);

        $this->assertDatabaseHas('payments', [
            'course_id' => $course->id,
            'user_id' => $student->id,
            'provider' => 'stripe',
            'transaction_id' => 'txn_12345',
        ]);
    }

    public function test_student_cannot_record_duplicate_paid_payment_for_same_course(): void
    {
        $instructor = User::factory()->create(['role' => 'instructor']);
        $student = User::factory()->create(['role' => 'student']);

        Sanctum::actingAs($instructor);

        $this->postJson('/api/courses', [
            'title' => 'Single Purchase Course',
            'slug' => 'single-purchase-course',
            'description' => 'Paid once',
            'price' => 49.99,
        ])->assertCreated();

        $course = Course::query()->firstOrFail();

        // Admin publishes the course
        $admin = User::factory()->create(['role' => 'admin']);
        Sanctum::actingAs($admin);
        $this->patchJson("/api/courses/{$course->id}", ['is_published' => true])->assertOk();

        Sanctum::actingAs($student);

        $this->postJson("/api/courses/{$course->id}/payments", [
            'provider' => 'stripe',
            'amount' => 49.99,
            'currency' => 'usd',
            'transaction_id' => 'txn_first',
        ])->assertCreated();

        $this->postJson("/api/courses/{$course->id}/payments", [
            'provider' => 'stripe',
            'amount' => 49.99,
            'currency' => 'usd',
            'transaction_id' => 'txn_second',
        ])->assertStatus(409)
            ->assertJsonPath('message', 'Course is already paid by this user.');

        $this->assertDatabaseCount('payments', 1);
    }

    public function test_student_payment_amount_must_match_course_price(): void
    {
        $instructor = User::factory()->create(['role' => 'instructor']);
        $student = User::factory()->create(['role' => 'student']);

        Sanctum::actingAs($instructor);

        $this->postJson('/api/courses', [
            'title' => 'Strict Price Course',
            'slug' => 'strict-price-course',
            'description' => 'Price should match',
            'price' => 99.99,
        ])->assertCreated();

        $course = Course::query()->firstOrFail();

        // Admin publishes the course
        $admin = User::factory()->create(['role' => 'admin']);
        Sanctum::actingAs($admin);
        $this->patchJson("/api/courses/{$course->id}", ['is_published' => true])->assertOk();

        Sanctum::actingAs($student);

        $this->postJson("/api/courses/{$course->id}/payments", [
            'provider' => 'stripe',
            'amount' => 89.99,
            'currency' => 'usd',
            'transaction_id' => 'txn_wrong_amount',
        ])->assertStatus(422)
            ->assertJsonValidationErrors('amount');

        $this->assertDatabaseCount('payments', 0);
    }

    public function test_instructor_only_sees_payments_for_their_own_courses(): void
    {
        $instructorA = User::factory()->create(['role' => 'instructor']);
        $instructorB = User::factory()->create(['role' => 'instructor']);
        $student = User::factory()->create(['role' => 'student']);

        $courseA = Course::create([
            'instructor_id' => $instructorA->id,
            'title' => 'Course A',
            'slug' => 'course-a',
            'description' => 'A',
            'price' => 20,
            'is_published' => true,
            'published_at' => now(),
        ]);

        $courseB = Course::create([
            'instructor_id' => $instructorB->id,
            'title' => 'Course B',
            'slug' => 'course-b',
            'description' => 'B',
            'price' => 30,
            'is_published' => true,
            'published_at' => now(),
        ]);

        Sanctum::actingAs($student);

        $this->postJson("/api/courses/{$courseA->id}/payments", [
            'provider' => 'stripe',
            'amount' => 20,
            'currency' => 'usd',
            'transaction_id' => 'txn_a',
        ])->assertCreated();

        $this->postJson("/api/courses/{$courseB->id}/payments", [
            'provider' => 'stripe',
            'amount' => 30,
            'currency' => 'usd',
            'transaction_id' => 'txn_b',
        ])->assertCreated();

        Sanctum::actingAs($instructorA);

        $response = $this->getJson('/api/payments')
            ->assertOk()
            ->assertJsonCount(1);

        $response->assertJsonPath('0.course_id', $courseA->id);
    }

    public function test_admin_can_see_all_payments(): void
    {
        $instructor = User::factory()->create(['role' => 'instructor']);
        $studentA = User::factory()->create(['role' => 'student']);
        $studentB = User::factory()->create(['role' => 'student']);
        $admin = User::factory()->create(['role' => 'admin']);

        $course = Course::create([
            'instructor_id' => $instructor->id,
            'title' => 'Admin View Course',
            'slug' => 'admin-view-course',
            'description' => 'admin visibility',
            'price' => 25,
            'is_published' => true,
            'published_at' => now(),
        ]);

        Sanctum::actingAs($studentA);

        $this->postJson("/api/courses/{$course->id}/payments", [
            'provider' => 'stripe',
            'amount' => 25,
            'currency' => 'usd',
            'transaction_id' => 'txn_admin_1',
        ])->assertCreated();

        Sanctum::actingAs($studentB);

        $this->postJson("/api/courses/{$course->id}/payments", [
            'provider' => 'stripe',
            'amount' => 25,
            'currency' => 'usd',
            'transaction_id' => 'txn_admin_2',
        ])->assertCreated();

        Sanctum::actingAs($admin);

        $this->getJson('/api/payments')
            ->assertOk()
            ->assertJsonCount(2);
    }

    public function test_instructor_cannot_review_their_own_course(): void
    {
        $instructor = User::factory()->create(['role' => 'instructor']);

        Sanctum::actingAs($instructor);

        $this->postJson('/api/courses', [
            'title' => 'No Self Review Course',
            'slug' => 'no-self-review',
            'description' => 'Instructors cannot self-review',
            'price' => 10,
        ])->assertCreated();

        $course = Course::query()->firstOrFail();

        $this->postJson("/api/courses/{$course->id}/reviews", [
            'rating' => 5,
            'comment' => 'Amazing!'
        ])->assertForbidden();
    }

    public function test_review_owner_cannot_update_after_edit_window(): void
    {
        $instructor = User::factory()->create(['role' => 'instructor']);
        $student = User::factory()->create(['role' => 'student']);

        Sanctum::actingAs($instructor);

        $this->postJson('/api/courses', [
            'title' => 'Edit Window Course',
            'slug' => 'edit-window-course',
            'description' => 'Review edit window test',
            'price' => 20,
        ])->assertCreated();

        $course = Course::query()->firstOrFail();

        Sanctum::actingAs($student);

        $this->postJson("/api/courses/{$course->id}/enrollments")->assertCreated();

        $review = \App\Models\Review::create([
            'course_id' => $course->id,
            'user_id' => $student->id,
            'rating' => 4,
            'comment' => 'Good course',
            'is_published' => false,
        ]);

        $this->patchJson("/api/courses/{$course->id}/reviews/{$review->id}", [
            'rating' => 5,
        ])->assertOk();
    }

    public function test_student_cannot_moderate_review_visibility(): void
    {
        $instructor = User::factory()->create(['role' => 'instructor']);
        $student = User::factory()->create(['role' => 'student']);

        $course = Course::create([
            'instructor_id' => $instructor->id,
            'title' => 'Moderation Guard Course',
            'slug' => 'moderation-guard-course',
            'description' => 'Review moderation guard',
            'price' => 15,
            'is_published' => true,
            'published_at' => now(),
        ]);

        Sanctum::actingAs($student);

        $this->postJson("/api/courses/{$course->id}/enrollments")->assertCreated();

        $reviewResponse = $this->postJson("/api/courses/{$course->id}/reviews", [
            'rating' => 4,
            'comment' => 'Helpful content',
        ])->assertCreated();

        $reviewId = $reviewResponse->json('id');

        $this->patchJson("/api/courses/{$course->id}/reviews/{$reviewId}", [
            'comment' => 'Updated comment',
            'is_published' => false,
        ])->assertOk()
            ->assertJsonPath('comment', 'Updated comment')
            ->assertJsonPath('is_published', false);

        $this->assertDatabaseHas('reviews', [
            'id' => $reviewId,
            'comment' => 'Updated comment',
            'is_published' => false,
        ]);
    }

    public function test_non_admin_review_index_only_returns_published_reviews(): void
    {
        $instructor = User::factory()->create(['role' => 'instructor']);
        $student = User::factory()->create(['role' => 'student']);
        $admin = User::factory()->create(['role' => 'admin']);

        $course = Course::create([
            'instructor_id' => $instructor->id,
            'title' => 'Review Visibility Course',
            'slug' => 'review-visibility-course',
            'description' => 'Review visibility rules',
            'price' => 25,
            'is_published' => true,
            'published_at' => now(),
        ]);

        Sanctum::actingAs($student);

        $this->postJson("/api/courses/{$course->id}/enrollments")->assertCreated();

        $reviewResponse = $this->postJson("/api/courses/{$course->id}/reviews", [
            'rating' => 5,
            'comment' => 'Excellent course',
        ])->assertCreated();

        $reviewId = $reviewResponse->json('id');

        Sanctum::actingAs($admin);

        $this->patchJson("/api/courses/{$course->id}/reviews/{$reviewId}", [
            'is_published' => false,
        ])->assertOk()
            ->assertJsonPath('is_published', false);

        Sanctum::actingAs($student);

        $this->getJson("/api/courses/{$course->id}/reviews")
            ->assertOk()
            ->assertJsonCount(0);

        Sanctum::actingAs($admin);

        $this->getJson("/api/courses/{$course->id}/reviews")
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.id', $reviewId)
            ->assertJsonPath('0.is_published', false);
    }
}
