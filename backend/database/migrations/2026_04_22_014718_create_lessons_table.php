<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('lessons', function (Blueprint $table) {
            $table->id();
            $table->foreignId('module_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->string('slug');
            $table->string('type')->default('text');
            $table->longText('content')->nullable();
            $table->string('video_url')->nullable();
            $table->string('file_path')->nullable();
            $table->unsignedInteger('position')->default(0);
            $table->boolean('is_preview')->default(false);
            $table->timestamps();

            $table->unique(['module_id', 'slug']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('lessons');
    }
};
