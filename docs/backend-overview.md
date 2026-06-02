---
outline: deep
---

# Backend Overview

This documentation describes the backend logic currently implemented for TechTutor.

## Stack

- Laravel 13
- PHP 8.3
- PostgreSQL 16
- Laravel Sanctum

## Implemented Domain Model

- User
- Course
- Module
- Lesson
- Enrollment
- Progress
- Quiz
- QuizAttempt
- Review
- Payment
- CourseCertificate
- PublishRequest

## Current Capabilities

### Roles and Access

- Role field on users (`student`, `instructor`, `admin`)
- Role-aware checks in business logic and policies
- Sanctum middleware for protected routes
- Public registration and login issue Sanctum bearer tokens
- Current-user, logout, verification resend, email verification, forgot-password, and reset-password endpoints are available
- Banned users cannot sign in and are blocked from protected routes
- Auth endpoints are rate-limited to reduce brute-force attempts
- `CAPTCHA_ENABLED` in backend `.env` is the source of truth for whether CAPTCHA is enforced
- The frontend reads `/api/app-config` to decide whether to render CAPTCHA UI
- Registration, login, and the email-code signup request require CAPTCHA only when `CAPTCHA_ENABLED=true`
- Request normalization strips tags and trims common user-facing text inputs before validation

### Auth Security Notes

- Use an invisible CAPTCHA or score-based CAPTCHA in production to keep login and registration low-friction
- Local development can use a demo token only when CAPTCHA is enabled but no site key is configured yet
- `localhost` is an acceptable site entry for local testing and can be replaced later in the CAPTCHA provider dashboard
- If CAPTCHA is disabled, the frontend hides the CAPTCHA helper entirely and sends no token

### Runtime App Config

- `GET /api/app-config` exposes the frontend-facing runtime switches that the auth UI needs
- The current payload includes `captcha_enabled` and `captcha_site_key`
- This keeps the frontend aligned with the backend `.env` without hardcoding security behavior into the browser bundle

#### Google OAuth Authentication

TechTutor supports seamless Google OAuth login for students and existing users.

**Flow:**

1. Frontend initiates OAuth by opening `/auth/google/redirect?return_to=<frontend_origin>` in a popup window
2. User authenticates with Google and consents to data sharing
3. Backend processes callback via `/auth/google/callback` with session-stored return URL
4. On success: user is created or updated, verified, and issued a Sanctum token
5. Backend sends authentication payload via `window.postMessage()` back to the frontend popup
6. Frontend extracts token and user data, closes popup, and authenticates session

**User Creation/Update Logic:**

- New users: created with email from Google, **random unguessable password** (never shown to user), `student` role, auto-verified
  - If Google OAuth becomes unavailable later, use the "Forgot Password" flow to set a recoverable password
  - The random password ensures security: even if your email is known, no one can login as you without going through Google or password reset
- Existing users: name updated if missing, email automatically verified on OAuth
- Banned users: rejected at callback stage with error message
- Email is the unique identifier; the same Google email always updates the same TechTutor user

**Session Management:**

- OAuth return URL stored in `session['google_oauth_return_to']` during redirect step
- URL validated via `resolveFrontendOrigin()` to prevent open redirects
- Session data cleared after callback processing

### Course Structure

- Course CRUD
- Module CRUD nested under course
- Lesson CRUD nested under module
- Publish/draft flags and metadata fields on course and quiz
- Course catalog metadata: subtitle, category, level, language, thumbnail path, and duration
- Database-backed course catalog search, filtering, sorting, rating average, review count, and enrollment count
- MeiliSearch-backed free-text catalog indexing and search sync for courses

### Instructor Dashboard

- Live dashboard summary for instructors and admins
- Course management overview with published/draft counts
- Student progress per course from lesson completion records
- Enrollment, completion, certificate, quiz score, and revenue aggregates
- No dashboard statistics tables are stored
- Revenue currently reads internal paid payment records and can be refined when real payment provider webhooks are introduced

### Admin Monitoring

- Live platform activity monitor for admins
- User, course, enrollment, certificate, quiz attempt, and moderation totals
- Payment status breakdown and paid revenue by course
- Recent activity feed from existing users, courses, enrollments, payments, and certificates
- No platform monitoring statistics tables are stored

