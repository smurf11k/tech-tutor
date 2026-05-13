<?php

namespace Tests\Feature;

use App\Models\EmailVerificationCode;
use App\Notifications\ResetPasswordNotification;
use App\Notifications\EmailVerificationCodeNotification;
use App\Models\User;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\URL;
use Laravel\Socialite\Contracts\User as SocialiteUser;
use Laravel\Socialite\Facades\Socialite;
use Mockery;
use Tests\TestCase;

class AuthFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_user_can_request_email_verification_code_for_signup_without_captcha_token(): void
    {
        $this->postJson('/api/auth/register/request-verification-code', [
            'name' => 'Code Request Student',
            'email' => 'code.request@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ])->assertCreated()
            ->assertJsonPath('message', 'Verification code sent to your email.')
            ->assertJsonPath('email', 'code.request@example.com');

        $this->assertDatabaseHas('email_verification_codes', [
            'email' => 'code.request@example.com',
            'used' => false,
        ]);

        $this->assertDatabaseMissing('users', [
            'email' => 'code.request@example.com',
        ]);

        Notification::assertSentTimes(EmailVerificationCodeNotification::class, 1);
    }

    public function test_user_can_complete_signup_by_verifying_email_code(): void
    {
        EmailVerificationCode::create([
            'email' => 'verify.code@example.com',
            'code' => '123456',
            'expires_at' => now()->addMinutes(5),
        ]);

        $response = $this->postJson('/api/auth/register/verify-code', [
            'name' => 'Verified Student',
            'email' => 'verify.code@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'code' => '123456',
            'role' => 'student',
            'token_name' => 'test-verify-code',
        ])->assertCreated()
            ->assertJsonPath('token_type', 'Bearer')
            ->assertJsonPath('user.email', 'verify.code@example.com')
            ->assertJsonPath('user.role', 'student');

        $user = User::where('email', 'verify.code@example.com')->firstOrFail();

        $this->assertNotNull($user->email_verified_at);

        $this->assertDatabaseHas('email_verification_codes', [
            'email' => 'verify.code@example.com',
            'code' => '123456',
            'used' => true,
        ]);

        $this->withHeader('Authorization', 'Bearer ' . $response->json('token'))
            ->getJson('/api/auth/me')
            ->assertOk()
            ->assertJsonPath('email', 'verify.code@example.com');
    }

    public function test_signup_verification_fails_with_invalid_or_expired_code(): void
    {
        EmailVerificationCode::create([
            'email' => 'expired.code@example.com',
            'code' => '654321',
            'expires_at' => now()->subMinute(),
        ]);

        $this->postJson('/api/auth/register/verify-code', [
            'name' => 'Expired Code User',
            'email' => 'expired.code@example.com',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'code' => '654321',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['code']);

        $this->assertDatabaseMissing('users', [
            'email' => 'expired.code@example.com',
        ]);
    }

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

        $this->withHeader('Authorization', 'Bearer ' . $response->json('token'))
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

        $this->withHeader('Authorization', 'Bearer ' . $token)
            ->postJson('/api/auth/logout')
            ->assertOk()
            ->assertJsonPath('message', 'Logged out.');

        $this->assertDatabaseCount('personal_access_tokens', 0);
    }

    public function test_user_can_login_with_google_and_receive_a_frontend_payload(): void
    {
        $googleUser = Mockery::mock(SocialiteUser::class);
        $googleUser->shouldReceive('getEmail')->andReturn('google.student@example.com');
        $googleUser->shouldReceive('getName')->andReturn('Google Student');
        $googleUser->shouldReceive('getNickname')->andReturn('google-student');

        $driver = Mockery::mock();
        $driver->shouldReceive('user')->andReturn($googleUser);

        Socialite::shouldReceive('driver')
            ->with('google')
            ->andReturn($driver);

        $this->withSession(['google_oauth_return_to' => 'http://localhost:5173'])
            ->get('/auth/google/callback')
            ->assertOk()
            ->assertSee('techtutor-google-auth', false)
            ->assertSee('google.student@example.com', false)
            ->assertSee('Google sign-in complete.', false);

        $this->assertDatabaseHas('users', [
            'email' => 'google.student@example.com',
            'name' => 'Google Student',
        ]);

        $this->assertDatabaseCount('personal_access_tokens', 1);
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

        $this->withHeader('Authorization', 'Bearer ' . $token)
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

        Notification::assertSentTo($user, ResetPasswordNotification::class, function (ResetPasswordNotification $notification) use (&$resetToken): bool {
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
