<?php

namespace App\Services;

use App\Models\Course;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;
use RuntimeException;

class StripeCheckoutService
{
    /**
     * @param  array{success_url?: string|null, cancel_url?: string|null}  $options
     * @return array{payment: Payment, checkout: array{session_id: string, url: string|null, mode: string}}
     *
     * @throws RequestException
     */
    public function createSession(User $user, Course $course, array $options = []): array
    {
        $secretKey = config('services.stripe.secret');

        if (blank($secretKey)) {
            throw new RuntimeException('Stripe secret key is not configured.');
        }

        $amount = $this->amountInSmallestUnit((float) $course->price);
        $currency = strtoupper(config('services.stripe.currency', 'USD'));

        $response = Http::asForm()
            ->withToken($secretKey)
            ->post('https://api.stripe.com/v1/checkout/sessions', [
                'mode' => 'payment',
                'success_url' => $options['success_url'] ?? config('services.stripe.success_url'),
                'cancel_url' => $options['cancel_url'] ?? config('services.stripe.cancel_url'),
                'client_reference_id' => $this->referenceId($user, $course),
                'customer_email' => $user->email,
                'metadata[user_id]' => $user->id,
                'metadata[course_id]' => $course->id,
                'line_items[0][quantity]' => 1,
                'line_items[0][price_data][currency]' => strtolower($currency),
                'line_items[0][price_data][unit_amount]' => $amount,
                'line_items[0][price_data][product_data][name]' => $course->title,
                'line_items[0][price_data][product_data][description]' => $course->subtitle ?: $course->description,
            ])
            ->throw();

        $session = $response->json();

        $payment = Payment::create([
            'user_id' => $user->id,
            'course_id' => $course->id,
            'provider' => 'stripe',
            'amount' => number_format((float) $course->price, 2, '.', ''),
            'currency' => $currency,
            'status' => 'pending',
            'transaction_id' => $session['id'],
            'provider_payload' => $session,
        ]);

        return [
            'payment' => $payment->load(['user', 'course']),
            'checkout' => [
                'session_id' => $session['id'],
                'url' => $session['url'] ?? null,
                'mode' => $session['mode'] ?? 'payment',
            ],
        ];
    }

    private function amountInSmallestUnit(float $amount): int
    {
        return (int) round($amount * 100);
    }

    private function referenceId(User $user, Course $course): string
    {
        return 'user:'.$user->id.';course:'.$course->id;
    }
}
