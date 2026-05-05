<?php

namespace Tests\Feature;

use App\Models\Course;
use App\Models\CourseCertificate;
use App\Models\Enrollment;
use App\Models\Lesson;
use App\Models\Module;
use App\Models\Payment;
use App\Models\Progress;
use App\Models\Quiz;
use App\Models\QuizAttempt;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class InstructorDashboardFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_instructor_can_fetch_live_dashboard_metrics_for_their_courses(): void
    {
        $instructor = User::factory()->create(['role' => 'instructor']);
        $otherInstructor = User::factory()->create(['role' => 'instructor']);
        $studentA = User::factory()->create(['role' => 'student']);
        $studentB = User::factory()->create(['role' => 'student']);
        $studentC = User::factory()->create(['role' => 'student']);

        $course = Course::create([
            'instructor_id' => $instructor->id,
            'title' => 'Dashboard Course',
            'slug' => 'dashboard-course',
            'description' => 'Instructor dashboard test',
            'price' => 50,
            'is_published' => true,
            'published_at' => now(),
        ]);

        $otherCourse = Course::create([
            'instructor_id' => $otherInstructor->id,
            'title' => 'Other Course',
            'slug' => 'other-course',
            'description' => 'Should not appear',
            'price' => 75,
            'is_published' => true,
            'published_at' => now(),
        ]);

        $module = Module::create([
            'course_id' => $course->id,
            'title' => 'Dashboard Module',
            'slug' => 'dashboard-module',
            'position' => 1,
        ]);

        $firstLesson = Lesson::create([
            'module_id' => $module->id,
            'title' => 'First',
            'slug' => 'first-dashboard',
            'type' => 'text',
            'position' => 1,
        ]);

        $secondLesson = Lesson::create([
            'module_id' => $module->id,
            'title' => 'Second',
            'slug' => 'second-dashboard',
            'type' => 'text',
            'position' => 2,
        ]);

        foreach ([$studentA, $studentB] as $student) {
            Enrollment::create([
                'course_id' => $course->id,
                'user_id' => $student->id,
                'status' => 'active',
                'enrolled_at' => now(),
            ]);
        }

        Enrollment::create([
            'course_id' => $otherCourse->id,
            'user_id' => $studentC->id,
            'status' => 'active',
            'enrolled_at' => now(),
        ]);

        Progress::create([
            'user_id' => $studentA->id,
            'lesson_id' => $firstLesson->id,
            'progress_percent' => 100,
            'completed_at' => now(),
        ]);

        Progress::create([
            'user_id' => $studentA->id,
            'lesson_id' => $secondLesson->id,
            'progress_percent' => 100,
            'completed_at' => now(),
        ]);

        Progress::create([
            'user_id' => $studentB->id,
            'lesson_id' => $firstLesson->id,
            'progress_percent' => 100,
            'completed_at' => now(),
        ]);

        CourseCertificate::create([
            'course_id' => $course->id,
            'user_id' => $studentA->id,
            'certificate_number' => 'TT-DASHBOARD-1',
            'issued_at' => now(),
        ]);

        Payment::create([
            'course_id' => $course->id,
            'user_id' => $studentA->id,
            'provider' => 'stripe',
            'amount' => 50,
            'currency' => 'USD',
            'status' => 'paid',
            'transaction_id' => 'dashboard_paid_1',
            'paid_at' => now(),
        ]);

        Payment::create([
            'course_id' => $course->id,
            'user_id' => $studentB->id,
            'provider' => 'stripe',
            'amount' => 50,
            'currency' => 'USD',
            'status' => 'paid',
            'transaction_id' => 'dashboard_paid_2',
            'paid_at' => now(),
        ]);

        $quiz = Quiz::create([
            'course_id' => $course->id,
            'title' => 'Dashboard Quiz',
            'pass_score' => 70,
            'is_published' => true,
        ]);

        QuizAttempt::create([
            'quiz_id' => $quiz->id,
            'user_id' => $studentA->id,
            'score' => 80,
            'passed' => true,
            'answers' => [],
            'completed_at' => now(),
        ]);

        QuizAttempt::create([
            'quiz_id' => $quiz->id,
            'user_id' => $studentB->id,
            'score' => 60,
            'passed' => false,
            'answers' => [],
            'completed_at' => now(),
        ]);

        Sanctum::actingAs($studentA);
        $this->getJson('/api/instructor/dashboard')->assertForbidden();

        Sanctum::actingAs($instructor);

        $this->getJson('/api/instructor/dashboard')
            ->assertOk()
            ->assertJsonPath('summary.courses_count', 1)
            ->assertJsonPath('summary.published_courses_count', 1)
            ->assertJsonPath('summary.enrollments_count', 2)
            ->assertJsonPath('summary.certificates_count', 1)
            ->assertJsonPath('summary.revenue_total', '100.00')
            ->assertJsonPath('summary.average_progress', 75)
            ->assertJsonPath('summary.average_quiz_score', 70)
            ->assertJsonPath('courses.0.course_id', $course->id)
            ->assertJsonPath('courses.0.lessons_count', 2)
            ->assertJsonPath('courses.0.enrollments_count', 2)
            ->assertJsonPath('courses.0.certificates_count', 1)
            ->assertJsonPath('courses.0.completion_rate', 50)
            ->assertJsonPath('courses.0.average_progress', 75)
            ->assertJsonPath('courses.0.average_quiz_score', 70)
            ->assertJsonPath('courses.0.payments_count', 2)
            ->assertJsonPath('courses.0.revenue_total', '100.00');

        Sanctum::actingAs($otherInstructor);
        $this->getJson('/api/instructor/dashboard')
            ->assertOk()
            ->assertJsonPath('summary.courses_count', 1)
            ->assertJsonPath('courses.0.course_id', $otherCourse->id);
    }
}
