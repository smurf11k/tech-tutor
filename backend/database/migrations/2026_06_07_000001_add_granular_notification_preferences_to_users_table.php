<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('email_notifications_comment_reply')->default(true);
            $table->boolean('email_notifications_thread')->default(true);
            $table->boolean('email_notifications_quiz_result')->default(true);
            $table->boolean('email_notifications_new_course')->default(false);
            $table->boolean('email_notifications_new_content')->default(true);
            $table->boolean('email_notifications_new_enrollment')->default(true);
            $table->boolean('email_notifications_instructor_quiz_result')->default(true);
            $table->boolean('email_notifications_approval_result')->default(true);
            $table->boolean('email_notifications_course_submitted')->default(true);
            $table->boolean('email_notifications_lesson_submitted')->default(true);
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn([
                'email_notifications_comment_reply',
                'email_notifications_thread',
                'email_notifications_quiz_result',
                'email_notifications_new_course',
                'email_notifications_new_content',
                'email_notifications_new_enrollment',
                'email_notifications_instructor_quiz_result',
                'email_notifications_approval_result',
                'email_notifications_course_submitted',
                'email_notifications_lesson_submitted',
            ]);
        });
    }
};
