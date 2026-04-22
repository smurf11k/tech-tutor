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
}