### Student Learning Flow

- Enroll into course
- Save lesson progress (0-100)
- Track completion timestamp when progress reaches 100
- Issue an idempotent course certificate when a course becomes complete
- Certificate visibility is role-aware: students see their own, instructors see certificates for their courses, admins see all
- Email the student when enrollment is created and when a certificate is issued

### Quiz Flow

- Quiz CRUD under course
- Single-choice and multiple-choice quiz questions
- Quiz attempts under quiz
- Backend-calculated attempt score from submitted answers
- Automatic `passed` computation from calculated score and pass threshold
- Live instructor/admin quiz analytics computed from existing attempts and questions
- No separate statistics tables are stored for quiz analytics
- Email the student after each completed quiz attempt with score/pass status

### Notifications

- Laravel mail notifications use the configured mailer from `.env`
- Current email triggers: registration verification, password reset, new enrollment, completed quiz attempt, issued certificate, and admin-handled publish request
- Notification tests fake the notification channel so SMTP credentials are never used by the automated suite

### Input Validation and Sanitization Audit

- Auth requests normalize email, token name, and user display fields before validation
- Course, module, lesson, review, comment, quiz, and payment request payloads normalize text inputs before persistence
- Quiz question and option text is stripped of HTML tags and squished to plain text
- URL fields used in checkout requests are trimmed before use
- The goal is to reject malformed data early and reduce accidental HTML injection in stored content

### Commerce and Community

- Course review create/update/delete
- Payment create/list with provider, amount, currency, status
- Internal purchase flow issues receipts, marks the payment as paid, grants course access, and creates an active enrollment
- Paid-course enrollment requires an existing paid payment for students
- Stripe Checkout session creation is wired for paid courses and stores pending Stripe payments
- Stripe webhook verification converts paid Checkout Sessions into receipts and active enrollments
- Publish requests notify instructors when admins approve or decline them

### Seed Data

Database seeding includes role-based users:

- `admin@techtutor.test`
- `backend@techtutor.test` (seeded instructor)
- `student@techtutor.test`
- `student2@techtutor.test`
- `banned@techtutor.test`

## Project Structure

### Directory Layout

```
backend/
├── app/
│   ├── Http/
│   │   ├── Controllers/        # 25 Controllers handling all features
│   │   ├── Middleware/         # Custom middleware (auth, banning)
│   │   └── Requests/           # 28 Request classes for validation
│   ├── Models/                 # 17 Database models
│   ├── Services/               # 6 Service classes for business logic
│   ├── Notifications/          # Email notifications
│   ├── Policies/               # Authorization policies
│   ├── Providers/              # Service providers
│   └── Exceptions/             # Custom exceptions
├── routes/
│   ├── api.php                 # All REST API routes (~100 endpoints)
│   ├── web.php                 # Optional web routes
│   └── console.php             # Artisan commands
├── database/
│   ├── migrations/             # Schema migrations
│   ├── seeders/                # Database seeders
│   └── factories/              # Model factories for testing
├── config/                     # Configuration files
├── tests/
│   ├── Feature/                # 8 feature test suites
│   ├── Unit/                   # Unit tests
│   └── TestCase.php            # Base test class
├── resources/                  # Blade templates (minimal - API only)
└── storage/                    # Logs, uploads, cache

```

### Key Components

#### Controllers (25 total)

- **Auth** - Registration, login, OAuth, password reset
- **Course** - CRUD, publishing, catalog with Meilisearch
- **Content** - Modules, lessons, quizzes (nested resources)
- **Interaction** - Reviews, comments (with moderation queue)
- **Commerce** - Payments, Stripe checkout, receipts
- **Learning** - Progress tracking, certificates, analytics
- **Admin** - User management, moderation, platform dashboard
- **Instructor** - Dashboard, analytics, publish requests

#### Request Classes (28 total)

- **Auth Requests** - Login, register (multi-step), password reset
- **Content Requests** - Course, module, lesson, quiz CRUD
- **Interaction Requests** - Reviews, comments with publication flags
- **Commerce Requests** - Payments, Stripe checkout
- **Admin Requests** - User management, moderation decisions

#### Models (17 total)

