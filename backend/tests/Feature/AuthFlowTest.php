<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\URL;
use Tests\TestCase;

class AuthFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_register_receive_verification_email_and_fetch_profile(): void
    {
        $response = $this->postJson('/api/auth/register', [
            'name' => 'New Student',
            'email' => 'new.student@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'role' => 'student',
            'token_name' => 'test-register',
        ])->assertCreated()
            ->assertJsonPath('token_type', 'Bearer')
            ->assertJsonPath('user.email', 'new.student@example.com')
            ->assertJsonPath('user.role', 'student');

        $user = User::where('email', 'new.student@example.com')->firstOrFail();

        Notification::assertSentTo($user, VerifyEmail::class);

        $this->withHeader('Authorization', 'Bearer '.$response->json('token'))
            ->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonPath('email', 'new.student@example.com');
    }

    public function test_user_can_login_and_logout_with_sanctum_token(): void
    {
        $user = User::factory()->create([
            'email' => 'login@example.com',
            'password' => Hash::make('password123'),
        ]);

        $token = $this->postJson('/api/auth/login', [
            'email' => 'login@example.com',
            'password' => 'password123',
            'token_name' => 'test-login',
        ])->assertOk()
            ->assertJsonPath('user.id', $user->id)
            ->json('token');

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/auth/logout')
            ->assertOk()
            ->assertJsonPath('message', 'Logged out.');

        $this->assertDatabaseCount('personal_access_tokens', 0);
    }

    public function test_banned_user_cannot_login(): void
    {
        User::factory()->create([
            'email' => 'banned-login@example.com',
            'password' => Hash::make('password123'),
            'is_banned' => true,
            'banned_at' => now(),
        ]);

        $this->postJson('/api/auth/login', [
            'email' => 'banned-login@example.com',
            'password' => 'password123',
        ])->assertForbidden();
    }

    public function test_user_can_verify_email_from_signed_link_and_resend_when_needed(): void
    {
        $user = User::factory()->unverified()->create();
        $token = $user->createToken('test')->plainTextToken;

        $this->withHeader('Authorization', 'Bearer '.$token)
            ->postJson('/api/auth/email/resend')
            ->assertOk()
            ->assertJsonPath('message', 'Verification email sent.');

        Notification::assertSentTo($user, VerifyEmail::class);

        $verificationUrl = URL::temporarySignedRoute(
            'verification.verify',
            now()->addMinutes(60),
            [
                'id' => $user->id,
                'hash' => sha1($user->getEmailForVerification()),
            ]
        );

        $this->getJson($verificationUrl)
            ->assertOk()
            ->assertJsonPath('message', 'Email verified.');

        $this->assertTrue($user->fresh()->hasVerifiedEmail());
    }

    public function test_user_can_request_and_complete_password_reset(): void
    {
        $user = User::factory()->create([
            'email' => 'reset@example.com',
            'password' => Hash::make('old-password'),
        ]);

        $resetToken = null;

        $this->postJson('/api/auth/forgot-password', [
            'email' => 'reset@example.com',
        ])->assertOk();

        Notification::assertSentTo($user, ResetPassword::class, function (ResetPassword $notification) use (&$resetToken): bool {
            $resetToken = $notification->token;

            return true;
        });

        $this->assertNotNull($resetToken);

        $this->postJson('/api/auth/reset-password', [
            'email' => 'reset@example.com',
            'token' => $resetToken,
            'password' => 'new-password123',
            'password_confirmation' => 'new-password123',
        ])->assertOk();

        $this->assertTrue(Hash::check('new-password123', $user->fresh()->password));

        $this->postJson('/api/auth/login', [
            'email' => 'reset@example.com',
            'password' => 'new-password123',
        ])->assertOk();
    }
}
