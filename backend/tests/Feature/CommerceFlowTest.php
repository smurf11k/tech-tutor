<?php

namespace Tests\Feature;

use App\Models\Course;
use App\Models\Payment;
use App\Models\Review;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CommerceFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_student_can_leave_review_and_record_payment(): void
    {
        $instructor = User::factory()->create(['role' => 'instructor']);
        $student = User::factory()->create(['role' => 'student']);

        Sanctum::actingAs($instructor);

        $this->postJson('/api/courses', [
            'title' => 'Paid Course',
            'slug' => 'paid-course',
            'description' => 'A paid course',
            'price' => 99.99,
        ])->assertCreated();

        $course = Course::query()->firstOrFail();

        Sanctum::actingAs($student);

        $paymentResponse = $this->postJson("/api/courses/{$course->id}/payments", [
            'provider' => 'stripe',
            'amount' => 99.99,
            'currency' => 'usd',
            'transaction_id' => 'txn_12345',
        ])->assertCreated()
            ->assertJsonPath('enrollment.course_id', $course->id);

        $this->assertStringStartsWith('TT-RCPT-', $paymentResponse->json('payment.receipt_number'));

        $this->postJson("/api/courses/{$course->id}/reviews", [
            'rating' => 5,
            'comment' => 'Strong course',
        ])->assertCreated();

        $this->assertDatabaseHas('reviews', [
            'course_id' => $course->id,
            'user_id' => $student->id,
            'rating' => 5,
        ]);

        $this->assertDatabaseHas('payments', [
            'course_id' => $course->id,
            'user_id' => $student->id,
            'provider' => 'stripe',
            'transaction_id' => 'txn_12345',
            'status' => 'paid',
        ]);

        $this->assertDatabaseHas('enrollments', [
            'course_id' => $course->id,
            'user_id' => $student->id,
            'status' => 'active',
        ]);
    }

    public function test_student_cannot_record_duplicate_paid_payment_for_same_course(): void
    {
        $instructor = User::factory()->create(['role' => 'instructor']);
        $student = User::factory()->create(['role' => 'student']);

        Sanctum::actingAs($instructor);

        $this->postJson('/api/courses', [
            'title' => 'Single Purchase Course',
            'slug' => 'single-purchase-course',
            'description' => 'Paid once',
            'price' => 49.99,
        ])->assertCreated();

        $course = Course::query()->firstOrFail();

        // Admin publishes the course
        $admin = User::factory()->create(['role' => 'admin']);
        Sanctum::actingAs($admin);
        $this->patchJson("/api/courses/{$course->id}", ['is_published' => true])->assertOk();

        Sanctum::actingAs($student);

        $this->postJson("/api/courses/{$course->id}/payments", [
            'provider' => 'stripe',
            'amount' => 49.99,
            'currency' => 'usd',
            'transaction_id' => 'txn_first',
        ])->assertCreated();

        $this->postJson("/api/courses/{$course->id}/payments", [
            'provider' => 'stripe',
            'amount' => 49.99,
            'currency' => 'usd',
            'transaction_id' => 'txn_second',
        ])->assertStatus(409)
            ->assertJsonPath('message', 'Course is already paid by this user.');

        $this->assertDatabaseCount('payments', 1);
    }

    public function test_student_payment_amount_must_match_course_price(): void
    {
        $instructor = User::factory()->create(['role' => 'instructor']);
        $student = User::factory()->create(['role' => 'student']);

        Sanctum::actingAs($instructor);

        $this->postJson('/api/courses', [
            'title' => 'Strict Price Course',
            'slug' => 'strict-price-course',
            'description' => 'Price should match',
            'price' => 99.99,
        ])->assertCreated();

        $course = Course::query()->firstOrFail();

        // Admin publishes the course
        $admin = User::factory()->create(['role' => 'admin']);
        Sanctum::actingAs($admin);
        $this->patchJson("/api/courses/{$course->id}", ['is_published' => true])->assertOk();

        Sanctum::actingAs($student);

        $this->postJson("/api/courses/{$course->id}/payments", [
            'provider' => 'stripe',
            'amount' => 89.99,
            'currency' => 'usd',
            'transaction_id' => 'txn_wrong_amount',
        ])->assertStatus(422)
            ->assertJsonValidationErrors('amount');

        $this->assertDatabaseCount('payments', 0);
    }

    public function test_paid_course_requires_purchase_before_enrollment_and_receipt_is_viewable(): void
    {
        $instructor = User::factory()->create(['role' => 'instructor']);
        $student = User::factory()->create(['role' => 'student']);
        $otherStudent = User::factory()->create(['role' => 'student']);

        $course = Course::create([
            'instructor_id' => $instructor->id,
            'title' => 'Receipt Course',
            'slug' => 'receipt-course',
            'description' => 'Receipt and access gating',
            'price' => 35,
            'is_published' => true,
            'published_at' => now(),
        ]);

        Sanctum::actingAs($student);

        $this->postJson("/api/courses/{$course->id}/enrollments")
            ->assertStatus(402)
            ->assertJsonPath('message', 'Purchase this course before enrolling.');

        $paymentResponse = $this->postJson("/api/courses/{$course->id}/payments", [
            'provider' => 'manual_demo',
            'amount' => 35,
            'currency' => 'usd',
            'transaction_id' => 'txn_receipt_course',
        ])->assertCreated()
            ->assertJsonPath('payment.status', 'paid')
            ->assertJsonPath('enrollment.status', 'active');

        $paymentId = $paymentResponse->json('payment.id');
        $this->assertStringStartsWith('TT-RCPT-', $paymentResponse->json('payment.receipt_number'));

        $this->postJson("/api/courses/{$course->id}/enrollments")->assertCreated();
        $this->assertDatabaseCount('enrollments', 1);

        $this->getJson("/api/payments/{$paymentId}")
            ->assertOk()
            ->assertJsonPath('id', $paymentId)
            ->assertJsonPath('course_id', $course->id);

        Sanctum::actingAs($otherStudent);

        $this->getJson("/api/payments/{$paymentId}")->assertForbidden();
    }

    public function test_student_can_create_stripe_checkout_session_for_paid_course(): void
    {
        config([
            'services.stripe.secret' => 'sk_test_mock',
            'services.stripe.currency' => 'USD',
            'services.stripe.success_url' => 'https://example.test/success',
            'services.stripe.cancel_url' => 'https://example.test/cancel',
        ]);

        Http::fake([
            'https://api.stripe.com/v1/checkout/sessions' => Http::response([
                'id' => 'cs_test_123',
                'url' => 'https://checkout.stripe.test/pay/cs_test_123',
                'mode' => 'payment',
            ]),
        ]);

        $instructor = User::factory()->create(['role' => 'instructor']);
        $student = User::factory()->create(['role' => 'student']);

        $course = Course::create([
            'instructor_id' => $instructor->id,
            'title' => 'Stripe Course',
            'slug' => 'stripe-course',
            'description' => 'Stripe checkout test',
            'price' => 42.50,
            'is_published' => true,
            'published_at' => now(),
        ]);

        Sanctum::actingAs($student);

        $this->postJson("/api/courses/{$course->id}/payments/stripe-checkout")
            ->assertCreated()
            ->assertJsonPath('payment.provider', 'stripe')
            ->assertJsonPath('payment.status', 'pending')
            ->assertJsonPath('payment.transaction_id', 'cs_test_123')
            ->assertJsonPath('checkout.session_id', 'cs_test_123')
            ->assertJsonPath('checkout.url', 'https://checkout.stripe.test/pay/cs_test_123');

        $this->assertDatabaseHas('payments', [
            'user_id' => $student->id,
            'course_id' => $course->id,
            'provider' => 'stripe',
            'status' => 'pending',
            'transaction_id' => 'cs_test_123',
        ]);

        $this->assertDatabaseCount('enrollments', 0);

        Http::assertSent(fn($request) => $request->url() === 'https://api.stripe.com/v1/checkout/sessions'
            && $request->hasHeader('Authorization', 'Bearer sk_test_mock'));
    }

    public function test_stripe_webhook_marks_pending_checkout_payment_as_paid_and_enrolls_student(): void
    {
        config(['services.stripe.webhook_secret' => 'whsec_test']);

        $instructor = User::factory()->create(['role' => 'instructor']);
        $student = User::factory()->create(['role' => 'student']);

        $course = Course::create([
            'instructor_id' => $instructor->id,
            'title' => 'Stripe Webhook Course',
            'slug' => 'stripe-webhook-course',
            'description' => 'Webhook fulfillment test',
            'price' => 42.50,
            'is_published' => true,
            'published_at' => now(),
        ]);

        $payment = Payment::create([
            'user_id' => $student->id,
            'course_id' => $course->id,
            'provider' => 'stripe',
            'amount' => 42.50,
            'currency' => 'USD',
            'status' => 'pending',
            'transaction_id' => 'cs_test_webhook',
        ]);

        $payload = [
            'id' => 'evt_test_webhook',
            'type' => 'checkout.session.completed',
            'data' => [
                'object' => [
                    'id' => 'cs_test_webhook',
                    'payment_status' => 'paid',
                    'amount_total' => 4250,
                    'currency' => 'usd',
                ],
            ],
        ];

        $this->postJson('/api/stripe/webhook', $payload, [
            'Stripe-Signature' => $this->stripeSignature($payload, 'whsec_test'),
        ])->assertOk()
            ->assertJsonPath('received', true)
            ->assertJsonPath('processed', true)
            ->assertJsonPath('payment.id', $payment->id)
            ->assertJsonPath('payment.status', 'paid')
            ->assertJsonPath('enrollment.course_id', $course->id);

        $payment->refresh();

        $this->assertNotNull($payment->receipt_number);
        $this->assertNotNull($payment->paid_at);
        $this->assertNotNull($payment->access_granted_at);
        $this->assertDatabaseHas('enrollments', [
            'user_id' => $student->id,
            'course_id' => $course->id,
            'status' => 'active',
        ]);

        $this->postJson('/api/stripe/webhook', $payload, [
            'Stripe-Signature' => $this->stripeSignature($payload, 'whsec_test'),
        ])->assertOk()
            ->assertJsonPath('processed', true);

        $this->assertDatabaseCount('enrollments', 1);
        $this->assertDatabaseCount('payments', 1);
    }

    public function test_student_can_confirm_stripe_checkout_session_after_redirect(): void
    {
        config(['services.stripe.secret' => 'sk_test_mock']);

        Http::fake([
            'https://api.stripe.com/v1/checkout/sessions/cs_test_return' => Http::response([
                'id' => 'cs_test_return',
                'payment_status' => 'paid',
                'amount_total' => 4250,
                'currency' => 'usd',
            ]),
        ]);

        $instructor = User::factory()->create(['role' => 'instructor']);
        $student = User::factory()->create(['role' => 'student']);

        $course = Course::create([
            'instructor_id' => $instructor->id,
            'title' => 'Stripe Return Course',
            'slug' => 'stripe-return-course',
            'description' => 'Stripe return confirmation test',
            'price' => 42.50,
            'is_published' => true,
            'published_at' => now(),
        ]);

        $payment = Payment::create([
            'user_id' => $student->id,
            'course_id' => $course->id,
            'provider' => 'stripe',
            'amount' => 42.50,
            'currency' => 'USD',
            'status' => 'pending',
            'transaction_id' => 'cs_test_return',
        ]);

        Sanctum::actingAs($student);

        $this->postJson('/api/payments/stripe/confirm', [
            'session_id' => 'cs_test_return',
        ])->assertOk()
            ->assertJsonPath('payment.id', $payment->id)
            ->assertJsonPath('payment.status', 'paid')
            ->assertJsonPath('enrollment.course_id', $course->id)
            ->assertJsonPath('enrollment.user_id', $student->id);

        $payment->refresh();

        $this->assertSame('paid', $payment->status);
        $this->assertNotNull($payment->receipt_number);
        $this->assertDatabaseHas('enrollments', [
            'user_id' => $student->id,
            'course_id' => $course->id,
            'status' => 'active',
        ]);
    }

    public function test_payment_status_can_be_checked_from_checkout_session_without_authentication(): void
    {
        $instructor = User::factory()->create(['role' => 'instructor']);
        $student = User::factory()->create(['role' => 'student']);

        $course = Course::create([
            'instructor_id' => $instructor->id,
            'title' => 'Stripe Return Status Course',
            'slug' => 'stripe-return-status-course',
            'description' => 'Payment status return test',
            'price' => 42.50,
            'is_published' => true,
            'published_at' => now(),
        ]);

        Payment::create([
            'user_id' => $student->id,
            'course_id' => $course->id,
            'provider' => 'stripe',
            'amount' => 42.50,
            'currency' => 'USD',
            'status' => 'pending',
            'transaction_id' => 'cs_test_public_status',
        ]);

        $this->getJson('/api/payments/status?session_id=cs_test_public_status&course_id=' . $course->id)
            ->assertOk()
            ->assertJsonPath('status', 'pending');
    }

    public function test_stripe_webhook_rejects_invalid_signature(): void
    {
        config(['services.stripe.webhook_secret' => 'whsec_test']);

        $payload = [
            'id' => 'evt_bad_signature',
            'type' => 'checkout.session.completed',
            'data' => ['object' => ['id' => 'cs_bad']],
        ];

        $this->postJson('/api/stripe/webhook', $payload, [
            'Stripe-Signature' => $this->stripeSignature($payload, 'wrong_secret'),
        ])->assertStatus(400)
            ->assertJsonPath('message', 'Stripe webhook signature verification failed.');
    }

    public function test_stripe_webhook_requires_configured_webhook_secret(): void
    {
        config(['services.stripe.webhook_secret' => null]);

        $payload = [
            'id' => 'evt_no_secret',
            'type' => 'checkout.session.completed',
            'data' => ['object' => ['id' => 'cs_no_secret']],
        ];

        $this->postJson('/api/stripe/webhook', $payload, [
            'Stripe-Signature' => $this->stripeSignature($payload, 'whsec_test'),
        ])->assertStatus(503)
            ->assertJsonPath('message', 'Stripe webhook secret is not configured.');
    }

    public function test_stripe_checkout_requires_configured_secret_key(): void
    {
        config(['services.stripe.secret' => null]);

        $instructor = User::factory()->create(['role' => 'instructor']);
        $student = User::factory()->create(['role' => 'student']);

        $course = Course::create([
            'instructor_id' => $instructor->id,
            'title' => 'Unconfigured Stripe Course',
            'slug' => 'unconfigured-stripe-course',
            'description' => 'Missing Stripe key',
            'price' => 50,
            'is_published' => true,
            'published_at' => now(),
        ]);

        Sanctum::actingAs($student);

        $this->postJson("/api/courses/{$course->id}/payments/stripe-checkout")
            ->assertStatus(503)
            ->assertJsonPath('message', 'Stripe secret key is not configured.');

        $this->assertDatabaseCount('payments', 0);
    }

    private function stripeSignature(array $payload, string $secret): string
    {
        $timestamp = time();
        $json = json_encode($payload, JSON_UNESCAPED_SLASHES);
        $signature = hash_hmac('sha256', $timestamp . '.' . $json, $secret);

        return "t={$timestamp},v1={$signature}";
    }

    public function test_instructor_only_sees_payments_for_their_own_courses(): void
    {
        $instructorA = User::factory()->create(['role' => 'instructor']);
        $instructorB = User::factory()->create(['role' => 'instructor']);
        $student = User::factory()->create(['role' => 'student']);

        $courseA = Course::create([
            'instructor_id' => $instructorA->id,
            'title' => 'Course A',
            'slug' => 'course-a',
            'description' => 'A',
            'price' => 20,
            'is_published' => true,
            'published_at' => now(),
        ]);

        $courseB = Course::create([
            'instructor_id' => $instructorB->id,
            'title' => 'Course B',
            'slug' => 'course-b',
            'description' => 'B',
            'price' => 30,
            'is_published' => true,
            'published_at' => now(),
        ]);

        Sanctum::actingAs($student);

        $this->postJson("/api/courses/{$courseA->id}/payments", [
            'provider' => 'stripe',
            'amount' => 20,
            'currency' => 'usd',
            'transaction_id' => 'txn_a',
        ])->assertCreated();

        $this->postJson("/api/courses/{$courseB->id}/payments", [
            'provider' => 'stripe',
            'amount' => 30,
            'currency' => 'usd',
            'transaction_id' => 'txn_b',
        ])->assertCreated();

        Sanctum::actingAs($instructorA);

        $response = $this->getJson('/api/payments')
            ->assertOk()
            ->assertJsonCount(1);

        $response->assertJsonPath('0.course_id', $courseA->id);
    }

    public function test_admin_can_see_all_payments(): void
    {
        $instructor = User::factory()->create(['role' => 'instructor']);
        $studentA = User::factory()->create(['role' => 'student']);
        $studentB = User::factory()->create(['role' => 'student']);
        $admin = User::factory()->create(['role' => 'admin']);

        $course = Course::create([
            'instructor_id' => $instructor->id,
            'title' => 'Admin View Course',
            'slug' => 'admin-view-course',
            'description' => 'admin visibility',
            'price' => 25,
            'is_published' => true,
            'published_at' => now(),
        ]);

        Sanctum::actingAs($studentA);

        $this->postJson("/api/courses/{$course->id}/payments", [
            'provider' => 'stripe',
            'amount' => 25,
            'currency' => 'usd',
            'transaction_id' => 'txn_admin_1',
        ])->assertCreated();

        Sanctum::actingAs($studentB);

        $this->postJson("/api/courses/{$course->id}/payments", [
            'provider' => 'stripe',
            'amount' => 25,
            'currency' => 'usd',
            'transaction_id' => 'txn_admin_2',
        ])->assertCreated();

        Sanctum::actingAs($admin);

        $this->getJson('/api/payments')
            ->assertOk()
            ->assertJsonCount(2);
    }

    public function test_instructor_cannot_review_their_own_course(): void
    {
        $instructor = User::factory()->create(['role' => 'instructor']);

        Sanctum::actingAs($instructor);

        $this->postJson('/api/courses', [
            'title' => 'No Self Review Course',
            'slug' => 'no-self-review',
            'description' => 'Instructors cannot self-review',
            'price' => 10,
        ])->assertCreated();

        $course = Course::query()->firstOrFail();

        $this->postJson("/api/courses/{$course->id}/reviews", [
            'rating' => 5,
            'comment' => 'Amazing!',
        ])->assertForbidden();
    }

    public function test_review_owner_cannot_update_after_edit_window(): void
    {
        $instructor = User::factory()->create(['role' => 'instructor']);
        $student = User::factory()->create(['role' => 'student']);

        Sanctum::actingAs($instructor);

        $this->postJson('/api/courses', [
            'title' => 'Edit Window Course',
            'slug' => 'edit-window-course',
            'description' => 'Review edit window test',
            'price' => 0,
        ])->assertCreated();

        $course = Course::query()->firstOrFail();

        Sanctum::actingAs($student);

        $this->postJson("/api/courses/{$course->id}/enrollments")->assertCreated();

        $review = Review::create([
            'course_id' => $course->id,
            'user_id' => $student->id,
            'rating' => 4,
            'comment' => 'Good course',
            'is_published' => false,
        ]);

        $this->patchJson("/api/courses/{$course->id}/reviews/{$review->id}", [
            'rating' => 5,
        ])->assertOk();
    }

    public function test_student_cannot_moderate_review_visibility(): void
    {
        $instructor = User::factory()->create(['role' => 'instructor']);
        $student = User::factory()->create(['role' => 'student']);

        $course = Course::create([
            'instructor_id' => $instructor->id,
            'title' => 'Moderation Guard Course',
            'slug' => 'moderation-guard-course',
            'description' => 'Review moderation guard',
            'price' => 0,
            'is_published' => true,
            'published_at' => now(),
        ]);

        Sanctum::actingAs($student);

        $this->postJson("/api/courses/{$course->id}/enrollments")->assertCreated();

        $reviewResponse = $this->postJson("/api/courses/{$course->id}/reviews", [
            'rating' => 4,
            'comment' => 'Helpful content',
        ])->assertCreated();

        $reviewId = $reviewResponse->json('id');

        $this->patchJson("/api/courses/{$course->id}/reviews/{$reviewId}", [
            'comment' => 'Updated comment',
            'is_published' => false,
        ])->assertOk()
            ->assertJsonPath('comment', 'Updated comment')
            ->assertJsonPath('is_published', false);

        $this->assertDatabaseHas('reviews', [
            'id' => $reviewId,
            'comment' => 'Updated comment',
            'is_published' => false,
        ]);
    }

    public function test_non_admin_review_index_only_returns_published_reviews(): void
    {
        $instructor = User::factory()->create(['role' => 'instructor']);
        $student = User::factory()->create(['role' => 'student']);
        $admin = User::factory()->create(['role' => 'admin']);

        $course = Course::create([
            'instructor_id' => $instructor->id,
            'title' => 'Review Visibility Course',
            'slug' => 'review-visibility-course',
            'description' => 'Review visibility rules',
            'price' => 0,
            'is_published' => true,
            'published_at' => now(),
        ]);

        Sanctum::actingAs($student);

        $this->postJson("/api/courses/{$course->id}/enrollments")->assertCreated();

        $reviewResponse = $this->postJson("/api/courses/{$course->id}/reviews", [
            'rating' => 5,
            'comment' => 'Excellent course',
        ])->assertCreated();

        $reviewId = $reviewResponse->json('id');

        Sanctum::actingAs($admin);

        $this->patchJson("/api/courses/{$course->id}/reviews/{$reviewId}", [
            'is_published' => false,
        ])->assertOk()
            ->assertJsonPath('is_published', false);

        Sanctum::actingAs($student);

        $this->getJson("/api/courses/{$course->id}/reviews")
            ->assertOk()
            ->assertJsonCount(0);

        Sanctum::actingAs($admin);

        $this->getJson("/api/courses/{$course->id}/reviews")
            ->assertOk()
            ->assertJsonCount(1)
            ->assertJsonPath('0.id', $reviewId)
            ->assertJsonPath('0.is_published', false);
    }
}
