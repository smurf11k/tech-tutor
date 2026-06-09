<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('reviews', function (Blueprint $table) {
            $table->text('declined_reason')->nullable()->after('moderated_at');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->boolean('email_notifications_review_declined')->default(true)->after('email_notifications_lesson_submitted');
        });
    }

    public function down(): void
    {
        Schema::table('reviews', function (Blueprint $table) {
            $table->dropColumn('declined_reason');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('email_notifications_review_declined');
        });
    }
};
