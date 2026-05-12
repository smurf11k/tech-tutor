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
- Registration and login require CAPTCHA when CAPTCHA is configured in `.env`
- Request normalization strips tags and trims common user-facing text inputs before validation

### Auth Security Notes

- Use an invisible CAPTCHA or score-based CAPTCHA in production to keep login and registration low-friction
- Local development can use a demo token for the CAPTCHA helper button, but production still requires the real widget token
- `localhost` is an acceptable site entry for local testing and can be replaced later in the CAPTCHA provider dashboard

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

TODO: move free-text catalog search and ranking to MeiliSearch when search infrastructure is added.

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
- Issue an idempotent course certificate after every course lesson is completed
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
- `instructor@techtutor.test`
- `student@techtutor.test`
- `student2@techtutor.test`
- `banned@techtutor.test`

## Test Coverage

Feature tests currently cover:

- Course creation, enrollment, and lesson progress
- Registration, login/logout, email verification, and password reset
- Course catalog search/filtering and metadata
- Quiz creation and student attempt submission
- Email notification trigger assertions
- Review and purchase/payment flow

Run tests:

```bash
php artisan test
```
