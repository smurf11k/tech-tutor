<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('lesson_revisions', function (Blueprint $table) {
            $table->boolean('is_published')->default(false)->after('estimated_time_minutes');
        });

        DB::table('lesson_revisions')
            ->where('status', 'published')
            ->update(['is_published' => true]);
    }

    public function down(): void
    {
        Schema::table('lesson_revisions', function (Blueprint $table) {
            $table->dropColumn('is_published');
        });
    }
};