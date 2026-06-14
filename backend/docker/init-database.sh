#!/bin/sh
set -e

php artisan migrate --force

php artisan tinker --execute='DB::transaction(function () {
    if (!DB::table("seed_markers")->where("name", "database_seeded")->exists()) {
        Artisan::call("db:seed", ["--force" => true]);
        DB::table("seed_markers")->insertOrIgnore([
            "name" => "database_seeded",
            "ran_at" => now(),
            "created_at" => now(),
            "updated_at" => now(),
        ]);
    }
});'
