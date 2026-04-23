<?php

namespace App\Http\Controllers;

use App\Http\Requests\StorePaymentRequest;
use App\Models\Course;
use App\Models\Payment;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PaymentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        if ($user->isAdmin()) {
            return response()->json(Payment::with(['user', 'course'])->latest()->get());
        }

        if ($user->isInstructor()) {
            return response()->json(
                Payment::with(['user', 'course'])
                    ->whereHas('course', fn ($query) => $query->where('instructor_id', $user->id))
                    ->latest()
                    ->get()
            );
        }

        return response()->json($user->payments()->with('course')->latest()->get());
    }

    public function store(StorePaymentRequest $request, Course $course): JsonResponse
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);

        $validated = $request->validated();

        $existingPaidPayment = Payment::query()
            ->where('user_id', $user->id)
            ->where('course_id', $course->id)
            ->where('status', 'paid')
            ->exists();

        if ($existingPaidPayment) {
            return response()->json([
                'message' => 'Course is already paid by this user.',
            ], 409);
        }

        $requestedAmount = number_format((float) $validated['amount'], 2, '.', '');
        $courseAmount = number_format((float) $course->price, 2, '.', '');

        if (! $user->isAdmin() && $requestedAmount !== $courseAmount) {
            return response()->json([
                'message' => 'The given data was invalid.',
                'errors' => [
                    'amount' => ['Payment amount must match the current course price.'],
                ],
            ], 422);
        }

        $payment = Payment::create([
            'user_id' => $user->id,
            'course_id' => $course->id,
            'provider' => $validated['provider'],
            'amount' => $requestedAmount,
            'currency' => strtoupper($validated['currency'] ?? 'USD'),
            'status' => 'paid',
            'transaction_id' => $validated['transaction_id'] ?? null,
            'paid_at' => now(),
        ]);

        return response()->json($payment->load(['user', 'course']), 201);
    }
}