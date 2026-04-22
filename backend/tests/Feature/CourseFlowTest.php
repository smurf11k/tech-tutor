<?php

namespace Tests\Feature;

use App\Models\Course;
use App\Models\Lesson;
use App\Models\Module;
use App\Models\Progress;
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
}