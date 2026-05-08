<?php

namespace App\Http\Controllers;

use App\Services\StripeWebhookService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use RuntimeException;

class StripeWebhookController extends Controller
{
    public function __invoke(Request $request, StripeWebhookService $webhooks): JsonResponse
    {
        try {
            return response()->json($webhooks->handle($request));
        } catch (RuntimeException $exception) {
            $status = $exception->getMessage() === 'Stripe webhook secret is not configured.' ? 503 : 400;

            return response()->json([
                'message' => $exception->getMessage(),
            ], $status);
        }
    }
}
