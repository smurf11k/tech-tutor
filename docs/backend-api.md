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
- `POST /auth/register/request-verification-code`
- `POST /auth/register/verify-code`
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

When CAPTCHA is enabled in backend `.env`, both registration and login also require `captcha_token`.

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

Auth endpoints are rate-limited server-side to reduce brute-force abuse.

Password reset flow:

- `POST /auth/forgot-password` with `{ "email": "student@example.com" }` sends a reset email.
- `POST /auth/reset-password` with `email`, `token`, `password`, and `password_confirmation` updates the password and revokes existing Sanctum tokens.

Email verification flow:

- Registration sends a signed verification URL.
- `GET /auth/email/verify/{id}/{hash}` marks the address as verified when the URL signature is valid.
- `POST /auth/email/resend` resends the verification email for the authenticated user.

**Alternative email verification with 6-digit code:**

TechTutor also supports a two-step registration flow with email verification codes:

1. `POST /auth/register/request-verification-code` — Creates a verification record, generates a 6-digit code, and emails it to the provided address.
   - Requires `name`, `email`, `password`, `password_confirmation`, optional `role`, and `captcha_token` (if CAPTCHA is enabled)
   - Code expires in 5 minutes
   - Returns the email address for reference

2. `POST /auth/register/verify-code` — Validates the 6-digit code and finalizes registration.
   - Requires `email`, `code`, `name`, `password`, `password_confirmation`, optional `role` and `token_name`
   - Returns a Sanctum bearer token and user info on success

### Auth cURL / Postman Examples

Register with CAPTCHA token:

```bash
curl -X POST "http://127.0.0.1:8000/api/auth/register" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Student",
    "email": "student@example.com",
    "password": "password123",
    "password_confirmation": "password123",
    "role": "student",
    "token_name": "frontend",
    "captcha_token": "demo-captcha-token"
  }'
```

Login with CAPTCHA token:

```bash
curl -X POST "http://127.0.0.1:8000/api/auth/login" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@example.com",
    "password": "password123",
    "token_name": "frontend",
    "captcha_token": "demo-captcha-token"
  }'
```

Forgot password:

```bash
curl -X POST "http://127.0.0.1:8000/api/auth/forgot-password" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@example.com"
  }'
```

Reset password:

```bash
curl -X POST "http://127.0.0.1:8000/api/auth/reset-password" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "RESET_TOKEN_HERE",
    "email": "student@example.com",
    "password": "new-password123",
    "password_confirmation": "new-password123"
  }'
```

#### Email Verification Code Registration Flow

Request verification code (sends 6-digit code to email):

```bash
curl -X POST "http://127.0.0.1:8000/api/auth/register/request-verification-code" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Student",
    "email": "student@example.com",
    "password": "password123",
    "password_confirmation": "password123",
    "role": "student",
    "captcha_token": "demo-captcha-token"
  }'
```

Response:

```json
{
  "message": "Verification code sent to your email.",
  "email": "student@example.com"
}
```

Verify code and complete registration:

```bash
curl -X POST "http://127.0.0.1:8000/api/auth/register/verify-code" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@example.com",
    "code": "123456",
    "name": "New Student",
    "password": "password123",
    "password_confirmation": "password123",
    "role": "student",
    "token_name": "frontend"
  }'
```

Response:

```json
{
  "token": "1|...",
  "token_type": "Bearer",
  "user": {
    "id": 1,
    "email": "student@example.com",
    "name": "New Student",
    "role": "student",
    "email_verified_at": "2026-05-13T10:30:00Z"
  }
}
```

### Course Catalog Query Parameters

`GET /courses` supports catalog filters and MeiliSearch-backed free-text search when Scout is configured for MeiliSearch:

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

When `SCOUT_DRIVER=meilisearch`, the `q` parameter routes through MeiliSearch for free-text matching, while the remaining filters continue to apply to the catalog query.

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

## Controller Implementation Details

### AuthController

**Public Methods**:
- `register()` - Creates new student/instructor, sends verification email
- `login()` - Validates credentials, returns Sanctum token
- `requestVerificationCode()` - Creates 6-digit verification code, emails to address
- `verifyEmailCode()` - Validates code, completes registration
- `verifyEmail()` - Marks email verified from signed URL
- `forgotPassword()` - Sends password reset email
- `resetPassword()` - Updates password, revokes existing tokens
- `redirectToGoogle()` - Initiates Google OAuth flow
- `handleGoogleCallback()` - Processes Google callback, creates/updates user
- `resendVerification()` - Resends verification email for authenticated user

**Key Features**:
- CAPTCHA integration for registration/login
- Multi-step email verification with 6-digit codes
- Google OAuth with popup handshake
- Rate limiting (60 requests/min)
- User banning checks

### CourseController

**Public Methods**:
- `index()` - List/search/filter courses with Meilisearch support
- `store()` - Create new course (draft)
- `show()` - Get course details
- `update()` - Full course update
- `destroy()` - Delete course
- `catalogOptions()` - Get available filter options

