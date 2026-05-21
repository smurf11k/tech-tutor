<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reviews', function (Blueprint $table) {
            $table->timestamp('moderated_at')->nullable()->after('is_published');
        });

        Schema::table('comments', function (Blueprint $table) {
            $table->timestamp('moderated_at')->nullable()->after('is_published');
        });
    }

    public function down(): void
    {
        Schema::table('reviews', function (Blueprint $table) {
            $table->dropColumn('moderated_at');
        });

        Schema::table('comments', function (Blueprint $table) {
            $table->dropColumn('moderated_at');
        });
    }
};
