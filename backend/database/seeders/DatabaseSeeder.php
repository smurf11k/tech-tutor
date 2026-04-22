<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        User::factory()->create([
            'name' => 'Test Student',
            'email' => 'student@example.com',
            'role' => 'student',
        ]);

        User::factory()->create([
            'name' => 'Test Instructor',
            'email' => 'instructor@example.com',
            'role' => 'instructor',
        ]);

        User::factory()->create([
            'name' => 'Test Admin',
            'email' => 'admin@example.com',
            'role' => 'admin',
        ]);
    }
}
