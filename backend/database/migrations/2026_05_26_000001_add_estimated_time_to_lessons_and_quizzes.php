<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lessons', function (Blueprint $table) {
            $table->unsignedInteger('estimated_time_minutes')->nullable()->after('video_url');
        });

        Schema::table('quizzes', function (Blueprint $table) {
            $table->unsignedInteger('estimated_time_minutes')->nullable()->after('pass_score');
            $table->unsignedInteger('time_limit_seconds')->nullable()->after('estimated_time_minutes');
        });
    }

    public function down(): void
    {
        Schema::table('quizzes', function (Blueprint $table) {
            $table->dropColumn(['estimated_time_minutes', 'time_limit_seconds']);
        });

        Schema::table('lessons', function (Blueprint $table) {
            $table->dropColumn('estimated_time_minutes');
        });
    }
};
