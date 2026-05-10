<?php

return [
    'provider' => env('PAYMENT_PROVIDER_STRIPE', 'stripe'),

    'messages' => [
        'secret_missing' => env('STRIPE_SECRET_MISSING_MESSAGE', 'Stripe secret key is not configured.'),
        'no_local_payment' => 'No local payment matched this Stripe session.',
        'invalid_payload' => 'Stripe checkout session payload is invalid.',
        'not_paid' => 'Checkout session is not paid yet.',
        'amount_mismatch' => 'Stripe payment amount does not match local payment.',
        'currency_mismatch' => 'Stripe payment currency does not match local payment.',
    ],
];
