<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\UserInvite;
use App\Notifications\UserInviteNotification;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class UserInviteFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_can_send_role_invite_and_recipient_can_onboard_via_link(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        Sanctum::actingAs($admin);

        $response = $this->postJson('/api/admin/users/invites', [
            'email' => 'invited.instructor@example.com',
            'role' => 'instructor',
        ])->assertCreated()
            ->assertJsonPath('message', 'Invitation sent.')
            ->assertJsonPath('email', 'invited.instructor@example.com')
            ->assertJsonPath('role', 'instructor');

        $inviteUrl = $response->json('invite_url');
        $this->assertNotEmpty($inviteUrl);

        parse_str((string) parse_url($inviteUrl, PHP_URL_QUERY), $query);
        $token = $query['token'] ?? null;
        $this->assertNotEmpty($token);

        $this->assertDatabaseHas('user_invites', [
            'email' => 'invited.instructor@example.com',
            'role' => 'instructor',
            'invited_by_user_id' => $admin->id,
        ]);

        Notification::assertSentOnDemand(UserInviteNotification::class);

        $this->getJson("/api/auth/invite/{$token}")
            ->assertOk()
            ->assertJsonPath('email', 'invited.instructor@example.com')
            ->assertJsonPath('role', 'instructor');

        $acceptResponse = $this->postJson("/api/auth/invite/{$token}/accept", [
            'name' => 'Invited Instructor',
            'password' => 'password123',
            'password_confirmation' => 'password123',
            'token_name' => 'invite-onboarding',
        ])->assertCreated()
            ->assertJsonPath('token_type', 'Bearer')
            ->assertJsonPath('user.email', 'invited.instructor@example.com')
            ->assertJsonPath('user.role', 'instructor');

        $user = User::where('email', 'invited.instructor@example.com')->firstOrFail();
        $this->assertNotNull($user->email_verified_at);
        $this->assertTrue(Hash::check('password123', $user->password));

        $this->assertNotNull(UserInvite::where('token', $token)->first()?->used_at);
        $this->assertSame('instructor', $user->role);
    }

    public function test_non_admin_cannot_send_invites(): void
    {
        $instructor = User::factory()->create(['role' => 'instructor']);

        Sanctum::actingAs($instructor);

        $this->postJson('/api/admin/users/invites', [
            'email' => 'blocked.invite@example.com',
            'role' => 'student',
        ])->assertForbidden();
    }

    public function test_admin_cannot_invite_existing_email(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        User::factory()->create(['email' => 'existing@example.com']);

        Sanctum::actingAs($admin);

        $this->postJson('/api/admin/users/invites', [
            'email' => 'existing@example.com',
            'role' => 'student',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['email']);
    }

    public function test_expired_or_used_invite_cannot_be_shown_or_accepted(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $expiredInvite = UserInvite::create([
            'invited_by_user_id' => $admin->id,
            'email' => 'expired.invite@example.com',
            'role' => 'student',
            'token' => 'expired-token',
            'expires_at' => now()->subMinute(),
        ]);

        $this->getJson('/api/auth/invite/expired-token')
            ->assertNotFound();

        $this->postJson('/api/auth/invite/expired-token/accept', [
            'name' => 'Expired Invite User',
            'password' => 'password123',
            'password_confirmation' => 'password123',
        ])->assertUnprocessable()
            ->assertJsonValidationErrors(['token']);

        $usedInvite = UserInvite::create([
            'invited_by_user_id' => $admin->id,
            'email' => 'used.invite@example.com',
            'role' => 'student',
            'token' => 'used-token',
            'expires_at' => now()->addMinutes(5),
            'used_at' => now(),
        ]);

        $this->getJson('/api/auth/invite/used-token')->assertNotFound();

        $this->assertDatabaseMissing('users', [
            'email' => $expiredInvite->email,
        ]);

        $this->assertDatabaseMissing('users', [
            'email' => $usedInvite->email,
        ]);
    }

    public function test_new_invite_for_same_email_replaces_previous_pending_invite(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        Sanctum::actingAs($admin);

        $this->postJson('/api/admin/users/invites', [
            'email' => 'replace.me@example.com',
            'role' => 'student',
        ])->assertCreated();

        $firstToken = UserInvite::where('email', 'replace.me@example.com')->value('token');

        $this->postJson('/api/admin/users/invites', [
            'email' => 'replace.me@example.com',
            'role' => 'instructor',
        ])->assertCreated()
            ->assertJsonPath('role', 'instructor');

        $this->assertSame(1, UserInvite::where('email', 'replace.me@example.com')->count());

        $secondToken = UserInvite::where('email', 'replace.me@example.com')->value('token');
        $this->assertNotSame($firstToken, $secondToken);

        $this->getJson("/api/auth/invite/{$firstToken}")->assertNotFound();
        $this->getJson("/api/auth/invite/{$secondToken}")
            ->assertOk()
            ->assertJsonPath('role', 'instructor');
    }
}
