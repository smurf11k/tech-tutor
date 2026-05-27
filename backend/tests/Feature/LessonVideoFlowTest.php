<?php

namespace Tests\Feature;

use App\Models\Course;
use App\Models\Lesson;
use App\Models\Module;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class LessonVideoFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_instructor_can_upload_and_replace_a_lesson_video(): void
    {
        Storage::fake('public');

        $instructor = User::factory()->create(['role' => 'instructor']);
        Sanctum::actingAs($instructor);

        $course = Course::create([
            'instructor_id' => $instructor->id,
            'title' => 'Video Course',
            'slug' => 'video-course',
            'description' => 'Course with a lesson video',
            'price' => 0,
            'is_published' => false,
        ]);

        $module = Module::create([
            'course_id' => $course->id,
            'title' => 'Video Module',
            'slug' => 'video-module',
            'position' => 1,
        ]);

        $createResponse = $this->post(
            "/api/modules/{$module->id}/lessons",
            [
                'title' => 'Lesson One',
                'slug' => 'lesson-one',
                'content' => '[lesson-one.mp4](/storage/example)',
                'video_name' => 'lesson-one.mp4',
                'estimated_time_minutes' => 5,
                'position' => 0,
                'video' => UploadedFile::fake()->create('lesson-one.mp4', 1024, 'video/mp4'),
            ],
        );

        $createResponse->assertCreated();

        $lesson = Lesson::query()->firstOrFail();
        $this->assertNotNull($lesson->video_path);
        $this->assertNotNull($lesson->video_url);
        Storage::disk('public')->assertExists($lesson->video_path);

        $firstVideoPath = $lesson->video_path;

        $updateResponse = $this->post(
            "/api/modules/{$module->id}/lessons/{$lesson->id}",
            [
                '_method' => 'PUT',
                'title' => 'Lesson One',
                'slug' => 'lesson-one',
                'content' => '[lesson-two.mp4](/storage/example)',
                'video_name' => 'lesson-two.mp4',
                'estimated_time_minutes' => 5,
                'position' => 0,
                'video' => UploadedFile::fake()->create('lesson-two.mp4', 1024, 'video/mp4'),
            ],
        );

        $updateResponse->assertOk();

        $lesson->refresh();

        $this->assertNotSame($firstVideoPath, $lesson->video_path);
        Storage::disk('public')->assertMissing($firstVideoPath);
        Storage::disk('public')->assertExists($lesson->video_path);
        $this->assertStringContainsString('/storage/', $lesson->video_url ?? '');
    }
}