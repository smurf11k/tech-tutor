# Changelog

All notable changes to this project are documented in this file.

## [Unreleased]

### Added

- Added Dockerfiles
- Added scribe docs
- Added demo videos and files to docs
- Added export data button logic
- Added new email notification preferances
- Implemented real pdf generation for certificates
- Custom video player
- New frontend UI design and layout refinements
- Instructor content editor with:
  - drag & drop video uploads
  - automatic video naming
  - markdown video embedding
  - video replace/remove support
- Lesson viewer support for:
  - inline HTML5 video playback
  - markdown-embedded videos
- Profile settings avatar upload, preview, and removal
- Billing tab with payment history loading
- Instructor and admin dashboards with dynamic stats and charts
- Instructor course and lesson management pages
- Lesson video listing support
- User `bio` and `nickname` fields
- Lesson tags
- Internal payments endpoint
- Stripe integration:
  - checkout session creation
  - webhook handling
  - payment confirmation flow
- Payment status lookup endpoint
- Course slug support with slug-or-id routing
- Home page with highlights and catalog browsing
- Course catalog with:
  - search
  - category filters
  - level filters
  - price filters
  - sorting
- Course detail page with reviews, enrollment, and payments
- Learning page with:
  - curriculum tree
  - lesson viewer
  - quizzes
  - comments
- Student dashboard with progress tracking
- Student certificate management page
- User profile page with password management
- Invite acceptance flow for admin-invited users
- Contact form
- Responsive UI using Tailwind CSS and shadcn/ui
- Admin invitation flow with selectable user roles
- Email invitation support
- Ukrainian localized documentation files
- `README-uk.md`
- Laravel Scout + MeiliSearch integration
- Scout-searchable `Course` model
- Queue-backed search indexing support
- Email verification registration flow using 6-digit codes
- `EmailVerificationCode` model and notification system
- Verification code validation requests
- Sign-up modal with 2-step verification flow
- CAPTCHA support for sign-up flow
- Lesson file upload support with public file URLs
- Google OAuth authentication via Socialite
- Google sign-in popup frontend flow
- Stripe Checkout integration
- Receipt generation after payment confirmation
- Internal payment model and receipt system
- Enrollment and certificate email notifications
- Sanctum authentication API
- Email verification and password reset flows
- Quiz question types:
  - single choice
  - multiple choice
- Instructor analytics and quiz aggregates
- Course completion certificates
- Publish-request workflow for instructors
- Admin moderation queue
- Demo seed data for:
  - users
  - courses
  - enrollments
  - payments
  - quizzes
  - moderation items
- Minimal frontend integration scaffold

### Changed

- Updated image upload logic
- Updated content editing workflow
- Updated video upload and render logic
- Improved responsive frontend behavior
- Improved navigation handling for already-passed quiz pages
- Improved lesson update logic
- Improved publish-request workflow
- Improved course routing resiliency
- Updated seeded/demo accounts and local development test data
- `GET /courses` now supports MeiliSearch free-text querying
- Synced MeiliSearch filterable and sortable index settings
- Frontend payment and enrollment flow integration
- Shared input normalization and sanitization across forms

### Fixed

- Fixed routing issues
- Fixed automatic certificate issuance
- Frontend CAPTCHA visibility now follows backend `CAPTCHA_ENABLED` through `/api/app-config`
- Fixed hardcoded frontend design issues
- Fixed `php artisan optimize` view-cache failure by restoring the expected `resources/views` directory`
- Fixed lesson file replacement and cleanup handling
- Fixed validation for file-based lessons
- Fixed webhook duplicate fulfillment handling
- Fixed frontend OAuth auth-state hydration flow

### Security

- Added rate limiting for authentication endpoints
- Added CAPTCHA verification for registration and login
- Added webhook signature verification for Stripe
- Added banned-user checks during Google OAuth authentication
- Strengthened password policy
- Added nickname uniqueness validation

### API

- Added `PATCH /auth/me`
- Added `DELETE /auth/me`
- Added `POST /stripe/webhook`
- Added `POST /payments/stripe/confirm`
- Added `GET /payments/status`
- Added `POST /auth/register/request-verification-code`
- Added `POST /auth/register/verify-code`
- Added API reorder endpoints
- Added publish-request workflow refinements

### Tests

- Added regression tests for:
  - lesson uploads
  - file replacement
  - required-file validation
- Added commerce flow regression tests
- Added Google OAuth feature tests
- Added API curl/Postman testing snippets
