<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('courses', function (Blueprint $table): void {
            $table->json('what_you_will_learn')->nullable()->after('language');
            $table->json('price_benefits')->nullable()->after('what_you_will_learn');
        });

        Schema::create('tags', function (Blueprint $table): void {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->timestamps();

            $table->unique('name');
        });

        Schema::create('course_tag', function (Blueprint $table): void {
            $table->foreignId('course_id')->constrained('courses')->cascadeOnDelete();
            $table->foreignId('tag_id')->constrained('tags')->cascadeOnDelete();
            $table->primary(['course_id', 'tag_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('course_tag');
        Schema::dropIfExists('tags');

        Schema::table('courses', function (Blueprint $table): void {
            $table->dropColumn(['what_you_will_learn', 'price_benefits']);
        });
    }
};