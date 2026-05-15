<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('user_invites', function (Blueprint $table) {
            $table->id();
            $table->foreignId('invited_by_user_id')->constrained('users')->cascadeOnDelete();
            $table->string('email');
            $table->string('role');
            $table->string('token', 64)->unique();
            $table->timestamp('expires_at');
            $table->timestamp('used_at')->nullable();
            $table->timestamps();

            $table->index(['email', 'used_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_invites');
    }
};
