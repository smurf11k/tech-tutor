<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('quiz_revisions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('quiz_id')->constrained()->cascadeOnDelete();
            $table->foreignId('author_id')->nullable()->constrained('users')->nullOnDelete();
            $table->unsignedInteger('version')->default(1);
            $table->string('status')->default('draft');
            $table->string('title');
            $table->text('description')->nullable();
            $table->foreignId('module_id')->nullable()->constrained()->nullOnDelete();
            $table->unsignedTinyInteger('pass_score')->default(70);
            $table->unsignedInteger('estimated_time_minutes')->nullable();
            $table->unsignedInteger('time_limit_seconds')->nullable();
            $table->boolean('is_published')->default(false);
            $table->unsignedInteger('position')->default(0);
            $table->json('questions');
            $table->foreignId('reviewed_by_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('published_by_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->timestamp('published_at')->nullable();
            $table->timestamp('unpublished_at')->nullable();
            $table->string('rejection_reason', 1000)->nullable();
            $table->timestamps();

            $table->index(['quiz_id', 'status']);
            $table->unique(['quiz_id', 'version']);
        });

        $quizzes = DB::table('quizzes')
            ->join('courses', 'courses.id', '=', 'quizzes.course_id')
            ->select([
                'quizzes.id as quiz_id',
                'quizzes.title',
                'quizzes.description',
                'quizzes.module_id',
                'quizzes.pass_score',
                'quizzes.estimated_time_minutes',
                'quizzes.time_limit_seconds',
                'quizzes.is_published',
                'quizzes.position',
                'quizzes.created_at',
                'quizzes.updated_at',
                'courses.instructor_id as author_id',
            ])
            ->get();

        foreach ($quizzes as $quiz) {
            $questions = DB::table('quiz_questions')
                ->where('quiz_id', $quiz->quiz_id)
                ->orderBy('position')
                ->get()
                ->map(function ($question): array {
                    $options = collect(json_decode($question->options, true) ?? [])
                        ->map(function (array $option) use ($question): array {
                            $correctAnswers = json_decode($question->correct_answers, true) ?? [];

                            return [
                                'key' => $option['key'] ?? '',
                                'text' => $option['text'] ?? '',
                                'is_correct' => in_array($option['key'] ?? '', $correctAnswers, true),
                            ];
                        })
                        ->values()
                        ->all();

                    return [
                        'type' => $question->type,
                        'prompt' => $question->prompt,
                        'points' => $question->points,
                        'options' => $options,
                    ];
                })
                ->all();

            DB::table('quiz_revisions')->insert([
                'quiz_id' => $quiz->quiz_id,
                'author_id' => $quiz->author_id,
                'version' => 1,
                'status' => $quiz->is_published ? 'published' : 'draft',
                'title' => $quiz->title,
                'description' => $quiz->description,
                'module_id' => $quiz->module_id,
                'pass_score' => $quiz->pass_score,
                'estimated_time_minutes' => $quiz->estimated_time_minutes,
                'time_limit_seconds' => $quiz->time_limit_seconds,
                'is_published' => (bool) $quiz->is_published,
                'position' => $quiz->position ?? 0,
                'questions' => json_encode($questions),
                'published_at' => $quiz->is_published ? ($quiz->updated_at ?? now()) : null,
                'created_at' => $quiz->created_at,
                'updated_at' => $quiz->updated_at,
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('quiz_revisions');
    }
};