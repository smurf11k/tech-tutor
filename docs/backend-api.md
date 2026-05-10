---
outline: deep
---

# Backend API (Current)

Base URL during local backend development:

- `http://127.0.0.1:8000/api`

## Public Routes

- `GET /courses`
- `GET /courses/{course}`
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `GET /auth/email/verify/{id}/{hash}`
- `POST /dev/token` (local debug helper for seeded demo accounts)

### Auth

`POST /auth/register` creates a student or instructor account, sends an email verification notification, and returns a Sanctum bearer token.

```json
{
  "name": "New Student",
  "email": "student@example.com",
  "password": "password123",
  "password_confirmation": "password123",
  "role": "student",
  "token_name": "frontend"
}
```

Allowed self-registration roles are `student` and `instructor`; admins are still managed by seed data or admin tools.

`POST /auth/login` accepts `email`, `password`, and optional `token_name`, then returns:

```json
{
  "token": "1|...",
  "token_type": "Bearer",
  "user": {
    "id": 1,
    "email": "student@example.com",
    "role": "student"
  }
}
```

Banned users cannot log in.

Password reset flow:

- `POST /auth/forgot-password` with `{ "email": "student@example.com" }` sends a reset email.
- `POST /auth/reset-password` with `email`, `token`, `password`, and `password_confirmation` updates the password and revokes existing Sanctum tokens.

Email verification flow:

- Registration sends a signed verification URL.
- `GET /auth/email/verify/{id}/{hash}` marks the address as verified when the URL signature is valid.
- `POST /auth/email/resend` resends the verification email for the authenticated user.

### Course Catalog Query Parameters

`GET /courses` supports database-backed catalog filters:

- `q`: search title, subtitle, description, category, and slug
- `category`
- `level`
- `language`
- `instructor_id`
- `price_type`: `free` or `paid`
- `min_price`
- `max_price`
- `sort`: `newest`, `oldest`, `title`, `price_asc`, `price_desc`, or `rating`
- `per_page`: 1-50

Example:

```bash
curl -X GET "$BASE_URL/courses?q=laravel&category=backend&price_type=paid&sort=price_desc"
```

TODO: replace the relational `q` search fallback with MeiliSearch-backed indexing once the search service is introduced.

## Protected Routes (Sanctum)

Banned users are blocked from protected routes.

### Authenticated User

- `GET /auth/me`
- `POST /auth/logout`
- `POST /auth/email/resend`

`POST /auth/logout` deletes the current Sanctum access token.

### Admin

- `GET /admin/users`
- `PATCH /admin/users/{user}`
- `GET /admin/platform-dashboard`
- `GET /admin/moderation-queue`
- `PATCH /admin/moderation-queue/reviews/{review}`
- `PATCH /admin/moderation-queue/comments/{comment}`

`GET /admin/platform-dashboard` returns live platform monitoring metrics. It is admin-only and does not store separate statistics rows.

Returned data includes:

- user/course/enrollment/certificate/quiz attempt totals
- moderation queue counts
- payment totals and paid revenue
- payment status breakdown
- paid revenue grouped by course
- recent activity feed

Revenue currently uses internal `payments` rows with `status = paid`. When Stripe/LiqPay checkout and webhooks are added, this aggregation should be based on verified provider-backed payment states.

### Instructor Dashboard

- `GET /instructor/dashboard`

Available to instructors and admins. The response is calculated live from current courses, enrollments, lesson progress, certificates, quiz attempts, and paid payment records.

Returned summary metrics include:

- `courses_count`
- `published_courses_count`
- `draft_courses_count`
- `enrollments_count`
- `certificates_count`
- `revenue_total`
- `average_progress`
- `average_quiz_score`

Each course row includes lesson/module/quiz counts, enrollment count, certificate count, completion rate, average progress, average quiz score, paid payments count, and paid revenue total.

Revenue currently uses internal `payments` rows with `status = paid`. When Stripe/LiqPay checkout and webhooks are added, this aggregation should be pointed at the verified provider-backed payment states.

### Courses

- `POST /courses`
- `PUT /courses/{course}`
- `PATCH /courses/{course}`
- `DELETE /courses/{course}`

Course create/update payloads support catalog metadata:

- `subtitle`
- `category`
- `level`
- `language`
- `thumbnail_path`
- `duration_minutes`

### Enrollments

- `GET /courses/{course}/enrollments`
- `POST /courses/{course}/enrollments`
- `DELETE /courses/{course}/enrollments/{enrollment}`

Creating a new enrollment sends an email notification to the enrolled student through the configured Laravel mailer. Re-enrolling into an existing enrollment does not send a duplicate notification.

For paid courses, students must purchase the course before direct enrollment. If no paid payment exists, `POST /courses/{course}/enrollments` returns `402` with:

```json
{
  "message": "Purchase this course before enrolling."
}
```

Admins and the course instructor may enroll without purchase checks.

### Modules

- `GET /courses/{course}/modules`
- `POST /courses/{course}/modules`
- `GET /courses/{course}/modules/{module}`
- `PUT /courses/{course}/modules/{module}`
- `PATCH /courses/{course}/modules/{module}`
- `DELETE /courses/{course}/modules/{module}`

