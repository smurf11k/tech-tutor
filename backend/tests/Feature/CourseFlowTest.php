<?php

namespace Tests\Feature;

use App\Models\Course;
use App\Models\Enrollment;
use App\Models\Lesson;
use App\Models\Module;
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

    public function test_public_courses_index_supports_catalog_search_filters_and_sorting(): void
    {
        $instructor = User::factory()->create(['role' => 'instructor']);

        Course::create([
            'instructor_id' => $instructor->id,
            'title' => 'Laravel API Bootcamp',
            'slug' => 'laravel-api-bootcamp',
            'description' => 'Backend APIs with policies and Sanctum.',
            'subtitle' => 'REST API practice',
            'category' => 'backend',
            'level' => 'beginner',
            'language' => 'en',
            'thumbnail_path' => '/courses/laravel.png',
            'duration_minutes' => 420,
            'price' => 79,
            'is_published' => true,
            'published_at' => now(),
        ]);

        Course::create([
            'instructor_id' => $instructor->id,
            'title' => 'React Learning UI',
            'slug' => 'react-learning-ui',
            'description' => 'Frontend interfaces for students.',
            'subtitle' => 'Interface systems',
            'category' => 'frontend',
            'level' => 'intermediate',
            'language' => 'en',
            'thumbnail_path' => '/courses/react.png',
            'duration_minutes' => 300,
            'price' => 0,
            'is_published' => true,
            'published_at' => now(),
        ]);

        Course::create([
            'instructor_id' => $instructor->id,
            'title' => 'Advanced Laravel Draft',
            'slug' => 'advanced-laravel-draft',
            'description' => 'Hidden backend draft.',
            'category' => 'backend',
            'level' => 'advanced',
            'language' => 'en',
            'price' => 120,
            'is_published' => false,
            'published_at' => null,
        ]);

        $this->getJson('/api/courses?q=laravel&category=backend&price_type=paid&sort=price_desc')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.slug', 'laravel-api-bootcamp')
            ->assertJsonPath('data.0.category', 'backend')
            ->assertJsonPath('data.0.level', 'beginner')
            ->assertJsonPath('data.0.duration_minutes', 420);

        $this->getJson('/api/courses?price_type=free')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.slug', 'react-learning-ui');
    }

    public function test_instructor_can_manage_course_catalog_metadata(): void
    {
        $instructor = User::factory()->create(['role' => 'instructor']);

        Sanctum::actingAs($instructor);

        $response = $this->postJson('/api/courses', [
            'title' => 'Metadata Course',
            'slug' => 'metadata-course',
            'description' => 'Course with catalog metadata.',
            'subtitle' => 'Catalog-ready API course',
            'category' => 'backend',
            'level' => 'intermediate',
            'language' => 'en',
            'thumbnail_path' => '/courses/metadata.png',
            'duration_minutes' => 180,
            'price' => 25,
        ])->assertCreated();

        $courseId = $response->json('id');

        $this->patchJson("/api/courses/{$courseId}", [
            'level' => 'advanced',
            'duration_minutes' => 210,
        ])->assertOk()
            ->assertJsonPath('level', 'advanced')
            ->assertJsonPath('duration_minutes', 210);

        $this->assertDatabaseHas('courses', [
            'id' => $courseId,
            'subtitle' => 'Catalog-ready API course',
            'category' => 'backend',
            'level' => 'advanced',
            'language' => 'en',
            'thumbnail_path' => '/courses/metadata.png',
            'duration_minutes' => 210,
        ]);
    }

    public function test_publishing_rules_set_and_clear_published_at(): void
    {
        $instructor = User::factory()->create(['role' => 'instructor']);

        Sanctum::actingAs($instructor);

        $this->postJson('/api/courses', [
            'title' => 'Publish Rule Course',
            'slug' => 'publish-rule-course',
            'price' => 15,
        ])->assertCreated();

        $course = Course::query()->firstOrFail();

        // Admin publishes the course
        $admin = User::factory()->create(['role' => 'admin']);
        Sanctum::actingAs($admin);
        $this->patchJson("/api/courses/{$course->id}", ['is_published' => true])->assertOk();

        $course->refresh();
        $this->assertTrue($course->is_published);
        $this->assertNotNull($course->published_at);

        // Admin unpublishes
        $this->patchJson("/api/courses/{$course->id}", ['is_published' => false])->assertOk();

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
