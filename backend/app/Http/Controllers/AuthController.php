<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password as PasswordRule;
use Illuminate\Validation\ValidationException;
use Laravel\Socialite\Facades\Socialite;
use Throwable;

class AuthController extends Controller
{
    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'lowercase', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'confirmed', PasswordRule::min(8)],
            'role' => ['sometimes', 'in:student,instructor'],
            'token_name' => ['sometimes', 'string', 'max:255'],
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => $validated['password'],
            'role' => $validated['role'] ?? 'student',
        ]);

        event(new Registered($user));

        return response()->json($this->tokenResponse($user, $validated['token_name'] ?? 'api-token'), 201);
    }

    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'string', 'lowercase', 'email'],
            'password' => ['required', 'string'],
            'token_name' => ['sometimes', 'string', 'max:255'],
        ]);

        $user = User::where('email', $validated['email'])->first();

        if (!$user || !Hash::check($validated['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials are incorrect.'],
            ]);
        }

        abort_if($user->isBanned(), 403, 'This account is banned.');

        return response()->json($this->tokenResponse($user, $validated['token_name'] ?? 'api-token'));
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json($request->user());
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()->currentAccessToken()?->delete();

        return response()->json(['message' => 'Logged out.']);
    }

    public function redirectToGoogle(Request $request): RedirectResponse
    {
        $returnTo = $this->resolveFrontendOrigin($request->string('return_to')->toString());

        $request->session()->put('google_oauth_return_to', $returnTo);

        return Socialite::driver('google')->redirect();
    }

    public function handleGoogleCallback(Request $request): Response
    {
        $returnTo = $this->resolveFrontendOrigin(
            $request->session()->pull('google_oauth_return_to')
        );

        try {
            $googleUser = Socialite::driver('google')->user();
        } catch (Throwable) {
            return $this->googleAuthPopupResponse(
                $returnTo,
                null,
                'Google sign-in was not completed.',
                'Google sign-in failed.'
            );
        }

        $email = $googleUser->getEmail();

        if (!$email) {
            return $this->googleAuthPopupResponse(
                $returnTo,
                null,
                'Google sign-in did not return an email address.',
                'Google sign-in failed.'
            );
        }

        $user = User::firstOrNew(['email' => $email]);
        $displayName = Str::of($googleUser->getName() ?: $googleUser->getNickname() ?: $email)
            ->trim()
            ->toString();

        if (!$user->exists) {
            $user->name = $displayName;
            $user->password = Str::random(40);
            $user->role = 'student';
        } elseif (!$user->name) {
            $user->name = $displayName;
        }

        if ($user->isBanned()) {
            return $this->googleAuthPopupResponse(
                $returnTo,
                null,
                'This account is banned.',
                'Google sign-in failed.'
            );
        }

        $user->forceFill([
            'email_verified_at' => $user->email_verified_at ?? now(),
        ])->save();

        $tokenResponse = $this->tokenResponse($user, 'google-oauth');

        return $this->googleAuthPopupResponse(
            $returnTo,
            [
                'token' => $tokenResponse['token'],
                'token_type' => $tokenResponse['token_type'],
                'user' => $tokenResponse['user']->toArray(),
            ],
            'Google sign-in completed successfully.',
            'Google sign-in complete.'
        );
    }

    public function resendVerification(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->hasVerifiedEmail()) {
            return response()->json(['message' => 'Email is already verified.']);
        }

        $user->sendEmailVerificationNotification();

        return response()->json(['message' => 'Verification email sent.']);
    }

    public function verifyEmail(Request $request, int $id, string $hash): JsonResponse
    {
        $user = User::findOrFail($id);

        abort_unless(hash_equals($hash, sha1($user->getEmailForVerification())), 403);

        if (!$user->hasVerifiedEmail()) {
            $user->markEmailAsVerified();
        }

        return response()->json(['message' => 'Email verified.']);
    }

    public function forgotPassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'string', 'lowercase', 'email'],
        ]);

        $status = Password::sendResetLink($validated);

        if ($status !== Password::RESET_LINK_SENT) {
            throw ValidationException::withMessages([
                'email' => [__($status)],
            ]);
        }

        return response()->json(['message' => __($status)]);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'token' => ['required', 'string'],
            'email' => ['required', 'string', 'lowercase', 'email'],
            'password' => ['required', 'confirmed', PasswordRule::min(8)],
        ]);

        $status = Password::reset(
            $validated,
            function (User $user, string $password): void {
                $user->forceFill([
                    'password' => Hash::make($password),
                    'remember_token' => Str::random(60),
                ])->save();

                $user->tokens()->delete();

                event(new PasswordReset($user));
            }
        );

        if ($status !== Password::PASSWORD_RESET) {
            throw ValidationException::withMessages([
                'email' => [__($status)],
            ]);
        }

        return response()->json(['message' => __($status)]);
    }

    /**
     * @return array{token: string, token_type: string, user: User}
     */
    private function tokenResponse(User $user, string $tokenName): array
    {
        return [
            'token' => $user->createToken($tokenName)->plainTextToken,
            'token_type' => 'Bearer',
            'user' => $user,
        ];
    }

    private function googleAuthPopupResponse(string $targetOrigin, ?array $payload, string $message, string $title): Response
    {
        $targetOriginJson = json_encode($targetOrigin, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        $payloadJson = $payload
            ? json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)
            : 'null';
        $messageJson = json_encode($message, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        $titleJson = json_encode($title, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);

        $html = <<<HTML
<!doctype html>
<html lang="en">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <title>{$titleJson}</title>
        <style>
            body {
                margin: 0;
                min-height: 100vh;
                display: grid;
                place-items: center;
                background: #020617;
                color: #e2e8f0;
                font-family: Inter, ui-sans-serif, system-ui, sans-serif;
                text-align: center;
            }

            main {
                max-width: 28rem;
                padding: 2rem;
            }

            p {
                margin: 0.75rem 0 0;
                color: #94a3b8;
            }
        </style>
    </head>
    <body>
        <main>
            <h1>{$titleJson}</h1>
            <p id="message">{$messageJson}</p>
        </main>
        <script>
            (function () {
                const targetOrigin = {$targetOriginJson};
                const payload = {$payloadJson};
                const message = {$messageJson};

                if (window.opener && targetOrigin) {
                    window.opener.postMessage({
                        type: 'techtutor-google-auth',
                        message: message,
                        payload: payload,
                    }, targetOrigin);
                    window.close();
                    return;
                }

                const messageNode = document.getElementById('message');

                if (messageNode) {
                    messageNode.textContent = message;
                }
            }());
        </script>
    </body>
</html>
HTML;

        return response($html, 200)->header('Content-Type', 'text/html; charset=UTF-8');
    }

    private function resolveFrontendOrigin(?string $candidate): string
    {
        $fallback = $this->frontendOrigin();

        if (!$candidate) {
            return $fallback;
        }

        $normalized = $this->normalizeOrigin($candidate);

        return $normalized && $normalized === $fallback ? $normalized : $fallback;
    }

    private function frontendOrigin(): string
    {
        return rtrim((string) config('services.frontend_url', 'http://localhost:5173'), '/');
    }

    private function normalizeOrigin(string $url): ?string
    {
        $parts = parse_url($url);

        if (!$parts || empty($parts['scheme']) || empty($parts['host'])) {
            return null;
        }

        $origin = $parts['scheme'] . '://' . $parts['host'];

        if (isset($parts['port'])) {
            $origin .= ':' . $parts['port'];
        }

        return rtrim($origin, '/');
    }
}
