<?php

namespace App\Http\Controllers;

use App\Http\Requests\AcceptUserInviteRequest;
use App\Http\Requests\StoreUserInviteRequest;
use App\Models\User;
use App\Models\UserInvite;
use App\Notifications\UserInviteNotification;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Notification;
use Illuminate\Validation\ValidationException;

class UserInviteController extends Controller
{
    public function store(StoreUserInviteRequest $request): JsonResponse
    {
        $admin = $request->user();
        abort_unless($admin?->isAdmin(), 403);

        $validated = $request->validated();

        if (User::where('email', $validated['email'])->exists()) {
            throw ValidationException::withMessages([
                'email' => ['This email is already registered.'],
            ]);
        }

        $invite = UserInvite::issue($admin, $validated['email'], $validated['role']);

        Notification::route('mail', $invite->email)
            ->notify(new UserInviteNotification($invite));

        return response()->json([
            'message' => 'Invitation sent.',
            'email' => $invite->email,
            'role' => $invite->role,
            'expires_at' => $invite->expires_at->toIso8601String(),
            'invite_url' => $invite->inviteUrl(),
        ], 201);
    }

    public function show(string $token): JsonResponse
    {
        $invite = UserInvite::findValidToken($token);

        if (!$invite) {
            return response()->json([
                'message' => 'This invitation is invalid or has expired.',
            ], 404);
        }

        return response()->json([
            'email' => $invite->email,
            'role' => $invite->role,
            'expires_at' => $invite->expires_at->toIso8601String(),
        ]);
    }

    public function accept(AcceptUserInviteRequest $request, string $token): JsonResponse
    {
        $invite = UserInvite::findValidToken($token);

        if (!$invite) {
            throw ValidationException::withMessages([
                'token' => ['This invitation is invalid or has expired.'],
            ]);
        }

        if (User::where('email', $invite->email)->exists()) {
            throw ValidationException::withMessages([
                'email' => ['This email is already registered.'],
            ]);
        }

        $validated = $request->validated();

        $user = User::create([
            'name' => $validated['name'],
            'email' => $invite->email,
            'password' => $validated['password'],
            'role' => $invite->role,
        ]);

        $user->forceFill([
            'email_verified_at' => now(),
        ])->save();

        $invite->markAsUsed();

        event(new Registered($user));

        return response()->json([
            'token' => $user->createToken($validated['token_name'] ?? 'api-token')->plainTextToken,
            'token_type' => 'Bearer',
            'user' => $user,
        ], 201);
    }
}
