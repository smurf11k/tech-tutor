<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DevTokenController extends Controller
{
    public function __invoke(Request $request): JsonResponse
    {
        // Keep this helper unavailable outside local debug environments.
        abort_unless(app()->isLocal() && config('app.debug'), 404);

        $devKey = (string) env('DEV_TOKEN_KEY', '');
        if ($devKey !== '') {
            $providedKey = (string) $request->header('X-Dev-Key', '');
            abort_unless(hash_equals($devKey, $providedKey), 403, 'Invalid dev key.');
        }

        $validated = $request->validate([
            'email' => ['required', 'email'],
            'token_name' => ['sometimes', 'string', 'max:120'],
            'abilities' => ['sometimes', 'array'],
            'abilities.*' => ['string'],
        ]);

        /** @var User $user */
        $user = User::query()->where('email', $validated['email'])->firstOrFail();

        $tokenName = $validated['token_name'] ?? 'frontend-dev';
        $abilities = $validated['abilities'] ?? ['*'];

        $plainTextToken = $user->createToken($tokenName, $abilities)->plainTextToken;

        return response()->json([
            'token' => $plainTextToken,
            'token_name' => $tokenName,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
            ],
        ]);
    }
}