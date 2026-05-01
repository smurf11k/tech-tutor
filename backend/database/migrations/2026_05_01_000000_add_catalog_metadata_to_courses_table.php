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
        Schema::table('courses', function (Blueprint $table) {
            $table->string('subtitle')->nullable();
            $table->string('category')->nullable();
            $table->string('level')->nullable();
            $table->string('language')->nullable();
            $table->unsignedInteger('duration_minutes')->nullable();

            $table->index(['is_published', 'price']);
            $table->index(['category', 'level']);
            $table->index('language');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('courses', function (Blueprint $table) {
            $table->dropIndex(['is_published', 'price']);
            $table->dropIndex(['category', 'level']);
            $table->dropIndex(['language']);

            $table->dropColumn([
                'subtitle',
                'category',
                'level',
                'language',
                'duration_minutes',
            ]);
        });
    }
};
