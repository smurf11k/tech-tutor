<?php

namespace App\Http\Controllers;

use App\Http\Requests\StorePaymentRequest;
use App\Models\Course;
use App\Models\Payment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PaymentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        if ($request->user()->isInstructor()) {
            return response()->json(Payment::with(['user', 'course'])->latest()->get());
        }

        return response()->json($request->user()->payments()->with('course')->latest()->get());
    }

    public function store(StorePaymentRequest $request, Course $course): JsonResponse
    {
        $validated = $request->validated();

        $payment = Payment::create([
            'user_id' => $request->user()->id,
            'course_id' => $course->id,
            'provider' => $validated['provider'],
            'amount' => $validated['amount'],
            'currency' => strtoupper($validated['currency'] ?? 'USD'),
            'status' => 'paid',
            'transaction_id' => $validated['transaction_id'] ?? null,
            'paid_at' => now(),
        ]);

        return response()->json($payment->load(['user', 'course']), 201);
    }
}