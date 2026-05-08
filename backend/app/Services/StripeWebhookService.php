<?php

namespace App\Services;

use App\Models\Payment;
use Illuminate\Http\Request;
use RuntimeException;

class StripeWebhookService
{
    public function __construct(private readonly PaymentFulfillmentService $payments) {}

    /**
     * @return array<string, mixed>
     */
    public function handle(Request $request): array
    {
        $event = $this->verifiedEvent($request);

        if (($event['type'] ?? null) !== 'checkout.session.completed') {
            return [
                'received' => true,
                'processed' => false,
                'message' => 'Unhandled event type.',
            ];
        }

        $session = $event['data']['object'] ?? [];

        if (($session['payment_status'] ?? null) !== 'paid') {
            return [
                'received' => true,
                'processed' => false,
                'message' => 'Checkout session is not paid.',
            ];
        }

        $payment = Payment::query()
            ->where('provider', 'stripe')
            ->where('transaction_id', $session['id'] ?? null)
            ->first();

        if (! $payment) {
            return [
                'received' => true,
                'processed' => false,
                'message' => 'No local payment matched this Stripe session.',
            ];
        }

        $this->assertPaymentMatchesSession($payment, $session);

        $result = $this->payments->fulfill($payment, $event);

        return [
            'received' => true,
            'processed' => true,
            'payment' => $result['payment'],
            'enrollment' => $result['enrollment'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function verifiedEvent(Request $request): array
    {
        $secret = config('services.stripe.webhook_secret');

        if (blank($secret)) {
            throw new RuntimeException('Stripe webhook secret is not configured.');
        }

        $payload = $request->getContent();
        $signature = $request->header('Stripe-Signature');

        if (! $signature || ! $this->signatureIsValid($payload, $signature, $secret)) {
            throw new RuntimeException('Stripe webhook signature verification failed.');
        }

        $event = json_decode($payload, true);

        if (! is_array($event)) {
            throw new RuntimeException('Stripe webhook payload is invalid JSON.');
        }

        return $event;
    }

    private function signatureIsValid(string $payload, string $signature, string $secret): bool
    {
        $parts = collect(explode(',', $signature))
            ->mapWithKeys(function (string $part): array {
                [$key, $value] = array_pad(explode('=', $part, 2), 2, null);

                return $key && $value ? [$key => $value] : [];
            });

        $timestamp = $parts->get('t');
        $signatures = collect(explode(',', $signature))
            ->filter(fn (string $part) => str_starts_with($part, 'v1='))
            ->map(fn (string $part) => substr($part, 3));

        if (! $timestamp || $signatures->isEmpty()) {
            return false;
        }

        if (abs(time() - (int) $timestamp) > 300) {
            return false;
        }

        $expected = hash_hmac('sha256', $timestamp.'.'.$payload, $secret);

        return $signatures->contains(fn (string $value) => hash_equals($expected, $value));
    }

    /**
     * @param  array<string, mixed>  $session
     */
    private function assertPaymentMatchesSession(Payment $payment, array $session): void
    {
        if (isset($session['amount_total'])) {
            $sessionAmount = number_format(((int) $session['amount_total']) / 100, 2, '.', '');

            if ($sessionAmount !== $payment->amount) {
                throw new RuntimeException('Stripe payment amount does not match local payment.');
            }
        }

        if (isset($session['currency']) && strtoupper((string) $session['currency']) !== $payment->currency) {
            throw new RuntimeException('Stripe payment currency does not match local payment.');
        }
    }
}
