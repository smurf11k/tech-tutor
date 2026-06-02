<?php

namespace Tests\Feature;

use App\Models\Course;
use App\Models\Module;
use App\Models\Quiz;
use App\Models\QuizRevision;
use App\Models\User;
use App\Notifications\QuizAttemptCompletedNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class QuizFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_instructor_can_create_quiz_and_student_can_submit_attempt(): void
    {
        Notification::fake();

        $instructor = User::factory()->create(['role' => 'instructor']);
        $student = User::factory()->create(['role' => 'student']);

        Sanctum::actingAs($instructor);

        $this->postJson('/api/courses', [
            'title' => 'Testing Course',
            'slug' => 'testing-course',
            'description' => 'Intro course',
            'price' => 0,
        ])->assertCreated();

        $course = Course::query()->firstOrFail();

        $quizResponse = $this->postJson("/api/courses/{$course->id}/quizzes", [
            'title' => 'Final Quiz',
            'description' => 'End of course quiz',
            'pass_score' => 60,
            'is_published' => true,
            'questions' => [
                [
                    'type' => 'single_choice',
                    'prompt' => 'Which framework powers this API?',
                    'points' => 1,
                    'options' => [
                        ['key' => 'laravel', 'text' => 'Laravel', 'is_correct' => true],
                        ['key' => 'react', 'text' => 'React'],
                    ],
                ],
                [
                    'type' => 'multiple_choice',
                    'prompt' => 'Which features are backend responsibilities?',
                    'points' => 2,
                    'options' => [
                        ['key' => 'policies', 'text' => 'Policies', 'is_correct' => true],
                        ['key' => 'migrations', 'text' => 'Migrations', 'is_correct' => true],
                        ['key' => 'tailwind', 'text' => 'Tailwind classes'],
                    ],
                ],
            ],
        ])->assertCreated();

        $quiz = Quiz::query()->firstOrFail();
        $questionIds = $quiz->questions()->pluck('id')->values();

        // correct_answers should be present when instructor creates/edits quiz
        $quizResponse->assertJsonPath('questions.0.correct_answers', ['laravel']);

        Sanctum::actingAs($student);

        $this->postJson("/api/courses/{$course->id}/enrollments")->assertCreated();

        $this->postJson("/api/quizzes/{$quiz->id}/attempts", [
            'answers' => [
                (string) $questionIds[0] => 'laravel',
                (string) $questionIds[1] => ['migrations', 'policies'],
            ],
        ])->assertCreated()
            ->assertJsonPath('score', 100)
            ->assertJsonPath('passed', true);

        Notification::assertSentTo($student, QuizAttemptCompletedNotification::class);

        $this->assertDatabaseHas('quiz_attempts', [
            'quiz_id' => $quiz->id,
            'user_id' => $student->id,
            'score' => 100,
            'passed' => 1,
        ]);
    }

    public function test_quiz_attempt_score_is_calculated_by_backend(): void
    {
        $instructor = User::factory()->create(['role' => 'instructor']);
        $student = User::factory()->create(['role' => 'student']);

        $course = Course::create([
            'instructor_id' => $instructor->id,
            'title' => 'Scored Quiz Course',
            'slug' => 'scored-quiz-course',
            'description' => 'Backend scoring test',
            'price' => 0,
            'is_published' => true,
            'published_at' => now(),
        ]);

        Sanctum::actingAs($instructor);

        $this->postJson("/api/courses/{$course->id}/quizzes", [
            'title' => 'Scored Quiz',
            'pass_score' => 70,
            'is_published' => true,
            'questions' => [
                [
                    'type' => 'single_choice',
                    'prompt' => 'Pick A',
                    'options' => [
                        ['key' => 'a', 'text' => 'A', 'is_correct' => true],
                        ['key' => 'b', 'text' => 'B'],
                    ],
                ],
                [
                    'type' => 'single_choice',
                    'prompt' => 'Pick C',
                    'options' => [
                        ['key' => 'c', 'text' => 'C', 'is_correct' => true],
                        ['key' => 'd', 'text' => 'D'],
                    ],
                ],
            ],
        ])->assertCreated();

        $quiz = Quiz::query()->firstOrFail();
        $questionIds = $quiz->questions()->pluck('id')->values();

        Sanctum::actingAs($student);
        $this->postJson("/api/courses/{$course->id}/enrollments")->assertCreated();

        $this->postJson("/api/quizzes/{$quiz->id}/attempts", [
            'answers' => [
                (string) $questionIds[0] => 'a',
                (string) $questionIds[1] => 'd',
            ],
        ])->assertCreated()
            ->assertJsonPath('score', 50)
            ->assertJsonPath('passed', false);

        $this->postJson("/api/quizzes/{$quiz->id}/attempts", [
            'answers' => [
                (string) $questionIds[0] => 'a',
                (string) $questionIds[1] => 'c',
            ],
            'score' => 100,
        ])->assertJsonValidationErrors('score');
    }

    public function test_instructor_can_fetch_live_quiz_analytics(): void
    {
        $instructor = User::factory()->create(['role' => 'instructor']);
        $otherInstructor = User::factory()->create(['role' => 'instructor']);
        $studentA = User::factory()->create(['role' => 'student']);
        $studentB = User::factory()->create(['role' => 'student']);
        $admin = User::factory()->create(['role' => 'admin']);

        $course = Course::create([
            'instructor_id' => $instructor->id,
            'title' => 'Analytics Quiz Course',
            'slug' => 'analytics-quiz-course',
            'description' => 'Quiz analytics test',
            'price' => 0,
            'is_published' => true,
            'published_at' => now(),
        ]);

        Sanctum::actingAs($instructor);

        $this->postJson("/api/courses/{$course->id}/quizzes", [
            'title' => 'Analytics Quiz',
            'pass_score' => 70,
            'is_published' => true,
            'questions' => [
                [
                    'type' => 'single_choice',
                    'prompt' => 'Pick A',
                    'points' => 1,
                    'options' => [
                        ['key' => 'a', 'text' => 'A', 'is_correct' => true],
                        ['key' => 'b', 'text' => 'B'],
                    ],
                ],
                [
                    'type' => 'multiple_choice',
                    'prompt' => 'Pick C and D',
                    'points' => 1,
                    'options' => [
                        ['key' => 'c', 'text' => 'C', 'is_correct' => true],
                        ['key' => 'd', 'text' => 'D', 'is_correct' => true],
                        ['key' => 'e', 'text' => 'E'],
                    ],
                ],
            ],
        ])->assertCreated();

        $quiz = Quiz::query()->firstOrFail();
        $questionIds = $quiz->questions()->pluck('id')->values();

        Sanctum::actingAs($studentA);
        $this->postJson("/api/courses/{$course->id}/enrollments")->assertCreated();
        $this->postJson("/api/quizzes/{$quiz->id}/attempts", [
            'answers' => [
                (string) $questionIds[0] => 'a',
                (string) $questionIds[1] => ['c', 'd'],
            ],
        ])->assertCreated();

        Sanctum::actingAs($studentB);
        $this->postJson("/api/courses/{$course->id}/enrollments")->assertCreated();
        $this->postJson("/api/quizzes/{$quiz->id}/attempts", [
            'answers' => [
                (string) $questionIds[0] => 'a',
                (string) $questionIds[1] => ['c'],
            ],
        ])->assertCreated();

        Sanctum::actingAs($studentA);
        $this->getJson("/api/quizzes/{$quiz->id}/analytics")->assertForbidden();

        Sanctum::actingAs($otherInstructor);
        $this->getJson("/api/quizzes/{$quiz->id}/analytics")->assertForbidden();

        Sanctum::actingAs($instructor);
        $this->getJson("/api/quizzes/{$quiz->id}/analytics")
            ->assertOk()
            ->assertJsonPath('attempts_count', 2)
            ->assertJsonPath('unique_students_count', 2)
            ->assertJsonPath('average_score', 75)
            ->assertJsonPath('highest_score', 100)
            ->assertJsonPath('lowest_score', 50)
            ->assertJsonPath('passed_count', 1)
            ->assertJsonPath('failed_count', 1)
            ->assertJsonPath('pass_rate', 50)
            ->assertJsonPath('question_breakdown.0.correct_rate', 100)
            ->assertJsonPath('question_breakdown.1.correct_rate', 50);

        Sanctum::actingAs($admin);
        $this->getJson("/api/quizzes/{$quiz->id}/analytics")->assertOk();
    }

    public function test_instructor_quiz_update_creates_pending_revision_and_admin_can_publish_it(): void
    {
        $instructor = User::factory()->create(['role' => 'instructor']);
        $admin = User::factory()->create(['role' => 'admin']);
        $student = User::factory()->create(['role' => 'student']);

        $course = Course::create([
            'instructor_id' => $instructor->id,
            'title' => 'Quiz Revision Course',
            'slug' => 'quiz-revision-course',
            'description' => 'Revision flow test',
            'price' => 0,
            'is_published' => true,
            'published_at' => now(),
        ]);

        $module = Module::create([
            'course_id' => $course->id,
            'title' => 'Revision Module',
            'slug' => 'revision-module',
            'position' => 1,
        ]);

        Sanctum::actingAs($admin);

        $this->postJson("/api/courses/{$course->id}/quizzes", [
            'title' => 'Original Quiz',
            'module_id' => $module->id,
            'pass_score' => 60,
            'revision_status' => 'published',
            'is_published' => true,
            'questions' => [
                [
                    'type' => 'single_choice',
                    'prompt' => 'Pick Laravel',
                    'points' => 1,
                    'options' => [
                        ['key' => 'a', 'text' => 'Laravel', 'is_correct' => true],
                        ['key' => 'b', 'text' => 'React'],
                    ],
                ],
            ],
        ])->assertCreated();

        $quiz = Quiz::query()->firstOrFail();

        Sanctum::actingAs($instructor);

        $this->putJson("/api/courses/{$course->id}/quizzes/{$quiz->id}", [
            'title' => 'Updated Quiz',
            'module_id' => $module->id,
            'pass_score' => 80,
            'revision_status' => 'pending_review',
            'is_published' => false,
            'questions' => [
                [
                    'type' => 'single_choice',
                    'prompt' => 'Pick the backend framework',
                    'points' => 1,
                    'options' => [
                        ['key' => 'a', 'text' => 'Laravel', 'is_correct' => true],
                        ['key' => 'b', 'text' => 'Tailwind'],
                    ],
                ],
            ],
        ])->assertOk()
            ->assertJsonPath('title', 'Original Quiz');

        $this->assertDatabaseHas('quiz_revisions', [
            'quiz_id' => $quiz->id,
            'status' => 'pending_review',
            'title' => 'Updated Quiz',
        ]);

        $this->getJson("/api/courses/{$course->id}/quizzes/{$quiz->id}")
            ->assertOk()
            ->assertJsonPath('title', 'Original Quiz')
            ->assertJsonPath('latest_revision.status', 'pending_review')
            ->assertJsonPath('latest_revision.title', 'Updated Quiz');

        $this->getJson("/api/courses/{$course->id}")
            ->assertOk()
            ->assertJsonPath('modules.0.quizzes.0.latest_revision.status', 'pending_review')
            ->assertJsonPath('modules.0.quizzes.0.latest_revision.title', 'Updated Quiz');

        Sanctum::actingAs($admin);

        $queueResponse = $this->getJson('/api/admin/moderation-queue')
            ->assertOk()
            ->assertJsonFragment([
                'content_type' => 'quiz_revision',
            ]);

        $revisionId = QuizRevision::query()
            ->where('quiz_id', $quiz->id)
            ->where('status', 'pending_review')
            ->value('id');

        $this->patchJson("/api/admin/moderation-queue/quiz-revisions/{$revisionId}", [
            'action' => 'accept',
        ])->assertOk();

        $this->assertDatabaseHas('quizzes', [
            'id' => $quiz->id,
            'title' => 'Updated Quiz',
            'is_published' => true,
        ]);

        $this->assertDatabaseHas('quiz_revisions', [
            'id' => $revisionId,
            'status' => 'published',
            'title' => 'Updated Quiz',
        ]);

        Sanctum::actingAs($student);

        $this->getJson("/api/courses/{$course->id}/quizzes/{$quiz->id}")
            ->assertOk()
            ->assertJsonPath('title', 'Updated Quiz');
    }

    public function test_student_cannot_attempt_unpublished_quiz(): void
    {
        $instructor = User::factory()->create(['role' => 'instructor']);
        $student = User::factory()->create(['role' => 'student']);

        Sanctum::actingAs($instructor);

        $this->postJson('/api/courses', [
            'title' => 'Unpublished Quiz Course',
            'slug' => 'unpublished-quiz-course',
            'description' => 'Draft quiz access test',
            'price' => 0,
        ])->assertCreated();

        $course = Course::query()->firstOrFail();

        // Admin publishes the course
        $admin = User::factory()->create(['role' => 'admin']);
        Sanctum::actingAs($admin);
        $this->patchJson("/api/courses/{$course->id}", ['is_published' => true])->assertOk();

        Sanctum::actingAs($instructor);

        $this->postJson("/api/courses/{$course->id}/quizzes", [
            'title' => 'Draft Quiz',
            'description' => 'Not available yet',
            'pass_score' => 60,
            'is_published' => false,
            'questions' => [
                [
                    'type' => 'single_choice',
                    'prompt' => 'Draft question',
                    'options' => [
                        ['key' => 'a', 'text' => 'A', 'is_correct' => true],
                        ['key' => 'b', 'text' => 'B'],
                    ],
                ],
            ],
        ])->assertCreated();

        $quiz = Quiz::query()->firstOrFail();
        $questionId = $quiz->questions()->value('id');

        Sanctum::actingAs($student);

        $this->postJson("/api/courses/{$course->id}/enrollments")->assertCreated();

        $this->postJson("/api/quizzes/{$quiz->id}/attempts", [
            'answers' => [(string) $questionId => 'a'],
        ])->assertForbidden();

        $this->assertDatabaseCount('quiz_attempts', 0);
    }

    public function test_student_cannot_exceed_quiz_attempt_limit(): void
    {
        $instructor = User::factory()->create(['role' => 'instructor']);
        $student = User::factory()->create(['role' => 'student']);

        Sanctum::actingAs($instructor);

        $this->postJson('/api/courses', [
            'title' => 'Attempt Limit Course',
            'slug' => 'attempt-limit-course',
            'description' => 'Attempt cap test',
            'price' => 0,
        ])->assertCreated();

        $course = Course::query()->firstOrFail();

        $admin = User::factory()->create(['role' => 'admin']);
        Sanctum::actingAs($admin);
        $this->patchJson("/api/courses/{$course->id}", ['is_published' => true])->assertOk();

        Sanctum::actingAs($instructor);

        $this->postJson("/api/courses/{$course->id}/quizzes", [
            'title' => 'Limited Quiz',
            'description' => 'Three tries only',
            'pass_score' => 60,
            'is_published' => true,
            'questions' => [
                [
                    'type' => 'single_choice',
                    'prompt' => 'Limited question',
                    'options' => [
                        ['key' => 'a', 'text' => 'A', 'is_correct' => true],
                        ['key' => 'b', 'text' => 'B'],
                    ],
                ],
            ],
        ])->assertCreated();

        $quiz = Quiz::query()->firstOrFail();
        $questionId = $quiz->questions()->value('id');

        Sanctum::actingAs($student);

        $this->postJson("/api/courses/{$course->id}/enrollments")->assertCreated();

        $this->postJson("/api/quizzes/{$quiz->id}/attempts", [
            'answers' => [(string) $questionId => 'b'],
        ])->assertCreated();

        $this->postJson("/api/quizzes/{$quiz->id}/attempts", [
            'answers' => [(string) $questionId => 'b'],
        ])->assertCreated();

        $this->postJson("/api/quizzes/{$quiz->id}/attempts", [
            'answers' => [(string) $questionId => 'a'],
        ])->assertCreated();

        $this->postJson("/api/quizzes/{$quiz->id}/attempts", [
            'answers' => [(string) $questionId => 'a'],
        ])->assertStatus(422);

        $this->assertDatabaseCount('quiz_attempts', 3);
    }

    public function test_instructor_can_delete_a_never_published_quiz_but_must_unpublish_a_published_one_first(): void
    {
        $instructor = User::factory()->create(['role' => 'instructor']);

        $course = Course::create([
            'instructor_id' => $instructor->id,
            'title' => 'Quiz Deletion Course',
            'slug' => 'quiz-deletion-course',
            'description' => 'Quiz deletion rules',
            'price' => 0,
            'is_published' => true,
            'published_at' => now(),
        ]);

        Sanctum::actingAs($instructor);

        $draftResponse = $this->postJson("/api/courses/{$course->id}/quizzes", [
            'title' => 'Draft Quiz',
            'description' => 'Draft quiz content',
            'revision_status' => 'draft',
            'questions' => [
                [
                    'type' => 'single_choice',
                    'prompt' => 'Pick A',
                    'options' => [
                        ['key' => 'a', 'text' => 'A', 'is_correct' => true],
                        ['key' => 'b', 'text' => 'B'],
                    ],
                ],
            ],
        ])->assertCreated();

        $draftQuizId = $draftResponse->json('id');

        $this->deleteJson("/api/courses/{$course->id}/quizzes/{$draftQuizId}")
            ->assertNoContent();

        $this->assertDatabaseMissing('quizzes', [
            'id' => $draftQuizId,
        ]);

        $publishedQuiz = Quiz::create([
            'course_id' => $course->id,
            'title' => 'Published Quiz',
            'description' => 'Published quiz content',
            'pass_score' => 70,
            'is_published' => true,
            'position' => 1,
        ]);

        $this->deleteJson("/api/courses/{$course->id}/quizzes/{$publishedQuiz->id}")
            ->assertStatus(409);
    }

    public function test_instructor_can_request_unpublish_and_admin_can_finalize_it_for_quiz(): void
    {
        $instructor = User::factory()->create(['role' => 'instructor']);
        $admin = User::factory()->create(['role' => 'admin']);

        $course = Course::create([
            'instructor_id' => $instructor->id,
            'title' => 'Quiz Request Course',
            'slug' => 'quiz-request-course',
            'description' => 'Quiz request unpublish flow',
            'price' => 0,
            'is_published' => true,
            'published_at' => now(),
        ]);

        $quiz = Quiz::create([
            'course_id' => $course->id,
            'title' => 'Request Quiz',
            'description' => 'Current quiz content',
            'pass_score' => 70,
            'is_published' => true,
            'position' => 1,
        ]);

        $quiz->questions()->create([
            'type' => 'single_choice',
            'prompt' => 'Pick A',
            'options' => [['key' => 'a', 'text' => 'A', 'is_correct' => true], ['key' => 'b', 'text' => 'B']],
            'correct_answers' => ['a'],
            'points' => 1,
            'position' => 1,
        ]);

        Sanctum::actingAs($instructor);

        $this->putJson("/api/courses/{$course->id}/quizzes/{$quiz->id}", [
            'title' => 'Request Quiz',
            'description' => 'Current quiz content',
            'pass_score' => 70,
            'revision_status' => 'pending_unpublish',
            'is_published' => false,
            'questions' => [
                [
                    'type' => 'single_choice',
                    'prompt' => 'Pick A',
                    'points' => 1,
                    'options' => [
                        ['key' => 'a', 'text' => 'A', 'is_correct' => true],
                        ['key' => 'b', 'text' => 'B'],
                    ],
                ],
            ],
        ])->assertOk();

        $revisionId = QuizRevision::query()
            ->where('quiz_id', $quiz->id)
            ->where('status', 'pending_unpublish')
            ->value('id');

        $this->assertNotNull($revisionId);
        $this->assertDatabaseHas('quiz_revisions', [
            'id' => $revisionId,
            'is_published' => false,
            'status' => 'pending_unpublish',
        ]);

        Sanctum::actingAs($admin);

        $this->patchJson("/api/admin/moderation-queue/quiz-revisions/{$revisionId}", [
            'action' => 'accept',
        ])->assertOk();

        $this->assertDatabaseHas('quizzes', [
            'id' => $quiz->id,
            'is_published' => false,
        ]);

        $revision = QuizRevision::query()->findOrFail($revisionId);
        $this->assertSame('draft', $revision->status);
        $this->assertNotNull($revision->unpublished_at);
    }
}
