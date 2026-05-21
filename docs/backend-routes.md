---
outline: deep
---

# Backend Routes & Architecture

Complete guide to the Tech Tutor backend API routes, middleware, and access control patterns.

## Base URL

- **Local Development**: `http://127.0.0.1:8000/api`
- **All responses**: JSON with proper HTTP status codes

## Route Organization

The API is organized into logical groups with different authentication and authorization requirements:

### 1. Public Routes (No Authentication Required)

#### Course Catalog

```
GET    /courses                                  # List published courses (searchable, filterable)
GET    /courses/{course}                         # Get course details
GET    /courses/catalog-options                  # Get filter options (categories, levels, etc.)
GET    /courses/{course}/reviews                 # Get published reviews for a course
```

**Query Parameters for Catalog**:
```
q              - Free-text search (uses Meilisearch if enabled)
category       - Filter by category
level          - Filter by difficulty level
language       - Filter by language
instructor_id  - Filter by instructor
price_type     - 'free' or 'paid'
min_price      - Minimum course price
max_price      - Maximum course price
sort           - 'newest', 'oldest', 'title', 'price_asc', 'price_desc', or 'rating'
per_page       - Results per page (1-50, default 12)
```

Example:
```bash
GET /courses?q=laravel&level=intermediate&price_type=paid&sort=price_asc&per_page=20
```

#### Authentication

```
POST   /auth/register                            # Register new student/instructor account
POST   /auth/register/request-verification-code # Request 6-digit verification code
POST   /auth/register/verify-code                # Verify code and complete registration
POST   /auth/login                               # Login and get Sanctum token
POST   /auth/forgot-password                     # Request password reset email
POST   /auth/reset-password                      # Reset password with token
GET    /auth/email/verify/{id}/{hash}            # Verify email (from link)
GET    /auth/password/reset/{token}              # Get password reset token info
GET    /auth/google/redirect                     # OAuth: Redirect to Google
GET    /auth/google/callback                     # OAuth: Google callback (internal)
```

#### Webhooks

```
POST   /stripe/webhook                           # Stripe webhook endpoint (public, signature-verified)
GET    /payments/status                          # Check Stripe payment status (no auth if session_id provided)
```

#### Other

```
POST   /contact                                  # Submit contact form
GET    /auth/invite/{token}                      # View user invite
POST   /auth/invite/{token}/accept               # Accept invite and create account
```

**Rate Limiting**:
- Auth endpoints: 60 requests per minute
- Contact form: Custom throttle rate

---

### 2. Authenticated Routes (Bearer Token Required)

All routes below require `Authorization: Bearer {token}` header.

Middleware stack: `auth:sanctum, EnsureUserIsNotBanned`

#### Current User

```
GET    /auth/me                                  # Get current user profile
PATCH  /auth/me                                  # Update current user profile
POST   /auth/logout                              # Logout and revoke current token
POST   /auth/email/resend                        # Resend verification email
```

#### Certificates

```
GET    /certificates                             # Get user's certificates
GET    /certificates/{certificate}               # Get certificate details
POST   /courses/{course}/certificate             # Manually request certificate (if eligible)
```

#### Learning Dashboard

```
GET    /learning/courses                         # Get user's enrolled courses
GET    /learning/courses/{course}                # Get course with progress
```

#### Progress & Quizzes

```
POST   /lessons/{lesson}/progress                # Create/update lesson progress
PUT    /lessons/{lesson}/progress                # Update lesson progress

GET    /quizzes/{quiz}/attempts                  # Get user's quiz attempts
POST   /quizzes/{quiz}/attempts                  # Submit quiz attempt
```

#### Reviews & Comments

```
GET    /lessons/{lesson}/comments                # Get lesson comments
POST   /lessons/{lesson}/comments                # Post comment on lesson
PUT    /lessons/{lesson}/comments/{comment}      # Update own comment
PATCH  /lessons/{lesson}/comments/{comment}      # Patch comment (admin: publish flag)
DELETE /lessons/{lesson}/comments/{comment}      # Delete own comment

POST   /courses/{course}/reviews                 # Post review on course
PUT    /courses/{course}/reviews/{review}        # Update own review
PATCH  /courses/{course}/reviews/{review}        # Patch review (admin: publish flag)
DELETE /courses/{course}/reviews/{review}        # Delete own review
```

#### Payments

```
GET    /payments                                 # List user's payments
GET    /payments/{payment}                       # Get payment details
POST   /courses/{course}/payments                # Create internal payment (manual purchase)
POST   /courses/{course}/payments/stripe-checkout # Create Stripe checkout session
POST   /payments/stripe/confirm                  # Confirm pending Stripe payment
```

**Payment Status**: After Stripe redirect, call `POST /payments/stripe/confirm` to finalize payment.

#### Enrollments

