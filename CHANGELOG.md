# Changelog

All notable changes to this project are documented in this file. Entries are ordered from newest (top) to oldest (bottom).

## Unreleased

### Progress

- Backend readiness: 95/100
- Frontend readiness: 35/100 (demo)

---

## 2026-05-15 — Add invite via token logic

### Backend

- Implemented inviting with a chosen (student/instructor) role for admins
- Send email with invitation link to chosen user with chosen role

### Frontend (demo)

- Added a section for invitation flow for admins

---

## 2026-05-14 — Add uk localization for docs and readme

### Docs

- Added ukrainian localized `.md` files for docs
- Added README-uk.md for consistency

---

## 2026-05-13 — MeiliSearch catalog indexing/search rollout

### Backend

- Added Laravel Scout + MeiliSearch integration for course catalog free-text search
- `Course` model is now Scout-searchable with explicit indexed payload fields for catalog use
- `GET /courses` now routes `q` free-text search through MeiliSearch when `SCOUT_DRIVER=meilisearch` is enabled
- Added MeiliSearch index settings for `courses` (filterable/sortable attributes) and synced index settings via Scout
- Added queue-backed indexing support (`SCOUT_QUEUE=true`) with database `jobs` migration for local/production-like processing
- Fixed `php artisan optimize` view-cache failure by restoring the expected `resources/views` directory

---

## 2026-05-13 — Email verification code registration flow

### Backend

- New registration flow with 6-digit email verification codes
- `POST /auth/register/request-verification-code` generates a code, emails it, and stores verification record with 5-minute expiration
- `POST /auth/register/verify-code` validates the code and completes registration with auto-verified email
- `EmailVerificationCode` model with active code scoping, validation, and cleanup utilities
- `EmailVerificationCodeNotification` sends codes via email
- New `VerifyEmailCodeRequest` form request with 6-digit code validation
- Comprehensive curl testing snippets added to backend-api.md documentation

### Frontend (demo)

- Sign-up modal with 2-step email verification code flow
- Step 1: Enter name, email, password, CAPTCHA → verification code sent
- Step 2: Enter 6-digit code → account created with verified email
- Sign-up button added to login card for easy access
- Demo CAPTCHA integration works with sign-up flow

---

## 2026-05-12 — Lesson file upload pipeline

### Backend

- Lesson create/update now accept uploaded files, store them on the public disk, and expose an absolute `file_url`
- Existing lesson files are deleted when replaced or when a file lesson is converted back to a non-file lesson
- Validation now requires an attachment for file lessons unless an existing stored file is already present
- Regression tests cover upload, replacement, and required-file behavior

### Frontend (demo)

- Lesson cards now show an `Open file` action when an uploaded lesson attachment is available

---

## 2026-05-12 — Security Hardening

- Auth endpoints are rate-limited to reduce brute-force abuse
- Registration and login now support CAPTCHA verification
- Shared input normalization/sanitization pass added for common user-facing forms
- Added auth cURL snippets for Postman/manual API testing

---

## 2026-05-12 — Google OAuth login

### Backend

- Google OAuth redirect/callback flow via Socialite
- Session-based popup return handling with frontend-origin validation
- Auto-provisioning / login for Google accounts, including banned-user checks and verified email handling
- Backend env/config wiring for Google client credentials and frontend redirect origin

### Frontend (demo)

- Google sign-in popup flow from the login screen
- `postMessage` handling to receive the OAuth payload and hydrate local auth state

### Tests

- Feature coverage for the Google OAuth callback flow and frontend payload response

---

## 2026-05-10 — Stripe integration (completed)

### Backend

- Stripe Checkout session creation and parameterized success/cancel URLs
- Webhook signature verification and idempotent fulfillment logic
- Public `GET /payments/status` supporting `session_id` lookups (allows unauthenticated Stripe redirection)
- `POST /payments/stripe/confirm` — authenticated confirmation endpoint
- Receipt generation and enrollment activation on confirmed payment
- Tests added: commerce flow regression covering unauthenticated status check and webhook duplicates

### Frontend (demo)

- Frontend handlers for Stripe checkout + return flow
- Reads `VITE_STRIPE_SUCCESS_URL` / `VITE_STRIPE_CANCEL_URL` from `.env`
- Calls `stripe/confirm` then checks payment status and completes enrollment flow

---

## 2026-05-08 — Payments setup

### Backend

- Internal payment model, receipts, and paid-course gating
- API endpoints for initiating purchases and recording internal payment state

### Frontend (demo)

- Demo wiring for enroll action and purchase flow (backend-driven)

---

## 2026-05-07 — Payments flow implementation

### Backend

- Internal purchase flow finalized: receipts, paid access activation, enrollment wiring
- Email notification hooks for enrollment and certificate issuance

---

## 2026-05-06 — Auth + Email + Misc

### Backend

- Sanctum auth API (registration, login, logout, current-user)
- Email verification and password reset
- Email notification system wired for enrollment, quiz results, certificate issuance

### Frontend (demo)

- Demo integration shell: course list/detail, seeded login for testing roles

---

## 2026-05-05 — Quizzes, analytics, certificates, instructor dashboard

### Backend

- Quiz question types (single & multiple choice) and backend scoring
- Instructor analytics and live quiz aggregates
- Course completion certificates and issuance flow

### Frontend (demo)

- Catalog filters and quiz submission wired to backend

---

## 2026-04-29 — Publish-request workflow

### Backend

- Instructors can request course publish; admins approve/decline
- Related API endpoints and feature tests

---

## 2026-04-23 — Admin tooling, moderation, demo seed data

### Backend

- Admin endpoints: user listing, role changes, ban management
- Content moderation queue and review approval
- Demo seed data for users, courses, enrollments, payments, quizzes, moderation items

### Frontend (demo)

- Demo panels for admin actions; quick seeded login routes for testing roles

---

## 2026-04-22 — Minimal frontend scaffold

### Frontend

- Minimal integration shell: course list, course detail, token input
- Enroll action wired to backend

---

## Notes

- This project is still in active development; roadmap items are tracked in the main [README.md](./README.md).
- Changelog focuses on implementation milestones; detailed commit history is available via Git (`git log`).
