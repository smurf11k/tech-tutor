<?php

namespace Tests\Feature;

use App\Models\Course;
use App\Models\Lesson;
use App\Models\LessonRevision;
use App\Models\Module;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class LessonRevisionFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_instructor_editing_published_lesson_creates_pending_revision_without_changing_student_view(): void
    {
        $instructor = User::factory()->create(['role' => 'instructor']);
        $admin = User::factory()->create(['role' => 'admin']);

        $course = Course::create([
            'instructor_id' => $instructor->id,
            'title' => 'Revision Course',
            'slug' => 'revision-course',
            'description' => 'Testing lesson revisions',
            'price' => 0,
            'is_published' => true,
            'published_at' => now(),
        ]);

        $module = Module::create([
            'course_id' => $course->id,
            'title' => 'Main Module',
            'slug' => 'main-module',
            'position' => 1,
        ]);

        $lesson = Lesson::create([
            'module_id' => $module->id,
            'title' => 'Published Lesson',
            'slug' => 'published-lesson',
            'type' => 'lesson',
            'content' => 'Published content',
            'position' => 1,
            'is_published' => true,
        ]);

        Sanctum::actingAs($instructor);

        $this->putJson("/api/modules/{$module->id}/lessons/{$lesson->id}", [
            'title' => 'Published Lesson',
            'slug' => 'published-lesson',
            'content' => 'Updated draft content',
            'estimated_time_minutes' => 7,
            'position' => 1,
            'revision_status' => 'pending_review',
        ])->assertOk();

        $this->assertDatabaseHas('lessons', [
            'id' => $lesson->id,
            'content' => 'Published content',
        ]);

        $this->assertDatabaseHas('lesson_revisions', [
            'lesson_id' => $lesson->id,
            'status' => 'pending_review',
            'content' => 'Updated draft content',
        ]);

        Sanctum::actingAs($admin);

        $this->getJson("/api/courses/{$course->id}")
            ->assertOk()
            ->assertJsonPath('modules.0.lessons.0.content', 'Published content');

        $queueResponse = $this->getJson('/api/admin/moderation-queue');
        $queueResponse->assertOk();
        $queueResponse->assertJsonFragment([
            'content_type' => 'lesson_revision',
        ]);

        $revisionId = LessonRevision::query()
            ->where('lesson_id', $lesson->id)
            ->where('status', 'pending_review')
            ->value('id');

        $this->patchJson("/api/admin/moderation-queue/lesson-revisions/{$revisionId}", [
            'action' => 'accept',
        ])->assertOk();

        $this->assertDatabaseHas('lessons', [
            'id' => $lesson->id,
            'content' => 'Updated draft content',
            'is_published' => true,
        ]);

        $this->assertDatabaseHas('lesson_revisions', [
            'id' => $revisionId,
            'status' => 'published',
            'content' => 'Updated draft content',
        ]);

        $this->getJson("/api/courses/{$course->id}")
            ->assertOk()
            ->assertJsonPath('modules.0.lessons.0.content', 'Updated draft content');

        $this->patchJson("/api/modules/{$module->id}/lessons/{$lesson->id}/unpublish")
            ->assertOk();

        $this->assertDatabaseHas('lessons', [
            'id' => $lesson->id,
            'is_published' => false,
        ]);
    }

    public function test_instructor_can_delete_a_never_published_lesson_but_must_unpublish_a_published_one_first(): void
    {
        $instructor = User::factory()->create(['role' => 'instructor']);

        $course = Course::create([
            'instructor_id' => $instructor->id,
            'title' => 'Deletion Course',
            'slug' => 'deletion-course',
            'description' => 'Lesson deletion rules',
            'price' => 0,
            'is_published' => true,
            'published_at' => now(),
        ]);

        $module = Module::create([
            'course_id' => $course->id,
            'title' => 'Deletion Module',
            'slug' => 'deletion-module',
            'position' => 1,
        ]);

        Sanctum::actingAs($instructor);

        $draftResponse = $this->postJson("/api/modules/{$module->id}/lessons", [
            'title' => 'Draft Lesson',
            'slug' => 'draft-lesson',
            'content' => 'Draft content',
            'revision_status' => 'draft',
        ])->assertCreated();

        $draftLessonId = $draftResponse->json('id');

        $this->deleteJson("/api/modules/{$module->id}/lessons/{$draftLessonId}")
            ->assertNoContent();

        $this->assertDatabaseMissing('lessons', [
            'id' => $draftLessonId,
        ]);

        $publishedLesson = Lesson::create([
            'module_id' => $module->id,
            'title' => 'Published Lesson',
            'slug' => 'published-lesson-delete-blocked',
            'type' => 'lesson',
            'content' => 'Published content',
            'position' => 2,
            'is_published' => true,
        ]);

        $this->deleteJson("/api/modules/{$module->id}/lessons/{$publishedLesson->id}")
            ->assertStatus(409);
    }

    public function test_instructor_can_request_unpublish_and_admin_can_finalize_it_for_lesson(): void
    {
        $instructor = User::factory()->create(['role' => 'instructor']);
        $admin = User::factory()->create(['role' => 'admin']);

        $course = Course::create([
            'instructor_id' => $instructor->id,
            'title' => 'Request Unpublish Course',
            'slug' => 'request-unpublish-course',
            'description' => 'Lesson request unpublish flow',
            'price' => 0,
            'is_published' => true,
            'published_at' => now(),
        ]);

        $module = Module::create([
            'course_id' => $course->id,
            'title' => 'Request Module',
            'slug' => 'request-module',
            'position' => 1,
        ]);

        $lesson = Lesson::create([
            'module_id' => $module->id,
            'title' => 'Request Lesson',
            'slug' => 'request-lesson',
            'type' => 'lesson',
            'content' => 'Current content',
            'position' => 1,
            'is_published' => true,
        ]);

        Sanctum::actingAs($instructor);

        $this->putJson("/api/modules/{$module->id}/lessons/{$lesson->id}", [
            'title' => 'Request Lesson',
            'slug' => 'request-lesson',
            'content' => 'Current content',
            'revision_status' => 'pending_unpublish',
            'is_published' => false,
        ])->assertOk();

        $revisionId = LessonRevision::query()
            ->where('lesson_id', $lesson->id)
            ->where('status', 'pending_unpublish')
            ->value('id');

        $this->assertNotNull($revisionId);
        $this->assertDatabaseHas('lesson_revisions', [
            'id' => $revisionId,
            'is_published' => false,
            'status' => 'pending_unpublish',
        ]);

        Sanctum::actingAs($admin);

        $this->patchJson("/api/admin/moderation-queue/lesson-revisions/{$revisionId}", [
            'action' => 'accept',
        ])->assertOk();

        $this->assertDatabaseHas('lessons', [
            'id' => $lesson->id,
            'is_published' => false,
        ]);

        $revision = LessonRevision::query()->findOrFail($revisionId);
        $this->assertSame('draft', $revision->status);
        $this->assertNotNull($revision->unpublished_at);
    }
}