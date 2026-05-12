# Changelog

All notable changes to this project are documented in this file. Entries are ordered from newest (top) to oldest (bottom).

## Unreleased

### Progress

- Backend readiness: 85/100
- Frontend readiness: 30/100 (demo)

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