```
GET    /courses/{course}/enrollments             # Get course roster (instructor/admin only)
POST   /courses/{course}/enrollments             # Enroll in course
DELETE /courses/{course}/enrollments/{enrollment} # Drop course
```

---

### 3. Admin Routes

All admin routes require `role = 'admin'`.

#### User Management

```
GET    /admin/users                              # List all users (paginated)
PATCH  /admin/users/{user}                       # Update user (role, ban, email, name)
POST   /admin/users/invites                      # Create invite for new user
```

**Admin Update Fields**:
```json
{
  "role": "admin|instructor|student",
  "is_banned": true/false,
  "name": "...",
  "email": "..."
}
```

#### Moderation Queue

```
GET    /admin/moderation-queue                   # Get pending reviews, comments, publish requests
PATCH  /admin/moderation-queue/reviews/{review}  # Approve/decline review (is_published flag)
PATCH  /admin/moderation-queue/comments/{comment} # Approve/decline comment
PATCH  /admin/moderation-queue/publish-requests/{publishRequest} # Approve/decline course publish request
```

**Moderation Payload**:
```json
{
  "is_published": true/false,
  "declined_reason": "Optional reason if declining"
}
```

#### Platform Dashboard

```
GET    /admin/platform-dashboard                 # Get platform-wide analytics
```

**Response Includes**:
- User totals (students, instructors, admins, banned)
- Course totals (published, draft)
- Enrollment totals
- Certificate totals
- Quiz attempt totals
- Moderation queue counts
- Payment totals and status breakdown
- Paid revenue by course
- Recent activity feed

---

### 4. Instructor Routes

#### Dashboard

```
GET    /instructor/dashboard                     # Get instructor analytics
GET    /instructor/pending-comments              # Get pending comments on own courses
```

**Dashboard Response Includes**:
- Course counts (total, published, draft)
- Enrollment metrics
- Certificate counts
- Revenue totals
- Average student progress
- Average quiz score
- Per-course breakdown with enrollment/certificate/revenue data

#### Course Management

```
POST   /courses                                  # Create new course (draft)
PUT    /courses/{course}                         # Replace course (full update)
PATCH  /courses/{course}                         # Partial course update
DELETE /courses/{course}                         # Delete course

POST   /courses/{course}/publish-request         # Request admin approval for publishing
```

**Create/Update Course Fields**:
```json
{
  "title": "Course Title",
  "slug": "course-title",              // unique, alpha-dash
  "description": "Full description",
  "subtitle": "Short tagline",
  "category": "backend|frontend|...",
  "level": "beginner|intermediate|advanced",
  "language": "en|uk|...",
  "thumbnail_path": "https://...",
  "duration_minutes": 120,
  "price": 49.99,
  "is_published": false,
  "request_publish": true              // Include to request approval
}
```

#### Module Management

```
GET    /courses/{course}/modules                 # List course modules
POST   /courses/{course}/modules                 # Create module
GET    /courses/{course}/modules/{module}        # Get module details
PUT    /courses/{course}/modules/{module}        # Update module
PATCH  /courses/{course}/modules/{module}        # Partial module update
DELETE /courses/{course}/modules/{module}        # Delete module

PATCH  /courses/{course}/modules/reorder         # Reorder modules
```

#### Lesson Management

```
GET    /modules/{module}/lessons                 # List module lessons
POST   /modules/{module}/lessons                 # Create lesson
GET    /modules/{module}/lessons/{lesson}        # Get lesson details
PUT    /modules/{module}/lessons/{lesson}        # Update lesson
PATCH  /modules/{module}/lessons/{lesson}        # Partial lesson update
DELETE /modules/{module}/lessons/{lesson}        # Delete lesson
GET    /lessons/{lesson}/attachment              # Download lesson file

PATCH  /modules/{module}/lessons/reorder         # Reorder lessons
PATCH  /modules/{module}/content/reorder         # Reorder all content (lessons + quizzes)
```

**Lesson Fields**:
```json
{
  "title": "Lesson Title",
  "slug": "lesson-title",
  "type": "text|video|file",
  "content": "HTML content or text",
  "video_url": "https://youtube.com/...",
  "file_path": "/storage/lessons/...",
  "position": 1,
  "is_preview": false,
  "is_published": false
}
```

#### Quiz Management

```
GET    /courses/{course}/quizzes                 # List course quizzes
POST   /courses/{course}/quizzes                 # Create quiz with questions
GET    /courses/{course}/quizzes/{quiz}          # Get quiz details
PUT    /courses/{course}/quizzes/{quiz}          # Update quiz
PATCH  /courses/{course}/quizzes/{quiz}          # Partial quiz update
DELETE /courses/{course}/quizzes/{quiz}          # Delete quiz
GET    /quizzes/{quiz}/analytics                 # Get quiz attempt analytics

PATCH  /courses/{course}/quizzes/reorder         # Reorder quizzes
```

