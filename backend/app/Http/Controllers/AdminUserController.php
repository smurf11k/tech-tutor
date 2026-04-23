<?php

namespace App\Http\Controllers;

use App\Http\Requests\UpdateAdminUserRequest;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminUserController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        abort_unless($request->user()?->isAdmin(), 403);

        return response()->json(
            User::query()->latest()->paginate(20)
        );
    }

    public function update(UpdateAdminUserRequest $request, User $user): JsonResponse
    {
        $admin = $request->user();
        abort_unless($admin?->isAdmin(), 403);

        $validated = $request->validated();

        if (($validated['is_banned'] ?? false) && $admin->id === $user->id) {
            abort(422, 'Admins cannot ban themselves.');
        }

        if (($validated['role'] ?? null) !== null && $admin->id === $user->id && $validated['role'] !== 'admin') {
            abort(422, 'Admins cannot remove their own admin role.');
        }

        if (array_key_exists('is_banned', $validated)) {
            $validated['banned_at'] = $validated['is_banned']
                ? ($user->banned_at ?? now())
                : null;
        }

        $user->update($validated);

        return response()->json($user->fresh());
    }
}
