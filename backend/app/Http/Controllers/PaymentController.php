<?php

namespace App\Http\Controllers;

use App\Http\Requests\StorePaymentRequest;
use App\Http\Requests\StoreStripeCheckoutRequest;
use App\Models\Course;
use App\Models\Payment;
use App\Models\User;
use App\Services\PaymentFulfillmentService;
use App\Services\StripeCheckoutService;
use Illuminate\Http\Client\RequestException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

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
                    ->whereHas('course', fn($query) => $query->where('instructor_id', $user->id))
                    ->latest()
                    ->get()
            );
        }

        return response()->json($user->payments()->with('course')->latest()->get());
    }

    public function show(Request $request, Payment $payment): JsonResponse
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);

        $canView = $user->isAdmin()
            || $payment->user_id === $user->id
            || $payment->course()->where('instructor_id', $user->id)->exists();

        abort_unless($canView, 403);

        return response()->json($payment->load(['user', 'course']));
    }

    public function store(StorePaymentRequest $request, Course $course, PaymentFulfillmentService $payments): JsonResponse
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

        if (!$user->isAdmin() && $requestedAmount !== $courseAmount) {
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
            'status' => 'pending',
            'transaction_id' => $validated['transaction_id'] ?? null,
            'provider_payload' => $validated['provider_payload'] ?? null,
        ]);

        $result = $payments->fulfill($payment);

        return response()->json([
            'payment' => $result['payment'],
            'enrollment' => $result['enrollment'],
        ], 201);
    }

    public function stripeCheckout(StoreStripeCheckoutRequest $request, Course $course, StripeCheckoutService $stripe): JsonResponse
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);

        if ((float) $course->price <= 0) {
            return response()->json([
                'message' => 'Free courses do not require Stripe checkout.',
            ], 422);
        }

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

        try {
            return response()->json(
                $stripe->createSession($user, $course, $request->validated()),
                201
            );
        } catch (RuntimeException $exception) {
            return response()->json([
                'message' => $exception->getMessage(),
            ], 503);
        } catch (RequestException $exception) {
            return response()->json([
                'message' => 'Stripe checkout session could not be created.',
                'stripe_error' => $exception->response?->json('error.message'),
            ], 502);
        }
    }

    public function confirmStripeCheckout(Request $request, StripeCheckoutService $stripe): JsonResponse
    {
        $user = $request->user();
        abort_unless($user instanceof User, 401);

        $validated = $request->validate([
            'session_id' => ['required', 'string', 'max:255'],
        ]);

        try {
            return response()->json($stripe->confirmSession($user, $validated['session_id']));
        } catch (RuntimeException $exception) {
            $status = $exception->getMessage() === 'Stripe secret key is not configured.' ? 503 : 422;

            return response()->json([
                'message' => $exception->getMessage(),
            ], $status);
        } catch (RequestException $exception) {
            return response()->json([
                'message' => 'Stripe checkout session could not be confirmed.',
                'stripe_error' => $exception->response?->json('error.message'),
            ], 502);
        }
    }
}
