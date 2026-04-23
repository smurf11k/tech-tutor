<?php

namespace Tests\Feature;

use App\Models\Course;
use App\Models\Module;
use App\Models\Quiz;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class QuizFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_instructor_can_create_quiz_and_student_can_submit_attempt(): void
    {
        $instructor = User::factory()->create(['role' => 'instructor']);
        $student = User::factory()->create(['role' => 'student']);

        Sanctum::actingAs($instructor);

        $this->postJson('/api/courses', [
            'title' => 'Testing Course',
            'slug' => 'testing-course',
            'description' => 'Intro course',
            'price' => 19.99,
        ])->assertCreated();

        $course = Course::query()->firstOrFail();

        $this->postJson("/api/courses/{$course->id}/quizzes", [
            'title' => 'Final Quiz',
            'description' => 'End of course quiz',
            'pass_score' => 60,
            'is_published' => true,
        ])->assertCreated();

        $quiz = Quiz::query()->firstOrFail();

        $module = Module::create([
            'course_id' => $course->id,
            'title' => 'Core',
            'slug' => 'core',
            'position' => 1,
        ]);

        Sanctum::actingAs($student);

        $this->postJson("/api/courses/{$course->id}/enrollments")->assertCreated();

        $this->postJson("/api/quizzes/{$quiz->id}/attempts", [
            'answers' => ['q1' => 'a'],
            'score' => 80,
        ])->assertCreated();

        $this->assertDatabaseHas('quiz_attempts', [
            'quiz_id' => $quiz->id,
            'user_id' => $student->id,
            'score' => 80,
            'passed' => 1,
        ]);
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
            'price' => 10,
            'is_published' => true,
        ])->assertCreated();

        $course = Course::query()->firstOrFail();

        $this->postJson("/api/courses/{$course->id}/quizzes", [
            'title' => 'Draft Quiz',
            'description' => 'Not available yet',
            'pass_score' => 60,
            'is_published' => false,
        ])->assertCreated();

        $quiz = Quiz::query()->firstOrFail();

        Sanctum::actingAs($student);

        $this->postJson("/api/courses/{$course->id}/enrollments")->assertCreated();

        $this->postJson("/api/quizzes/{$quiz->id}/attempts", [
            'answers' => ['q1' => 'a'],
            'score' => 80,
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
            'price' => 10,
            'is_published' => true,
        ])->assertCreated();

        $course = Course::query()->firstOrFail();

        $this->postJson("/api/courses/{$course->id}/quizzes", [
            'title' => 'Limited Quiz',
            'description' => 'Three tries only',
            'pass_score' => 60,
            'is_published' => true,
        ])->assertCreated();

        $quiz = Quiz::query()->firstOrFail();

        Sanctum::actingAs($student);

        $this->postJson("/api/courses/{$course->id}/enrollments")->assertCreated();

        $this->postJson("/api/quizzes/{$quiz->id}/attempts", [
            'answers' => ['q1' => 'a1'],
            'score' => 20,
        ])->assertCreated();

        $this->postJson("/api/quizzes/{$quiz->id}/attempts", [
            'answers' => ['q1' => 'a2'],
            'score' => 40,
        ])->assertCreated();

        $this->postJson("/api/quizzes/{$quiz->id}/attempts", [
            'answers' => ['q1' => 'a3'],
            'score' => 60,
        ])->assertCreated();

        $this->postJson("/api/quizzes/{$quiz->id}/attempts", [
            'answers' => ['q1' => 'a4'],
            'score' => 80,
        ])->assertStatus(422);

        $this->assertDatabaseCount('quiz_attempts', 3);
    }
}