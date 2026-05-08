<?php

namespace App\Services;

use App\Models\Enrollment;
use App\Models\Payment;
use Illuminate\Support\Str;

class PaymentFulfillmentService
{
    public function __construct(private readonly CourseEnrollmentService $enrollments) {}

    /**
     * @param  array<string, mixed>|null  $providerPayload
     * @return array{payment: Payment, enrollment: Enrollment}
     */
    public function fulfill(Payment $payment, ?array $providerPayload = null): array
    {
        if ($payment->status !== 'paid') {
            $payment->forceFill([
                'status' => 'paid',
                'receipt_number' => $payment->receipt_number ?? $this->makeReceiptNumber(),
                'receipt_issued_at' => $payment->receipt_issued_at ?? now(),
                'access_granted_at' => $payment->access_granted_at ?? now(),
                'paid_at' => $payment->paid_at ?? now(),
                'provider_payload' => $this->mergeProviderPayload($payment, $providerPayload),
            ])->save();
        }

        $enrollment = $this->enrollments->enroll($payment->user, $payment->course);

        return [
            'payment' => $payment->fresh()->load(['user', 'course']),
            'enrollment' => $enrollment,
        ];
    }

    private function makeReceiptNumber(): string
    {
        do {
            $receiptNumber = 'TT-RCPT-'.now()->format('Ymd').'-'.Str::upper(Str::random(8));
        } while (Payment::where('receipt_number', $receiptNumber)->exists());

        return $receiptNumber;
    }

    /**
     * @param  array<string, mixed>|null  $providerPayload
     * @return array<string, mixed>|null
     */
    private function mergeProviderPayload(Payment $payment, ?array $providerPayload): ?array
    {
        if ($providerPayload === null) {
            return $payment->provider_payload;
        }

        return [
            ...(is_array($payment->provider_payload) ? $payment->provider_payload : []),
            'fulfillment_event' => $providerPayload,
        ];
    }
}
