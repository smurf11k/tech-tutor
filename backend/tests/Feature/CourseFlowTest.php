<?php

namespace Tests\Feature;

use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Lesson;
use App\Models\Module;
use App\Models\Progress;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CourseFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_instructor_can_create_course_and_student_can_enroll_and_track_progress(): void
    {
        $instructor = User::factory()->create(['role' => 'instructor']);
        $student = User::factory()->create(['role' => 'student']);

        Sanctum::actingAs($instructor);

        $courseResponse = $this->postJson('/api/courses', [
            'title' => 'Laravel Basics',
            'slug' => 'laravel-basics',
            'description' => 'Intro course',
            'price' => 49.99,
        ]);

        $courseResponse->assertCreated();

        $course = Course::query()->firstOrFail();
        $module = Module::create([
            'course_id' => $course->id,
            'title' => 'Getting Started',
            'slug' => 'getting-started',
            'position' => 1,
        ]);

        $lesson = Lesson::create([
            'module_id' => $module->id,
            'title' => 'Welcome',
            'slug' => 'welcome',
            'type' => 'text',
            'content' => 'Hello world',
            'position' => 1,
            'is_preview' => false,
        ]);

        Sanctum::actingAs($student);

        $this->postJson("/api/courses/{$course->id}/enrollments")
            ->assertCreated();

        $this->postJson("/api/lessons/{$lesson->id}/progress", [
            'progress_percent' => 100,
        ])->assertCreated();

        $this->assertDatabaseHas('enrollments', [
            'user_id' => $student->id,
            'course_id' => $course->id,
            'status' => 'active',
        ]);

        $this->assertDatabaseHas('progress', [
            'user_id' => $student->id,
            'lesson_id' => $lesson->id,
            'progress_percent' => 100,
        ]);
    }

    public function test_public_courses_index_only_returns_published_courses(): void
    {
        $instructor = User::factory()->create(['role' => 'instructor']);

        Course::create([
            'instructor_id' => $instructor->id,
            'title' => 'Published Course',
            'slug' => 'published-course',
            'description' => 'Visible publicly',
            'thumbnail_path' => null,
            'price' => 10,
            'is_published' => true,
            'published_at' => now(),
        ]);

        Course::create([
            'instructor_id' => $instructor->id,
            'title' => 'Draft Course',
            'slug' => 'draft-course',
            'description' => 'Hidden from public',
            'thumbnail_path' => null,
            'price' => 10,
            'is_published' => false,
            'published_at' => null,
        ]);

        $response = $this->getJson('/api/courses')
            ->assertOk()
            ->assertJsonCount(1, 'data');

        $response->assertJsonPath('data.0.slug', 'published-course');

        Sanctum::actingAs(User::factory()->create(['role' => 'student']));

        $this->getJson('/api/courses')
            ->assertOk()
            ->assertJsonCount(2, 'data');
    }

    public function test_publishing_rules_set_and_clear_published_at(): void
    {
        $instructor = User::factory()->create(['role' => 'instructor']);

        Sanctum::actingAs($instructor);

        $this->postJson('/api/courses', [
            'title' => 'Publish Rule Course',
            'slug' => 'publish-rule-course',
            'price' => 15,
            'is_published' => true,
        ])->assertCreated();

        $course = Course::query()->firstOrFail();

        $this->assertTrue($course->is_published);
        $this->assertNotNull($course->published_at);

        $this->patchJson("/api/courses/{$course->id}", [
            'is_published' => false,
        ])->assertOk();

        $course->refresh();

        $this->assertFalse($course->is_published);
        $this->assertNull($course->published_at);
    }

    public function test_student_can_delete_their_enrollment_by_id(): void
    {
        $instructor = User::factory()->create(['role' => 'instructor']);
        $student = User::factory()->create(['role' => 'student']);

        Sanctum::actingAs($instructor);

        $this->postJson('/api/courses', [
            'title' => 'Enrollment Delete Course',
            'slug' => 'enrollment-delete-course',
            'price' => 5,
            'is_published' => true,
        ])->assertCreated();

        $course = Course::query()->firstOrFail();

        Sanctum::actingAs($student);

        $this->postJson("/api/courses/{$course->id}/enrollments")->assertCreated();

        $enrollment = Enrollment::query()->where('user_id', $student->id)->where('course_id', $course->id)->firstOrFail();

        $this->deleteJson("/api/courses/{$course->id}/enrollments/{$enrollment->id}")
            ->assertNoContent();

        $this->assertDatabaseMissing('enrollments', [
            'id' => $enrollment->id,
        ]);
    }

    public function test_student_cannot_view_course_enrollment_roster(): void
    {
        $instructor = User::factory()->create(['role' => 'instructor']);
        $student = User::factory()->create(['role' => 'student']);

        Sanctum::actingAs($instructor);

        $this->postJson('/api/courses', [
            'title' => 'Roster Privacy Course',
            'slug' => 'roster-privacy-course',
            'price' => 10,
            'is_published' => true,
        ])->assertCreated();

        $course = Course::query()->firstOrFail();

        Sanctum::actingAs($student);

        $this->postJson("/api/courses/{$course->id}/enrollments")->assertCreated();

        $this->getJson("/api/courses/{$course->id}/enrollments")
            ->assertForbidden();
    }

    public function test_only_course_instructor_or_admin_can_view_enrollment_roster(): void
    {
        $instructor = User::factory()->create(['role' => 'instructor']);
        $otherInstructor = User::factory()->create(['role' => 'instructor']);
        $admin = User::factory()->create(['role' => 'admin']);
        $student = User::factory()->create(['role' => 'student']);

        Sanctum::actingAs($instructor);

        $this->postJson('/api/courses', [
            'title' => 'Roster Owner Course',
            'slug' => 'roster-owner-course',
            'price' => 12,
            'is_published' => true,
        ])->assertCreated();

        $course = Course::query()->firstOrFail();

        Sanctum::actingAs($student);
        $this->postJson("/api/courses/{$course->id}/enrollments")->assertCreated();

        Sanctum::actingAs($otherInstructor);
        $this->getJson("/api/courses/{$course->id}/enrollments")
            ->assertForbidden();

        Sanctum::actingAs($instructor);
        $this->getJson("/api/courses/{$course->id}/enrollments")
            ->assertOk()
            ->assertJsonCount(1);

        Sanctum::actingAs($admin);
        $this->getJson("/api/courses/{$course->id}/enrollments")
            ->assertOk()
            ->assertJsonCount(1);
    }
}