<?php

namespace Tests\Feature;

use App\Models\Course;
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
        $this->getJson('/api/admin/moderation-queue')->assertForbidden();
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
