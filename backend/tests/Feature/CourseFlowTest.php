<?php

namespace Tests\Feature;

use App\Models\Course;
use App\Models\CourseCertificate;
use App\Models\Enrollment;
use App\Models\Lesson;
use App\Models\Module;
use App\Models\User;
use App\Notifications\CourseCertificateIssuedNotification;
use App\Notifications\EnrollmentCreatedNotification;
use App\Notifications\PublishRequestHandledNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CourseFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_instructor_can_create_course_and_student_can_enroll_and_track_progress(): void
    {
        Notification::fake();

        $instructor = User::factory()->create(['role' => 'instructor']);
        $student = User::factory()->create(['role' => 'student']);

        Sanctum::actingAs($instructor);

        $courseResponse = $this->postJson('/api/courses', [
            'title' => 'Laravel Basics',
            'slug' => 'laravel-basics',
            'description' => 'Intro course',
            'price' => 0,
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

        Notification::assertSentTo($student, EnrollmentCreatedNotification::class);

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

    public function test_instructor_can_upload_and_replace_lesson_files(): void
    {
        Storage::fake('public');

        $instructor = User::factory()->create(['role' => 'instructor']);

        $course = Course::create([
            'instructor_id' => $instructor->id,
            'title' => 'File Upload Course',
            'slug' => 'file-upload-course',
            'description' => 'Used for lesson upload testing',
            'price' => 0,
            'is_published' => true,
            'published_at' => now(),
        ]);

        $module = Module::create([
            'course_id' => $course->id,
            'title' => 'Uploads',
            'slug' => 'uploads',
            'position' => 1,
        ]);

        Sanctum::actingAs($instructor);

        $initialUpload = UploadedFile::fake()->create('lesson-notes.pdf', 256, 'application/pdf');

        $createResponse = $this->post(
            "/api/modules/{$module->id}/lessons",
            [
                'title' => 'Lesson Notes',
                'slug' => 'lesson-notes',
                'type' => 'file',
                'lesson_file' => $initialUpload,
            ],
            ['Accept' => 'application/json']
        )->assertCreated();

        $firstPath = $createResponse->json('file_path');

        $this->assertNotNull($firstPath);
        $this->assertStringStartsWith('lesson-files/module-' . $module->id . '/', $firstPath);
        Storage::disk('public')->assertExists($firstPath);
        $createResponse->assertJsonPath('file_url', url(Storage::disk('public')->url($firstPath)));

        $lesson = Lesson::query()->firstOrFail();
        $replacementUpload = UploadedFile::fake()->create('lesson-notes-v2.pdf', 256, 'application/pdf');

        $updateResponse = $this->post(
            "/api/modules/{$module->id}/lessons/{$lesson->id}",
            [
                '_method' => 'PUT',
                'title' => 'Lesson Notes Updated',
                'slug' => 'lesson-notes',
                'type' => 'file',
                'lesson_file' => $replacementUpload,
            ],
            ['Accept' => 'application/json']
        )->assertOk();

        $secondPath = $updateResponse->json('file_path');

        $this->assertNotSame($firstPath, $secondPath);
        Storage::disk('public')->assertMissing($firstPath);
        Storage::disk('public')->assertExists($secondPath);
        $updateResponse->assertJsonPath('file_url', url(Storage::disk('public')->url($secondPath)));
    }

    public function test_file_lessons_require_an_uploaded_file_or_existing_file_path(): void
    {
        $instructor = User::factory()->create(['role' => 'instructor']);

        $course = Course::create([
            'instructor_id' => $instructor->id,
            'title' => 'Required File Course',
            'slug' => 'required-file-course',
            'description' => 'Used for lesson file validation testing',
            'price' => 0,
            'is_published' => true,
            'published_at' => now(),
        ]);

        $module = Module::create([
            'course_id' => $course->id,
            'title' => 'Required Uploads',
            'slug' => 'required-uploads',
            'position' => 1,
        ]);

        Sanctum::actingAs($instructor);

        $this->postJson("/api/modules/{$module->id}/lessons", [
            'title' => 'Broken File Lesson',
            'slug' => 'broken-file-lesson',
            'type' => 'file',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors('lesson_file');
    }

    public function test_student_receives_certificate_after_completing_all_course_lessons(): void
    {
        Notification::fake();

        $instructor = User::factory()->create(['role' => 'instructor']);
        $student = User::factory()->create(['role' => 'student']);

        $course = Course::create([
            'instructor_id' => $instructor->id,
            'title' => 'Certificate Course',
            'slug' => 'certificate-course',
            'description' => 'Completion certificate test',
            'price' => 0,
            'is_published' => true,
            'published_at' => now(),
        ]);

        $module = Module::create([
            'course_id' => $course->id,
            'title' => 'Certificate Module',
            'slug' => 'certificate-module',
            'position' => 1,
        ]);

        $firstLesson = Lesson::create([
            'module_id' => $module->id,
            'title' => 'First',
            'slug' => 'first',
            'type' => 'text',
            'position' => 1,
        ]);

        $secondLesson = Lesson::create([
            'module_id' => $module->id,
            'title' => 'Second',
            'slug' => 'second',
            'type' => 'text',
            'position' => 2,
        ]);

        Sanctum::actingAs($student);

        $this->postJson("/api/courses/{$course->id}/enrollments")->assertCreated();

        $this->postJson("/api/lessons/{$firstLesson->id}/progress", [
            'progress_percent' => 100,
        ])->assertCreated()
            ->assertJsonPath('certificate', null);

        $this->assertDatabaseCount('course_certificates', 0);
        Notification::assertNotSentTo($student, CourseCertificateIssuedNotification::class);

        $certificateResponse = $this->postJson("/api/lessons/{$secondLesson->id}/progress", [
            'progress_percent' => 100,
        ])->assertCreated()
            ->assertJsonPath('certificate.course_id', $course->id)
            ->assertJsonPath('certificate.user_id', $student->id);

        $certificateId = $certificateResponse->json('certificate.id');

        Notification::assertSentTo($student, CourseCertificateIssuedNotification::class);

        $this->assertDatabaseHas('course_certificates', [
            'id' => $certificateId,
            'course_id' => $course->id,
            'user_id' => $student->id,
        ]);

        $this->postJson("/api/courses/{$course->id}/certificate")
            ->assertOk()
            ->assertJsonPath('id', $certificateId);

        $this->assertDatabaseCount('course_certificates', 1);

        $this->getJson('/api/certificates')
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.id', $certificateId);
    }

    public function test_instructor_is_notified_when_publish_request_is_handled(): void
    {
        Notification::fake();

        $instructor = User::factory()->create(['role' => 'instructor']);
        $admin = User::factory()->create(['role' => 'admin']);

        Sanctum::actingAs($instructor);

        $acceptedCourseId = $this->postJson('/api/courses', [
            'title' => 'Requested Publish Course',
            'slug' => 'requested-publish-course',
            'price' => 0,
            'request_publish' => true,
        ])->assertCreated()->json('id');

        Sanctum::actingAs($admin);

        $this->patchJson("/api/courses/{$acceptedCourseId}", [
            'is_published' => true,
        ])->assertOk();

        Notification::assertSentTo($instructor, PublishRequestHandledNotification::class);

        Notification::fake();
        Sanctum::actingAs($instructor);

        $declinedCourseId = $this->postJson('/api/courses', [
            'title' => 'Declined Publish Course',
            'slug' => 'declined-publish-course',
            'price' => 0,
            'request_publish' => true,
        ])->assertCreated()->json('id');

        Sanctum::actingAs($admin);

        $this->patchJson("/api/courses/{$declinedCourseId}", [
            'decline_publish' => true,
            'publish_request_declined_reason' => 'Needs more lessons.',
        ])->assertOk();

        Notification::assertSentTo($instructor, PublishRequestHandledNotification::class);
    }

    public function test_certificate_visibility_is_role_aware(): void
    {
        $instructor = User::factory()->create(['role' => 'instructor']);
        $otherInstructor = User::factory()->create(['role' => 'instructor']);
        $student = User::factory()->create(['role' => 'student']);
        $otherStudent = User::factory()->create(['role' => 'student']);
        $admin = User::factory()->create(['role' => 'admin']);

        $course = Course::create([
            'instructor_id' => $instructor->id,
            'title' => 'Visible Certificate Course',
            'slug' => 'visible-certificate-course',
            'description' => 'Certificate visibility test',
            'price' => 0,
            'is_published' => true,
            'published_at' => now(),
        ]);

        $certificate = CourseCertificate::create([
            'course_id' => $course->id,
            'user_id' => $student->id,
            'certificate_number' => 'TT-TEST-CERT',
            'issued_at' => now(),
        ]);

        Sanctum::actingAs($otherStudent);
        $this->getJson("/api/certificates/{$certificate->id}")->assertForbidden();
        $this->getJson('/api/certificates')->assertOk()->assertJsonCount(0);

        Sanctum::actingAs($otherInstructor);
        $this->getJson("/api/certificates/{$certificate->id}")->assertForbidden();
        $this->getJson('/api/certificates')->assertOk()->assertJsonCount(0);

        Sanctum::actingAs($instructor);
        $this->getJson("/api/certificates/{$certificate->id}")->assertOk();
        $this->getJson('/api/certificates')->assertOk()->assertJsonCount(1);

        Sanctum::actingAs($admin);
        $this->getJson("/api/certificates/{$certificate->id}")->assertOk();
        $this->getJson('/api/certificates')->assertOk()->assertJsonCount(1);
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
            'price' => 0,
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
            'price' => 0,
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
            'price' => 0,
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