### Lessons

- `GET /modules/{module}/lessons`
- `POST /modules/{module}/lessons`
- `GET /modules/{module}/lessons/{lesson}`
- `PUT /modules/{module}/lessons/{lesson}`
- `PATCH /modules/{module}/lessons/{lesson}`
- `DELETE /modules/{module}/lessons/{lesson}`

### Progress

- `POST /lessons/{lesson}/progress`
- `PUT /lessons/{lesson}/progress`

When progress reaches `100`, the backend checks whether the student has completed every lesson in the course. If yes, it issues or returns the existing course certificate in the progress response.

Progress response shape:

```json
{
  "progress": {
    "id": 1,
    "progress_percent": 100
  },
  "certificate": {
    "id": 1,
    "certificate_number": "TT-1-3-20260505-ABC123"
  }
}
```

`certificate` is `null` until the full course is complete.

### Certificates

- `GET /certificates`
- `GET /certificates/{certificate}`
- `POST /courses/{course}/certificate`

Certificate access is role-aware:

- Students see their own certificates.
- Instructors see certificates issued for their courses.
- Admins see all certificates.

`POST /courses/{course}/certificate` manually checks completion eligibility for the authenticated student and returns the existing certificate if one was already issued. Certificates are stored because they are stable issued artifacts, not transient statistics.

When a certificate is first issued, the backend emails the student with the course title and certificate number.

### Quizzes

- `GET /courses/{course}/quizzes`
- `POST /courses/{course}/quizzes`
- `GET /courses/{course}/quizzes/{quiz}`
- `PUT /courses/{course}/quizzes/{quiz}`
- `PATCH /courses/{course}/quizzes/{quiz}`
- `DELETE /courses/{course}/quizzes/{quiz}`

Quiz create/update payloads may include `questions`.

Supported question types:

- `single_choice`: exactly one option must have `is_correct: true`
- `multiple_choice`: one or more options may have `is_correct: true`

Example question payload:

```json
{
  "type": "multiple_choice",
  "prompt": "Which pieces belong to the backend flow?",
  "points": 2,
  "options": [
    { "key": "policies", "text": "Policies", "is_correct": true },
    { "key": "middleware", "text": "Middleware", "is_correct": true },
    { "key": "tailwind", "text": "Tailwind utility classes" }
  ]
}
```

Question responses hide `correct_answers` so students can view available options without receiving the answer key.

### Quiz Attempts

- `GET /quizzes/{quiz}/attempts`
- `POST /quizzes/{quiz}/attempts`

Quiz attempts accept `answers` only. The backend calculates `score` and `passed`.

Example:

```json
{
  "answers": {
    "1": "sanctum",
    "2": ["middleware", "policies"]
  }
}
```

After an attempt is created, the backend emails the student with the quiz title, calculated score, pass threshold, and pass/fail status.

### Quiz Analytics

- `GET /quizzes/{quiz}/analytics`

Only the course instructor and admins may access quiz analytics. The response is calculated live from `quiz_attempts` and `quiz_questions`; no separate analytics/statistics entity is stored.

Returned metrics include:

- `attempts_count`
- `unique_students_count`
- `average_score`
- `highest_score`
- `lowest_score`
- `passed_count`
- `failed_count`
- `pass_rate`
- `question_breakdown`
- `recent_attempts`

### Reviews

- `GET /courses/{course}/reviews`
- `POST /courses/{course}/reviews`
- `PUT /courses/{course}/reviews/{review}`
- `PATCH /courses/{course}/reviews/{review}`
- `DELETE /courses/{course}/reviews/{review}`

### Lesson Comments

- `GET /lessons/{lesson}/comments`
- `POST /lessons/{lesson}/comments`
- `PUT /lessons/{lesson}/comments/{comment}`
- `PATCH /lessons/{lesson}/comments/{comment}`
- `DELETE /lessons/{lesson}/comments/{comment}`

### Payments

- `GET /payments`
- `GET /payments/{payment}`
- `POST /courses/{course}/payments`
- `POST /courses/{course}/payments/stripe-checkout`
- `POST /stripe/webhook`

`POST /courses/{course}/payments` is the current internal purchase endpoint. It validates that the submitted amount matches the current course price for non-admin users, creates a paid payment record, issues a receipt number, grants access, and creates/returns the active enrollment.

Example payload:

```json
{
  "provider": "manual_demo",
  "amount": 49.99,
  "currency": "USD",
  "transaction_id": "txn_optional_unique_id",
  "provider_payload": {
    "source": "frontend_demo"
  }
}
```

Response shape:

```json
{
  "payment": {
    "id": 1,
    "status": "paid",
    "receipt_number": "TT-RCPT-20260507-ABC12345",
    "receipt_issued_at": "2026-05-07T12:00:00.000000Z",
    "access_granted_at": "2026-05-07T12:00:00.000000Z"
  },
  "enrollment": {
    "id": 1,
    "status": "active"
  }
}
```

`GET /payments/{payment}` returns a receipt/payment record to the payment owner, the course instructor, or an admin.

