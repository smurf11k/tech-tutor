<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * @extends Factory<User>
 */
class UserFactory extends Factory
{
    /**
     * The current password being used by the factory.
     */
    protected static ?string $password;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'nickname' => fake()->unique()->userName(),
            'email' => fake()->unique()->safeEmail(),
            'bio' => null,
            'email_verified_at' => now(),
            'password' => static::$password ??= Hash::make('password'),
            'remember_token' => Str::random(10),
            'email_notifications_enabled' => true,
            'email_notifications_comment_reply' => true,
            'email_notifications_thread' => true,
            'email_notifications_quiz_result' => true,
            'email_notifications_new_course' => false,
            'email_notifications_new_content' => true,
            'email_notifications_new_enrollment' => true,
            'email_notifications_instructor_quiz_result' => true,
            'email_notifications_approval_result' => true,
            'email_notifications_course_submitted' => true,
            'email_notifications_lesson_submitted' => true,
        ];
    }

    /**
     * Indicate that the model's email address should be unverified.
     */
    public function unverified(): static
    {
        return $this->state(fn(array $attributes) => [
            'email_verified_at' => null,
        ]);
    }
}
