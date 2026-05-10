<?php

namespace App\Http\Controllers;

use App\Models\Payment;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class PaymentStatusController extends Controller
{
    /**
     * Return the current payment status for the current user when authenticated,
     * or for the Stripe checkout session identified by `session_id`.
     * Accepts `course_id` and/or `session_id` as query parameters.
     */
    public function show(Request $request): JsonResponse
    {
        $user = $request->user();

        $courseId = $request->query('course_id');
        $sessionId = $request->query('session_id');

        if (!$user && blank($sessionId)) {
            return response()->json(['message' => 'session_id is required when not authenticated.'], 422);
        }

        $query = Payment::query()->where('provider', config('stripe.provider', 'stripe'));

        if ($user) {
            $query->where('user_id', $user->id);
        }

        if ($courseId) {
            $query->where('course_id', $courseId);
        }

        if ($sessionId) {
            $query->where('transaction_id', $sessionId);
        }

        $payment = $query->latest()->first();

        if (!$payment) {
            return response()->json(['status' => 'not_found']);
        }

        return response()->json([
            'status' => $payment->status,
            'payment' => [
                'id' => $payment->id,
                'amount' => $payment->amount,
                'currency' => $payment->currency,
                'transaction_id' => $payment->transaction_id,
            ],
        ]);
    }
}
