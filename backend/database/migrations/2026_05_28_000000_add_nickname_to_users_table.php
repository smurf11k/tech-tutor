<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('nickname')->nullable()->unique()->after('name');
            $table->text('bio')->nullable()->after('nickname');
        });

        $usedNicknames = [];

        foreach (DB::table('users')->orderBy('id')->get(['id', 'name', 'email']) as $user) {
            $base = Str::slug($user->name ?: Str::before($user->email, '@'), '-') ?: 'user';
            $candidate = $base;
            $suffix = 2;

            while (isset($usedNicknames[$candidate])) {
                $candidate = $base . '-' . $suffix;
                $suffix++;
            }

            $usedNicknames[$candidate] = true;

            DB::table('users')->where('id', $user->id)->update([
                'nickname' => $candidate,
            ]);
        }
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique('users_nickname_unique');
            $table->dropColumn('bio');
            $table->dropColumn('nickname');
        });
    }
};