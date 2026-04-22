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
}