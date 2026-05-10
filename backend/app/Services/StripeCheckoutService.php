<?php

namespace App\Services;

use App\Models\Course;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use RuntimeException;

class StripeCheckoutService
{
    public function __construct(private readonly PaymentFulfillmentService $payments)
    {
    }

    /**
     * @param  array{success_url?: string|null, cancel_url?: string|null}  $options
     * @return array{payment: Payment, checkout: array{session_id: string, url: string|null, mode: string}}
     *
     * @throws RequestException
     */
    public function createSession(User $user, Course $course, array $options = []): array
    {
        $secretKey = config('services.stripe.secret');
        $caBundle = config('services.stripe.ca_bundle');
        $checkoutSessionsUrl = (string) config('services.stripe.checkout_sessions_url', 'https://api.stripe.com/v1/checkout/sessions');

        if (blank($secretKey)) {
            throw new RuntimeException((string) config('stripe.messages.secret_missing', 'Stripe secret key is not configured.'));
        }

        $amount = $this->amountInSmallestUnit((float) $course->price);
        $currency = strtoupper(config('services.stripe.currency', 'USD'));

        $request = Http::asForm()->withToken($secretKey);

        if (filled($caBundle) && is_file($caBundle) && is_readable($caBundle)) {
            $request = $request->withOptions(['verify' => $caBundle]);
        }

        $successUrl = $this->ensurePlaceholder(
            (string) ($options['success_url'] ?? config('services.stripe.success_url', ''))
        );
        $cancelUrl = $this->ensurePlaceholder(
            (string) ($options['cancel_url'] ?? config('services.stripe.cancel_url', ''))
        );

        $response = $request
            ->post($checkoutSessionsUrl, [
                'mode' => 'payment',
                'success_url' => $successUrl,
                'cancel_url' => $cancelUrl,
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

        $provider = (string) config('stripe.provider', 'stripe');

        $payment = Payment::create([
            'user_id' => $user->id,
            'course_id' => $course->id,
            'provider' => $provider,
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

    /**
     * @return array{payment: Payment, enrollment: \App\Models\Enrollment}
     *
     * @throws RequestException
     */
    public function confirmSession(User $user, string $sessionId): array
    {
        $secretKey = config('services.stripe.secret');
        $caBundle = config('services.stripe.ca_bundle');
        $checkoutSessionsUrl = (string) config('services.stripe.checkout_sessions_url', 'https://api.stripe.com/v1/checkout/sessions');

        if (blank($secretKey)) {
            throw new RuntimeException((string) config('stripe.messages.secret_missing', 'Stripe secret key is not configured.'));
        }

        $payment = Payment::query()
            ->where('provider', 'stripe')
            ->where('transaction_id', $sessionId)
            ->where('user_id', $user->id)
            ->first();

        if (!$payment) {
            throw new RuntimeException((string) config('stripe.messages.no_local_payment', 'No local payment matched this Stripe session.'));
        }

        $request = Http::withToken($secretKey);

        if (filled($caBundle) && is_file($caBundle) && is_readable($caBundle)) {
            $request = $request->withOptions(['verify' => $caBundle]);
        }

        $session = $request
            ->get(rtrim($checkoutSessionsUrl, '/') . "/{$sessionId}")
            ->throw()
            ->json();

        if (!is_array($session)) {
            throw new RuntimeException((string) config('stripe.messages.invalid_payload', 'Stripe checkout session payload is invalid.'));
        }

        if (($session['payment_status'] ?? null) !== 'paid') {
            throw new RuntimeException((string) config('stripe.messages.not_paid', 'Checkout session is not paid yet.'));
        }

        $this->assertSessionMatchesPayment($payment, $session);

        return $this->payments->fulfill($payment, [
            'type' => 'checkout.session.confirmed_via_api',
            'data' => ['object' => $session],
        ]);
    }

    private function amountInSmallestUnit(float $amount): int
    {
        return (int) round($amount * 100);
    }

    private function referenceId(User $user, Course $course): string
    {
        return 'user:' . $user->id . ';course:' . $course->id;
    }

    /**
     * @param  array<string, mixed>  $session
     */
    private function assertSessionMatchesPayment(Payment $payment, array $session): void
    {
        if (isset($session['amount_total'])) {
            $sessionAmount = number_format(((int) $session['amount_total']) / 100, 2, '.', '');
            if ($sessionAmount !== $payment->amount) {
                throw new RuntimeException((string) config('stripe.messages.amount_mismatch', 'Stripe payment amount does not match local payment.'));
            }
        }

        if (isset($session['currency']) && strtoupper((string) $session['currency']) !== $payment->currency) {
            throw new RuntimeException((string) config('stripe.messages.currency_mismatch', 'Stripe payment currency does not match local payment.'));
        }
    }

    private function ensurePlaceholder(string $url): string
    {
        if ($url === '') {
            return $url;
        }

        if (Str::contains($url, '{CHECKOUT_SESSION_ID}')) {
            return $url;
        }

        $separator = Str::contains($url, '?') ? '&' : '?';

        return $url . $separator . 'session_id={CHECKOUT_SESSION_ID}';
    }
}
