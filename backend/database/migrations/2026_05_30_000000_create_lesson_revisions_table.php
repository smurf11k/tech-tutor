<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('lesson_revisions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lesson_id')->constrained()->cascadeOnDelete();
            $table->foreignId('author_id')->nullable()->constrained('users')->nullOnDelete();
            $table->unsignedInteger('version')->default(1);
            $table->string('status')->default('draft');
            $table->string('title');
            $table->string('slug');
            $table->longText('content')->nullable();
            $table->string('video_name')->nullable();
            $table->string('video_url')->nullable();
            $table->string('video_path')->nullable();
            $table->unsignedInteger('estimated_time_minutes')->nullable();
            $table->foreignId('reviewed_by_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('published_by_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamp('published_at')->nullable();
            $table->timestamp('unpublished_at')->nullable();
            $table->string('rejection_reason', 1000)->nullable();
            $table->timestamps();

            $table->index(['lesson_id', 'status']);
            $table->unique(['lesson_id', 'version']);
        });

        $lessons = DB::table('lessons')
            ->join('modules', 'modules.id', '=', 'lessons.module_id')
            ->join('courses', 'courses.id', '=', 'modules.course_id')
            ->select([
                'lessons.id as lesson_id',
                'lessons.title',
                'lessons.slug',
                'lessons.content',
                'lessons.video_name',
                'lessons.video_url',
                'lessons.video_path',
                'lessons.estimated_time_minutes',
                'lessons.is_published',
                'lessons.created_at',
                'lessons.updated_at',
                'courses.instructor_id as author_id',
            ])
            ->get();

        foreach ($lessons as $lesson) {
            DB::table('lesson_revisions')->insert([
                'lesson_id' => $lesson->lesson_id,
                'author_id' => $lesson->author_id,
                'version' => 1,
                'status' => $lesson->is_published ? 'published' : 'draft',
                'title' => $lesson->title,
                'slug' => $lesson->slug,
                'content' => $lesson->content,
                'video_name' => $lesson->video_name,
                'video_url' => $lesson->video_url,
                'video_path' => $lesson->video_path,
                'estimated_time_minutes' => $lesson->estimated_time_minutes,
                'published_at' => $lesson->is_published ? ($lesson->updated_at ?? now()) : null,
                'created_at' => $lesson->created_at,
                'updated_at' => $lesson->updated_at,
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('lesson_revisions');
    }
};