**Quiz Fields**:
```json
{
  "title": "Quiz Title",
  "description": "Quiz description",
  "module_id": 5,                     // Optional, can be null
  "pass_score": 70,                   // Default 70
  "is_published": false,
  "position": 1,
  "questions": [
    {
      "type": "multiple_choice|true_false",
      "prompt": "Which is correct?",
      "points": 2,
      "options": [
        {
          "key": "option1",
          "text": "Option text",
          "is_correct": true
        }
      ]
    }
  ]
}
```

**Quiz Analytics Response**:
```json
{
  "attempts_count": 42,
  "unique_students_count": 28,
  "average_score": 75.5,
  "highest_score": 100,
  "lowest_score": 20,
  "passed_count": 30,
  "failed_count": 12,
  "pass_rate": 71.4,
  "question_breakdown": [
    {
      "question_id": 1,
      "prompt": "...",
      "attempts": 42,
      "correct_count": 35,
      "correct_rate": 83.3
    }
  ],
  "recent_attempts": [...]
}
```

---

## Middleware & Authorization

### Authentication Middleware

- **`auth:sanctum`** - Requires valid Sanctum bearer token
- **`sanctum.optional`** - Token validated if present, otherwise guest access
- **`EnsureUserIsNotBanned`** - Blocks banned users

### Route Groups

#### Public Group
```php
Route::middleware('sanctum.optional')->group(function () {
    // Courses catalog, reviews (public read)
});
```

#### Protected Group
```php
Route::middleware(['auth:sanctum', EnsureUserIsNotBanned::class])->group(function () {
    // User, instructor, admin routes
});
```

### Authorization Checks (in Controllers)

**Role Checks**:
```php
$user->isAdmin()        // role = 'admin'
$user->isInstructor()   // role = 'instructor'
$user->isStudent()      // role = 'student'
```

**Resource Ownership**:
- Users can only update/delete their own resources
- Instructors can only manage their own courses
- Admins can manage any resource

**Content Visibility**:
- Published content visible to all
- Draft content only visible to instructor/admin
- User can view completed progress/certificates

---

## HTTP Status Codes

| Code | Meaning | Usage |
|------|---------|-------|
| 200 | OK | Successful GET/PUT/PATCH |
| 201 | Created | Successful POST |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Invalid input/validation error |
| 401 | Unauthorized | Missing/invalid token |
| 403 | Forbidden | Insufficient permissions or banned |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate slug, already enrolled, etc. |
| 422 | Unprocessable Entity | Validation error (detailed messages) |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Server Error | Internal error |

---

## Error Responses

Standard error format:

```json
{
  "message": "User not found",
  "errors": {
    "email": ["The email field is required"]
  }
}
```

Validation errors (`422 Unprocessable Entity`):

```json
{
  "message": "The given data was invalid.",
  "errors": {
    "title": ["The title must be between 3 and 255 characters"],
    "slug": ["The slug has already been taken"]
  }
}
```

---

## Nested Resources

Routes use RESTful nesting for related resources:

```
courses/{course}/modules           # All modules in a course
courses/{course}/modules/{module}   # Specific module
modules/{module}/lessons           # All lessons in a module
modules/{module}/lessons/{lesson}   # Specific lesson
lessons/{lesson}/comments          # All comments on a lesson
lessons/{lesson}/progress          # Progress on a lesson

courses/{course}/quizzes           # All quizzes in a course
quizzes/{quiz}/attempts            # All attempts on a quiz
quizzes/{quiz}/analytics           # Analytics for a quiz

courses/{course}/reviews           # All reviews for a course
courses/{course}/enrollments       # All enrollments in a course
courses/{course}/payments          # All payments for a course
courses/{course}/certificate       # Certificate request endpoint
```

---

## Content Reordering

Lessons, modules, quizzes, and mixed content can be reordered via PATCH endpoints:

```
PATCH /courses/{course}/modules/reorder
PATCH /courses/{course}/quizzes/reorder
PATCH /modules/{module}/lessons/reorder
PATCH /modules/{module}/content/reorder    # Lessons + quizzes together
```

**Payload**:
```json
{
  "items": [
    { "id": 5, "position": 1 },
    { "id": 3, "position": 2 },
    { "id": 7, "position": 3 }
  ]
}
```

---

## Pagination

Paginated endpoints default to 12-20 items per page. Customize with `per_page` parameter:

```
per_page       - Number of items (defaults vary, max 50-100)
page           - Page number (default 1)
```

**Response Structure**:
```json
{
  "data": [...],
  "links": {
    "first": "...",
    "last": "...",
    "prev": "...",
    "next": "..."
  },
  "meta": {
    "current_page": 1,
    "last_page": 5,
    "per_page": 12,
    "total": 58
  }
}
```

---

## Request/Response Examples

See `backend-api.md` for detailed cURL examples and workflows for all major features.