**Features**:
- Meilisearch integration for full-text search
- Filtering: category, level, language, price, instructor
- Sorting: newest, oldest, title, price_asc, price_desc, rating
- Catalog metadata: subtitle, category, level, language, thumbnail, duration
- Publish request workflow with admin approval

### EnrollmentController

**Public Methods**:
- `index()` - Get course roster (instructor/admin only)
- `store()` - Enroll user in course
- `destroy()` - Drop course

**Key Checks**:
- Paid courses require existing paid payment
- Admins/instructors can enroll without payment
- Duplicate prevention (re-enrolling doesn't create new record)
- Enrollment notifications sent

### QuizAttemptController

**Public Methods**:
- `index()` - Get user's attempts (limit 3 per student)
- `store()` - Submit quiz attempt with answers

**Scoring**:
- Backend calculates score from answers
- Supports multiple choice and true/false
- Pass threshold configurable per quiz
- Attempt limit: 3 per student (instructors unlimited)

### PaymentController

**Public Methods**:
- `index()` - List user's payments
- `show()` - Get payment details
- `store()` - Create internal payment (manual purchase)
- `stripeCheckout()` - Create Stripe checkout session
- `confirmStripeCheckout()` - Confirm pending Stripe payment

**Payment Flow**:
1. Create payment with `POST /courses/{course}/payments`
2. Mark as paid, generate receipt number (TT-RCPT-YYYYMMDD-XXXXXXXX)
3. Create enrollment automatically
4. Send receipt email

**Stripe Flow**:
1. Create session with `POST /courses/{course}/payments/stripe-checkout`
2. Return checkout URL to client
3. Client redirects to Stripe
4. Stripe redirects back with session_id
5. Confirm with `POST /payments/stripe/confirm`
6. Webhook verifies payment and grants access

### ProgressController

**Public Methods**:
- `store()` - Create progress record
- `update()` - Update progress percentage

**Certificate Logic**:
- When progress reaches 100% and all lessons completed
- Check eligibility and issue certificate idempotently
- Send certificate email

### QuizController

**Public Methods**:
- `index()` - List course quizzes
- `store()` - Create quiz with questions
- `show()` - Get quiz details
- `update()` - Update quiz
- `destroy()` - Delete quiz

**Questions**:
- Types: multiple_choice, true_false
- Options with is_correct flags
- Points per question
- Answers hidden from students

### ModuleController & LessonController

**Features**:
- Nested CRUD under courses/modules
- Positional ordering
- Draft/published states
- File attachment support
- Preview mode for lessons

### ReviewController

**Features**:
- 1-5 star ratings
- Optional text reviews
- Moderation queue (unpublished by default)
- Instructor/admin can publish
- Average rating aggregation

### CommentController

**Features**:
- Threaded comments (parent_comment_id)
- Moderation queue
- Instructor pending queue
- Per-lesson comments
- Reply notifications

### AdminModerationQueueController

**Features**:
- Centralized queue for reviews, comments, publish requests
- Approve/decline with optional reason
- Status tracking (pending, accepted, declined)
- Notification system for decisions

### AdminPlatformDashboardController

**Response Data**:
- User counts (total, students, instructors, admins, banned)
- Course counts (published, draft)
- Totals: enrollments, certificates, quiz attempts, payments
- Status breakdown for payments
- Revenue by course
- Recent activity feed
- Moderation queue counts

---

## Request Validation Classes

### StoreCourseRequest / UpdateCourseRequest

**Validation Rules**:
- title: required, string, max 255
- slug: required, alpha_dash, unique (on creation), max 100
- description: required, string
- subtitle: nullable, string, max 255
- category: nullable, in:backend,frontend,mobile,data-science,other
- level: nullable, in:beginner,intermediate,advanced
- language: nullable, string, max 50
- thumbnail_path: nullable, url
- duration_minutes: nullable, integer, min:1
- price: nullable, numeric, min:0, max:99999.99
- is_published: boolean
- request_publish: boolean (triggers publish request workflow)

### StoreQuizRequest / UpdateQuizRequest

**Validation Rules**:
- title: required, string, max 255
- description: nullable, string
- pass_score: nullable, integer, min:0, max:100 (default 70)
- is_published: boolean
- position: nullable, integer
- questions: array of question objects
  - type: required, in:multiple_choice,true_false
  - prompt: required, string
  - points: required, integer, min:1
  - options: array with key, text, is_correct

### StorePaymentRequest

**Validation Rules**:
- provider: required, string (e.g., stripe, manual_demo)
- amount: required, numeric, min:0
- currency: required, string, size:3 (ISO 4217)
- transaction_id: required, unique per course/user
- provider_payload: nullable, array

### Auth Request Classes

**LoginRequest**:
- email: required, email
- password: required, string
- token_name: nullable, string
- captcha_token: required_if CAPTCHA enabled

**RegisterRequest**:
- name: required, string, max 255
- email: required, email, unique
- password: required, confirmed, min 8
- role: nullable, in:student,instructor (default student)
- captcha_token: required_if CAPTCHA enabled

**RequestVerificationCodeRequest**:
- name: required, string, max 255
- email: required, email, unique
- password: required, confirmed, min 8
- role: nullable, in:student,instructor
- captcha_token: required_if CAPTCHA enabled

**VerifyEmailCodeRequest**:
- email: required, email
- code: required, digits:6
- name: required, string, max 255
- password: required, confirmed, min 8
- role: nullable, in:student,instructor
- token_name: nullable, string

---

## Response Shapes

### Course Object

```json
{
  "id": 1,
  "instructor_id": 2,
  "title": "Learn Laravel",
  "slug": "learn-laravel",
  "description": "Full description...",
  "subtitle": "Master modern web development",
  "category": "backend",
  "level": "intermediate",
  "language": "en",
  "price": 49.99,
  "thumbnail_path": "https://...",
  "duration_minutes": 240,
  "is_published": true,
  "published_at": "2026-05-01T10:00:00.000000Z",
  "created_at": "2026-04-15T10:00:00.000000Z",
  "updated_at": "2026-04-20T15:30:00.000000Z",
  "instructor": {
    "id": 2,
    "name": "Jane Instructor",
    "email": "jane@example.com",
    "role": "instructor"
  },
  "enrollments_count": 42,
  "published_reviews_count": 15,
  "average_rating": 4.6
}
```

### Quiz Object

```json
{
  "id": 5,
  "course_id": 1,
  "module_id": 3,
  "title": "Laravel Fundamentals Quiz",
  "description": "Test your knowledge...",
  "pass_score": 70,
  "is_published": true,
  "position": 1,
  "questions": [
    {
      "id": 1,
      "type": "multiple_choice",
      "prompt": "What is dependency injection?",
      "points": 2,
      "options": [
        {
          "key": "option1",
          "text": "Injecting code into dependencies",
          "is_correct": false
        },
        {
          "key": "option2",
          "text": "Providing dependencies to a class",
          "is_correct": true
        }
      ]
    }
  ],
  "created_at": "2026-04-15T10:00:00Z"
}
```

### Enrollment Object

```json
{
  "id": 1,
  "course_id": 1,
  "user_id": 5,
  "status": "active",
  "enrolled_at": "2026-05-01T10:00:00Z",
  "created_at": "2026-05-01T10:00:00Z",
  "course": {
    "id": 1,
    "title": "Learn Laravel"
  },
  "user": {
    "id": 5,
    "name": "John Student",
    "email": "john@example.com"
  }
}
```

### Progress Object

```json
{
  "id": 1,
  "lesson_id": 10,
  "user_id": 5,
  "progress_percent": 75,
  "completed_at": null,
  "created_at": "2026-05-01T10:00:00Z",
  "updated_at": "2026-05-05T15:00:00Z"
}
```

### Certificate Object

```json
{
  "id": 1,
  "course_id": 1,
  "user_id": 5,
  "certificate_number": "TT-1-5-20260505-ABC123",
  "issued_at": "2026-05-05T10:00:00Z",
  "course": {
    "id": 1,
    "title": "Learn Laravel"
  },
  "user": {
    "id": 5,
    "name": "John Student"
  }
}
```

### Payment Object

```json
{
  "id": 1,
  "course_id": 1,
  "user_id": 5,
  "provider": "stripe",
  "amount": "49.99",
  "currency": "USD",
  "status": "paid",
  "transaction_id": "ch_test_123",
  "receipt_number": "TT-RCPT-20260505-ABC12345",
  "receipt_issued_at": "2026-05-05T10:00:00.000000Z",
  "access_granted_at": "2026-05-05T10:00:00.000000Z",
  "provider_payload": {},
  "created_at": "2026-05-05T09:00:00Z"
}
```

### QuizAttempt Object

```json
{
  "id": 1,
  "quiz_id": 5,
  "user_id": 5,
  "score": 85,
  "passed": true,
  "answers": {
    "1": "option2",
    "2": ["option1", "option3"],
    "3": "true"
  },
  "started_at": "2026-05-05T14:00:00Z",
  "completed_at": "2026-05-05T14:15:00Z",
  "created_at": "2026-05-05T14:15:00Z"
}
```

### Review Object

```json
{
  "id": 1,
  "course_id": 1,
  "user_id": 5,
  "rating": 5,
  "comment": "Great course! Very well structured.",
  "is_published": true,
  "moderated_at": "2026-05-05T15:00:00Z",
  "created_at": "2026-05-05T10:00:00Z",
  "updated_at": "2026-05-05T10:30:00Z",
  "user": {
    "id": 5,
    "name": "John Student"
  }
}
```

### Comment Object

```json
{
  "id": 1,
  "lesson_id": 10,
  "user_id": 5,
  "parent_comment_id": null,
  "body": "Question about this lesson...",
  "is_published": true,
  "moderated_at": "2026-05-05T15:00:00Z",
  "created_at": "2026-05-05T10:00:00Z",
  "replies": [
    {
      "id": 2,
      "parent_comment_id": 1,
      "user_id": 2,
      "body": "Here's the answer...",
      "user": {
        "id": 2,
        "name": "Jane Instructor",
        "role": "instructor"
      }
    }
  ],
  "user": {
    "id": 5,
    "name": "John Student"
  }
}
```
