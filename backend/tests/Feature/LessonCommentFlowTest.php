<?php

namespace Tests\Feature;

use App\Models\Comment;
use App\Models\Course;
use App\Models\Lesson;
use App\Models\Module;
use App\Models\Review;
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
            ->assertJsonPath('is_published', true);

        $this->assertDatabaseHas('comments', [
            'lesson_id' => $lesson->id,
            'user_id' => $student->id,
            'is_published' => true,
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

    public function test_non_admin_comment_index_returns_published_and_own_unpublished_comments(): void
    {
        [$course, $lesson, $instructor] = $this->createPublishedLesson();
        $student = User::factory()->create(['role' => 'student']);
        $admin = User::factory()->create(['role' => 'admin']);

        $otherStudent = User::factory()->create(['role' => 'student']);

        Comment::create([
            'lesson_id' => $lesson->id,
            'user_id' => $instructor->id,
            'body' => 'Visible comment',
            'is_published' => true,
        ]);

        Comment::create([
            'lesson_id' => $lesson->id,
            'user_id' => $student->id,
            'body' => 'Own unpublished comment',
            'is_published' => false,
        ]);

        Comment::create([
            'lesson_id' => $lesson->id,
            'user_id' => $otherStudent->id,
            'body' => 'Other user unpublished comment',
            'is_published' => false,
        ]);

        Sanctum::actingAs($student);
        $this->postJson("/api/courses/{$course->id}/enrollments")->assertCreated();

        $this->getJson("/api/lessons/{$lesson->id}/comments")
            ->assertOk()
            ->assertJsonCount(2);

        $response = $this->getJson("/api/lessons/{$lesson->id}/comments");
        $bodies = collect($response->json())->pluck('body')->all();
        $this->assertContains('Visible comment', $bodies);
        $this->assertContains('Own unpublished comment', $bodies);

        Sanctum::actingAs($admin);

        $this->getJson("/api/lessons/{$lesson->id}/comments")
            ->assertOk()
            ->assertJsonCount(3);
    }

    public function test_comments_do_not_appear_in_admin_moderation_queue(): void
    {
        [$course, $lesson] = $this->createPublishedLesson();
        $student = User::factory()->create(['role' => 'student']);
        $admin = User::factory()->create(['role' => 'admin']);

        Sanctum::actingAs($student);
        $this->postJson("/api/courses/{$course->id}/enrollments")->assertCreated();

        $this->postJson("/api/lessons/{$lesson->id}/comments", [
            'body' => 'A regular comment that should not need moderation.',
        ])->assertCreated();

        Review::create([
            'course_id' => $course->id,
            'user_id' => $student->id,
            'rating' => 5,
            'comment' => 'Great course!',
            'is_published' => false,
        ]);

        Sanctum::actingAs($admin);

        $this->getJson('/api/admin/moderation-queue')
            ->assertOk()
            ->assertJsonFragment([
                'content_type' => 'review',
            ])
            ->assertJsonMissing([
                'content_type' => 'comment',
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
            'price' => 0,
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
            'type' => 'lesson',
            'content' => 'Lesson body',
            'position' => 1,
            'is_published' => true,
        ]);

        return [$course, $lesson, $instructor];
    }
}