- **Core** - User, Course, Module, Lesson
- **Learning** - Enrollment, Progress, CourseCertificate
- **Interaction** - Review, Comment (threaded)
- **Commerce** - Payment, Receipt
- **Assessment** - Quiz, QuizAttempt, QuizQuestion
- **Workflow** - PublishRequest, EmailVerificationCode, UserInvite
- **Contact** - ContactMessage

#### Services (6 total)

- `CourseEnrollmentService` - Enrollment logic and notifications
- `PaymentFulfillmentService` - Payment processing and receipt generation
- `CourseCertificateIssuer` - Certificate eligibility and issuance
- `CourseProgressCalculator` - Progress percentage calculations
- `StripeCheckoutService` - Stripe payment session management
- `CaptchaVerifier` - CAPTCHA token validation

## Authorization Model

### Roles & Hierarchy

- **Student** - Can enroll, complete courses, submit reviews/comments, purchase
- **Instructor** - Can create/edit courses, view analytics, request publishing, moderate own content
- **Admin** - Full platform access, content moderation, user management, platform analytics

### Access Control Pattern

1. **Route Middleware** - `auth:sanctum` guards protected endpoints
2. **Controller-Level** - Manual authorization checks via `authorize()` and role checks
3. **Resource Ownership** - Users can only access/modify their own resources
4. **Content Visibility** - Non-privileged users only see published content

### Banning System

- Admins can ban users globally via `is_banned` flag
- Banned users cannot login and are blocked from protected routes
- `EnsureUserIsNotBanned` middleware enforces bans on all protected endpoints

## Content Publishing Workflow

### Draft → Published Flow

1. **Creation** - Instructors create courses/lessons/quizzes as drafts
2. **Preparation** - Add content, configure settings, set `is_published = false`
3. **Request Publishing** - Call `POST /courses/{course}/publish-request`
4. **Admin Review** - Publish request enters moderation queue
5. **Decision** - Admin approves (`is_published = true`) or declines with reason
6. **Notification** - Instructor notified of decision

### Moderation Queue

- Reviews and lesson comments go unpublished until admin approval
- Centralized moderation dashboard showing all pending content
- Admins can approve, decline, or request edits

## Test Coverage

### Feature Tests (8 suites)

| Test File                       | Tests                                                          | Coverage                 |
| ------------------------------- | -------------------------------------------------------------- | ------------------------ |
| **AuthFlowTest**                | Registration, email verification, login, password reset, OAuth | Authentication workflows |
| **CourseFlowTest**              | Course CRUD, enrollment, progress, certificates                | Core learning path       |
| **CommerceFlowTest**            | Payments, reviews, purchase verification                       | E-commerce workflows     |
| **QuizFlowTest**                | Quiz CRUD, attempts, scoring, limits                           | Assessment system        |
| **InstructorDashboardFlowTest** | Metrics, analytics, certificates                               | Instructor analytics     |
| **AdminPanelFlowTest**          | Dashboard, user management, moderation                         | Admin operations         |
| **LessonCommentFlowTest**       | Comments, threads, moderation, instructor queue                | Comment system           |
| **UserInviteFlowTest**          | Invitations, token acceptance, role assignment                 | Invite system            |

### Running Tests

```bash
# All tests
php artisan test

# Specific test file
php artisan test tests/Feature/CourseFlowTest.php

# Specific test method
php artisan test tests/Feature/AuthFlowTest.php --filter=test_user_can_register

# With coverage report
php artisan test --coverage

# Watch mode
php artisan test --watch
```

### Test Environment Setup

Tests use SQLite in-memory database with:

- Array mailer (no real emails sent)
- Array cache/session store
- Sync queue processing
- PULSE and TELESCOPE disabled

See `phpunit.xml` for test configuration.

## Testing Best Practices

1. **Use RefreshDatabase** - Ensures clean state between tests
2. **Mock External Services** - CAPTCHA, OAuth tokens, Stripe
3. **Assertion Types** - `assertJsonPath()`, `assertStatus()`, `assertDatabaseHas()`
4. **Seeded Data** - Use seeders for consistent test data
5. **Admin/User Tokens** - Create test tokens with `actingAs()` or dev endpoint
