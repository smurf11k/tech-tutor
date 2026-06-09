<?php

namespace Tests\Feature;

use App\Models\Quiz;
use App\Models\QuizAttempt;
use App\Models\Course;
use App\Models\Lesson;
use App\Models\Module;
use App\Models\User;
use App\Notifications\CommentReplyNotification;
use App\Notifications\CourseSubmittedForApprovalNotification;
use App\Notifications\InstructorQuizResultNotification;
use App\Notifications\LessonSubmittedForApprovalNotification;
use App\Notifications\NewCommentNotification;
use App\Notifications\NewEnrollmentNotification;
use App\Notifications\PublishRequestHandledNotification;
use App\Notifications\QuizAttemptCompletedNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class NotificationPreferenceTest extends TestCase
{
    use RefreshDatabase;

    public function test_profile_update_can_save_granular_notification_preferences(): void
    {
        $user = User::factory()->create([
            'role' => 'student',
            'email_notifications_enabled' => true,
            'email_notifications_comment_reply' => true,
            'email_notifications_thread' => true,
            'email_notifications_quiz_result' => true,
            'email_notifications_new_course' => false,
            'email_notifications_new_content' => true,
            'email_notifications_new_enrollment' => true,
            'email_notifications_instructor_quiz_result' => true,
            'email_notifications_approval_result' => true,
            'email_notifications_course_submitted' => true,
            'email_notifications_lesson_submitted' => true,
        ]);

        Sanctum::actingAs($user);

        $this->patchJson('/api/auth/me', [
            'email_notifications_comment_reply' => false,
            'email_notifications_thread' => false,
            'email_notifications_new_course' => true,
        ])->assertOk()
            ->assertJsonPath('email_notifications_comment_reply', false)
            ->assertJsonPath('email_notifications_thread', false)
            ->assertJsonPath('email_notifications_new_course', true)
            ->assertJsonPath('email_notifications_quiz_result', true);

        $user->refresh();

        $this->assertFalse($user->email_notifications_comment_reply);
        $this->assertFalse($user->email_notifications_thread);
        $this->assertTrue($user->email_notifications_new_course);
        $this->assertTrue($user->email_notifications_quiz_result);
    }

    public function test_comment_reply_notification_respects_preference(): void
    {
        [$course, $lesson] = $this->createPublishedLesson();
        $commentAuthor = User::factory()->create(['role' => 'student']);
        $replyAuthor = User::factory()->create(['role' => 'student']);

        Sanctum::actingAs($commentAuthor);
        $this->postJson("/api/courses/{$course->id}/enrollments")->assertCreated();

        $commentResponse = $this->postJson("/api/lessons/{$lesson->id}/comments", [
            'body' => 'First comment',
        ])->assertCreated();

        $commentId = $commentResponse->json('id');

        Sanctum::actingAs($replyAuthor);
        $this->postJson("/api/courses/{$course->id}/enrollments")->assertCreated();

        Notification::fake();

        $this->postJson("/api/lessons/{$lesson->id}/comments", [
            'body' => 'Reply to first comment',
            'parent_comment_id' => $commentId,
        ])->assertCreated();

        Notification::assertSentTo($commentAuthor, CommentReplyNotification::class);

        $commentAuthor->update(['email_notifications_comment_reply' => false]);

        Notification::fake();

        $this->postJson("/api/lessons/{$lesson->id}/comments", [
            'body' => 'Second reply',
            'parent_comment_id' => $commentId,
        ])->assertCreated();

        Notification::assertNotSentTo($commentAuthor, CommentReplyNotification::class);
    }

    public function test_thread_notification_sent_to_participants(): void
    {
        [$course, $lesson] = $this->createPublishedLesson();
        $participantA = User::factory()->create(['role' => 'student']);
        $participantB = User::factory()->create(['role' => 'student']);
        $newCommenter = User::factory()->create(['role' => 'student']);

        foreach ([$participantA, $participantB, $newCommenter] as $user) {
            Sanctum::actingAs($user);
            $this->postJson("/api/courses/{$course->id}/enrollments")->assertCreated();
        }

        Sanctum::actingAs($participantA);
        $this->postJson("/api/lessons/{$lesson->id}/comments", [
            'body' => 'First comment by A',
        ])->assertCreated();

        Sanctum::actingAs($participantB);
        $this->postJson("/api/lessons/{$lesson->id}/comments", [
            'body' => 'Second comment by B',
        ])->assertCreated();

        Notification::fake();

        Sanctum::actingAs($newCommenter);
        $this->postJson("/api/lessons/{$lesson->id}/comments", [
            'body' => 'Third comment by new user',
        ])->assertCreated();

        Notification::assertSentTo($participantA, NewCommentNotification::class);
        Notification::assertSentTo($participantB, NewCommentNotification::class);
        Notification::assertNotSentTo($newCommenter, NewCommentNotification::class);
    }

    public function test_thread_notification_respects_preference(): void
    {
        [$course, $lesson] = $this->createPublishedLesson();
        $participant = User::factory()->create(['role' => 'student']);
        $newCommenter = User::factory()->create(['role' => 'student']);

        foreach ([$participant, $newCommenter] as $user) {
            Sanctum::actingAs($user);
            $this->postJson("/api/courses/{$course->id}/enrollments")->assertCreated();
        }

        Sanctum::actingAs($participant);
        $this->postJson("/api/lessons/{$lesson->id}/comments", [
            'body' => 'Original comment',
        ])->assertCreated();

        $participant->update(['email_notifications_thread' => false]);

        Notification::fake();

        Sanctum::actingAs($newCommenter);
        $this->postJson("/api/lessons/{$lesson->id}/comments", [
            'body' => 'New top-level comment',
        ])->assertCreated();

        Notification::assertNotSentTo($participant, NewCommentNotification::class);
    }

    public function test_decline_notification_sent_regardless_of_preferences(): void
    {
        $instructor = User::factory()->create(['role' => 'instructor']);
        $admin = User::factory()->create(['role' => 'admin']);

        $instructor->update([
            'email_notifications_enabled' => false,
            'email_notifications_approval_result' => false,
        ]);

        Sanctum::actingAs($instructor);

        $courseId = $this->postJson('/api/courses', [
            'title' => 'Decline Test Course',
            'slug' => 'decline-test-course',
            'price' => 0,
            'request_publish' => true,
        ])->assertCreated()->json('id');

        Notification::fake();

        Sanctum::actingAs($admin);

        $this->patchJson("/api/courses/{$courseId}", [
            'decline_publish' => true,
            'publish_request_declined_reason' => 'Needs more content.',
        ])->assertOk();

        Notification::assertSentTo($instructor, PublishRequestHandledNotification::class);
    }

    public function test_instructor_receives_enrollment_notification_when_enabled(): void
    {
        $instructor = User::factory()->create(['role' => 'instructor']);
        $student = User::factory()->create(['role' => 'student']);

        Sanctum::actingAs($instructor);

        $this->postJson('/api/courses', [
            'title' => 'Enrollment Notify Course',
            'slug' => 'enrollment-notify-course',
            'price' => 0,
        ])->assertCreated();

        $course = Course::query()->firstOrFail();

        Sanctum::actingAs($student);
        $this->postJson("/api/courses/{$course->id}/enrollments")->assertCreated();

        Notification::assertSentTo($instructor, NewEnrollmentNotification::class);

        $instructor->update(['email_notifications_new_enrollment' => false]);

        Notification::fake();

        $newStudent = User::factory()->create(['role' => 'student']);
        Sanctum::actingAs($newStudent);
        $this->postJson("/api/courses/{$course->id}/enrollments")->assertCreated();

        Notification::assertNotSentTo($instructor, NewEnrollmentNotification::class);
    }

    public function test_quiz_result_notification_respects_student_preference(): void
    {
        $instructor = User::factory()->create(['role' => 'instructor']);
        $student = User::factory()->create(['role' => 'student']);

        $course = Course::create([
            'instructor_id' => $instructor->id,
            'title' => 'Quiz Preference Course',
            'slug' => 'quiz-preference-course',
            'description' => 'Quiz preference test',
            'price' => 0,
            'is_published' => true,
            'published_at' => now(),
        ]);

        $module = Module::create([
            'course_id' => $course->id,
            'title' => 'Quiz Module',
            'slug' => 'quiz-module',
            'position' => 1,
        ]);

        $quiz = Quiz::create([
            'course_id' => $course->id,
            'module_id' => $module->id,
            'title' => 'Preference Quiz',
            'pass_score' => 60,
            'is_published' => true,
            'position' => 1,
        ]);

        $question = $quiz->questions()->create([
            'type' => 'single_choice',
            'prompt' => 'Correct answer?',
            'options' => [
                ['key' => 'a', 'text' => 'A', 'is_correct' => true],
                ['key' => 'b', 'text' => 'B'],
            ],
            'correct_answers' => ['a'],
            'points' => 1,
            'position' => 1,
        ]);

        Sanctum::actingAs($student);
        $this->postJson("/api/courses/{$course->id}/enrollments")->assertCreated();

        $student->update(['email_notifications_quiz_result' => false]);

        Notification::fake();

        $this->postJson("/api/quizzes/{$quiz->id}/attempts", [
            'answers' => [(string) $question->id => 'a'],
        ])->assertCreated();

        Notification::assertNotSentTo($student, QuizAttemptCompletedNotification::class);
    }

    public function test_instructor_quiz_result_notification_sent_when_preference_enabled(): void
    {
        $instructor = User::factory()->create(['role' => 'instructor']);
        $student = User::factory()->create(['role' => 'student']);

        $course = Course::create([
            'instructor_id' => $instructor->id,
            'title' => 'Instructor Quiz Course',
            'slug' => 'instructor-quiz-course',
            'description' => 'Instructor quiz notification test',
            'price' => 0,
            'is_published' => true,
            'published_at' => now(),
        ]);

        $module = Module::create([
            'course_id' => $course->id,
            'title' => 'Module',
            'slug' => 'module',
            'position' => 1,
        ]);

        $quiz = Quiz::create([
            'course_id' => $course->id,
            'module_id' => $module->id,
            'title' => 'Instructor Quiz',
            'pass_score' => 60,
            'is_published' => true,
            'position' => 1,
        ]);

        $question = $quiz->questions()->create([
            'type' => 'single_choice',
            'prompt' => 'Answer?',
            'options' => [
                ['key' => 'a', 'text' => 'A', 'is_correct' => true],
                ['key' => 'b', 'text' => 'B'],
            ],
            'correct_answers' => ['a'],
            'points' => 1,
            'position' => 1,
        ]);

        Sanctum::actingAs($student);
        $this->postJson("/api/courses/{$course->id}/enrollments")->assertCreated();

        Notification::fake();

        $this->postJson("/api/quizzes/{$quiz->id}/attempts", [
            'answers' => [(string) $question->id => 'a'],
        ])->assertCreated();

        Notification::assertSentTo($instructor, QuizAttemptCompletedNotification::class);

        $instructor->update(['email_notifications_instructor_quiz_result' => false]);

        Notification::fake();

        $newStudent = User::factory()->create(['role' => 'student']);
        Sanctum::actingAs($newStudent);
        $this->postJson("/api/courses/{$course->id}/enrollments")->assertCreated();

        $this->postJson("/api/quizzes/{$quiz->id}/attempts", [
            'answers' => [(string) $question->id => 'a'],
        ])->assertCreated();

        Notification::assertNotSentTo($instructor, QuizAttemptCompletedNotification::class);
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
