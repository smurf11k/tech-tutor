<?php

namespace Tests\Feature;

use App\Models\Comment;
use App\Models\Course;
use App\Models\Lesson;
use App\Models\Module;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class LessonCommentFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_enrolled_student_can_create_lesson_comment(): void
    {
        [$course, $lesson] = $this->createPublishedLesson();
        $student = User::factory()->create(['role' => 'student']);

        Sanctum::actingAs($student);

        $this->postJson("/api/courses/{$course->id}/enrollments")->assertCreated();

        $this->postJson("/api/lessons/{$lesson->id}/comments", [
            'body' => 'This lesson helped me understand the flow.',
        ])->assertCreated()
            ->assertJsonPath('body', 'This lesson helped me understand the flow.')
            ->assertJsonPath('is_published', false);

        $this->assertDatabaseHas('comments', [
            'lesson_id' => $lesson->id,
            'user_id' => $student->id,
            'is_published' => false,
        ]);
    }

    public function test_non_enrolled_student_cannot_create_lesson_comment(): void
    {
        [, $lesson] = $this->createPublishedLesson();
        $student = User::factory()->create(['role' => 'student']);

        Sanctum::actingAs($student);

        $this->postJson("/api/lessons/{$lesson->id}/comments", [
            'body' => 'Trying to comment without access.',
        ])->assertForbidden();

        $this->assertDatabaseCount('comments', 0);
    }

    public function test_non_admin_comment_index_only_returns_published_comments(): void
    {
        [$course, $lesson, $instructor] = $this->createPublishedLesson();
        $student = User::factory()->create(['role' => 'student']);
        $admin = User::factory()->create(['role' => 'admin']);

        Comment::create([
            'lesson_id' => $lesson->id,
            'user_id' => $instructor->id,
            'body' => 'Visible comment',
            'is_published' => true,
        ]);

        Comment::create([
            'lesson_id' => $lesson->id,
            'user_id' => $student->id,
            'body' => 'Hidden comment',
            'is_published' => false,
        ]);

        Sanctum::actingAs($student);
        $this->postJson("/api/courses/{$course->id}/enrollments")->assertCreated();

        $this->getJson("/api/lessons/{$lesson->id}/comments")
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.body', 'Visible comment');

        Sanctum::actingAs($admin);

        $this->getJson("/api/lessons/{$lesson->id}/comments")
            ->assertOk()
            ->assertJsonCount(2);
    }

    public function test_student_cannot_publish_their_own_comment_but_admin_can_moderate_it(): void
    {
        [$course, $lesson] = $this->createPublishedLesson();
        $student = User::factory()->create(['role' => 'student']);
        $admin = User::factory()->create(['role' => 'admin']);

        Sanctum::actingAs($student);
        $this->postJson("/api/courses/{$course->id}/enrollments")->assertCreated();

        $commentResponse = $this->postJson("/api/lessons/{$lesson->id}/comments", [
            'body' => 'Pending moderation comment',
        ])->assertCreated();

        $commentId = $commentResponse->json('id');

        $this->patchJson("/api/lessons/{$lesson->id}/comments/{$commentId}", [
            'body' => 'Edited body',
            'is_published' => true,
        ])->assertOk()
            ->assertJsonPath('body', 'Edited body')
            ->assertJsonPath('is_published', false);

        Sanctum::actingAs($admin);

        $this->getJson('/api/admin/moderation-queue')
            ->assertOk()
            ->assertJsonFragment([
                'content_type' => 'comment',
            ]);

        $this->patchJson("/api/admin/moderation-queue/comments/{$commentId}", [
            'is_published' => true,
        ])->assertOk()
            ->assertJsonPath('id', $commentId)
            ->assertJsonPath('is_published', true);

        $this->assertDatabaseHas('comments', [
            'id' => $commentId,
            'is_published' => true,
        ]);
    }

    private function createPublishedLesson(): array
    {
        $instructor = User::factory()->create(['role' => 'instructor']);

        $course = Course::create([
            'instructor_id' => $instructor->id,
            'title' => 'Lesson Comment Course',
            'slug' => 'lesson-comment-course',
            'description' => 'Used for lesson comment testing',
            'price' => 15,
            'is_published' => true,
            'published_at' => now(),
        ]);

        $module = Module::create([
            'course_id' => $course->id,
            'title' => 'Module One',
            'slug' => 'module-one',
            'position' => 1,
        ]);

        $lesson = Lesson::create([
            'module_id' => $module->id,
            'title' => 'Commentable Lesson',
            'slug' => 'commentable-lesson',
            'type' => 'text',
            'content' => 'Lesson body',
            'position' => 1,
            'is_preview' => false,
        ]);

        return [$course, $lesson, $instructor];
    }
}
