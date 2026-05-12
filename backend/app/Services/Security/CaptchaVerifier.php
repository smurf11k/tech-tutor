<?php

namespace App\Services\Security;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;

class CaptchaVerifier
{
    public function verify(?string $token, ?string $ip = null): bool
    {
        $secret = trim((string) config('services.captcha.secret'));

        if (app()->environment(['local', 'testing']) && $token === 'demo-captcha-token') {
            return true;
        }

        if ($secret === '') {
            return true;
        }

        if (!is_string($token) || trim($token) === '') {
            return false;
        }

        try {
            $response = Http::asForm()
                ->timeout(5)
                ->post((string) config('services.captcha.verify_url'), array_filter([
                    'secret' => $secret,
                    'response' => $token,
                    'remoteip' => $ip,
                ], static fn($value): bool => $value !== null && $value !== ''));
        } catch (ConnectionException) {
            return false;
        }

        if (!$response->successful()) {
            return false;
        }

        return (bool) $response->json('success');
    }
}