Stripe Checkout session creation and webhook fulfillment are complete. LiqPay integration is planned. The payment flow is provider-agnostic: both Stripe webhooks and internal payments create the same `payments` rows with `status = paid`, so enrollment logic remains unified.

`POST /courses/{course}/payments/stripe-checkout` creates a Stripe Checkout Session for a paid course and stores a local pending Stripe payment tied to the returned Checkout Session ID.

Optional payload:

```json
{
  "success_url": "http://127.0.0.1:5173/payment/success",
  "cancel_url": "http://127.0.0.1:5173/payment/cancel"
}
```

Response shape:

```json
{
  "payment": {
    "id": 2,
    "provider": "stripe",
    "status": "pending",
    "transaction_id": "cs_test_..."
  },
  "checkout": {
    "session_id": "cs_test_...",
    "url": "https://checkout.stripe.com/c/pay/...",
    "mode": "payment"
  }
}
```

Important: Stripe Checkout creation does not grant access immediately. Access is granted only after a verified `checkout.session.completed` webhook confirms `payment_status = paid`.

`POST /stripe/webhook` is public because Stripe calls it server-to-server. It verifies the `Stripe-Signature` header with `STRIPE_WEBHOOK_SECRET`. On a valid paid `checkout.session.completed` event, it finds the pending local Stripe payment by Checkout Session ID, validates amount/currency when present, marks the payment `paid`, issues a receipt, sets access timestamps, and creates the active enrollment idempotently.

For local testing, forward only the needed event:

```bash
stripe listen --forward-to http://127.0.0.1:8000/api/stripe/webhook --events checkout.session.completed
```

Copy the printed `whsec_...` value into backend `.env` as `STRIPE_WEBHOOK_SECRET`, then clear cached config if needed:

```bash
php artisan config:clear
```

When deployed, create a Workbench webhook endpoint pointing to:

```txt
https://your-domain.example/api/stripe/webhook
```

`GET /payments/status` allows checking the current payment status for a Stripe Checkout Session. No authentication is required if a `session_id` query parameter is provided.

Query parameters:

- `session_id` (required if not authenticated): Stripe Checkout Session ID
- `course_id` (optional): Course ID for filtering

Response shape:

```json
{
  "status": "paid",
  "payment": {
    "id": 2,
    "amount": "49.99",
    "currency": "EUR",
    "transaction_id": "cs_test_..."
  }
}
```

When authenticated, the endpoint scopes results to the current user. When unauthenticated, only `session_id` results are returned.

`POST /payments/stripe/confirm` finalizes a pending Stripe payment by verifying the checkout session status with Stripe's API. Requires authentication and a valid `session_id`.

Payload:

```json
{
  "session_id": "cs_test_..."
}
```

Response shape:

```json
{
  "payment": {
    "id": 2,
    "status": "paid",
    "receipt_number": "TT-RCPT-20260510-ABC12345"
  },
  "enrollment": {
    "id": 10,
    "status": "active"
  }
}
```

This endpoint is called automatically by the frontend return handler after a successful Stripe redirect to ensure the payment is marked `paid` before checking enrollment state.

Select the `checkout.session.completed` event and use that endpoint's signing secret in production/staging env.

### Publish-request workflow

Instructors may create courses as drafts and request publishing. The backend tracks these requests in a `publish_requests` table and exposes publish controls via the existing course endpoints.

- Instructor request (create/update course): include `request_publish: true` in the JSON payload to create a pending publish request.
- Admin accept: admin publishes the course using `PATCH /courses/{course}` with `{ "is_published": true }`. Any pending request for the course is marked `accepted`, and the requester is emailed.
- Admin decline: admin may decline a pending request using `PATCH /courses/{course}` with `{ "decline_publish": true, "publish_request_declined_reason": "optional reason" }`. The request is marked `declined`, the decline reason is stored, and the requester is emailed.

Data model & files:

- Migration: `database/migrations/2026_04_29_000000_create_publish_requests_table.php`
- Model: `app/Models/PublishRequest.php`
- Controller handling: `app/Http/Controllers/CourseController.php`

### Email notifications

Email delivery uses Laravel notifications and the mailer configured in backend `.env`.

Current triggers:

- Registration verification
- Password reset
- Enrollment confirmation after a new enrollment is created
- Quiz result after a quiz attempt is completed
- Certificate issued after full course completion
- Publish request approved or declined by an admin

For local demos with SMTP/Gmail configured, these emails are sent by the same API actions listed above. Automated tests fake notifications and use the array mailer from `phpunit.xml`, so the test suite does not send real emails.

## Notes

- Access control is role-aware for student/instructor/admin.
- Admin endpoints handle role changes, bans, and queued review moderation.
- Admin moderation queue handles both review and lesson comment approval.
- Local dev token creation expects seeded `email` and `password` credentials.
- Progress and quiz attempt actions include enrollment/instructor checks.
- Newly submitted course reviews enter the moderation queue unpublished until an admin approves them.
- Newly submitted lesson comments also enter the moderation queue unpublished until an admin approves them.
- Request validation is handled with FormRequest classes.
