---
outline: deep
---

# Backend API (Current)

Base URL during local backend development:

- `http://127.0.0.1:8000/api`

## Public Routes

- `GET /courses`
- `GET /courses/{course}`
- `POST /dev/token` (local debug helper for seeded demo accounts)

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

### Admin

- `GET /admin/users`
- `PATCH /admin/users/{user}`
- `GET /admin/moderation-queue`
- `PATCH /admin/moderation-queue/reviews/{review}`
- `PATCH /admin/moderation-queue/comments/{comment}`

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
- `POST /courses/{course}/payments`

### Publish-request workflow

Instructors may create courses as drafts and request publishing. The backend tracks these requests in a `publish_requests` table and exposes publish controls via the existing course endpoints.

- Instructor request (create/update course): include `request_publish: true` in the JSON payload to create a pending publish request.
- Admin accept: admin publishes the course using `PATCH /courses/{course}` with `{ "is_published": true }`. Any pending request for the course is marked `accepted`.
- Admin decline: admin may decline a pending request using `PATCH /courses/{course}` with `{ "decline_publish": true, "publish_request_declined_reason": "optional reason" }`. The request is marked `declined` and the decline reason is stored.

Data model & files:

- Migration: `database/migrations/2026_04_29_000000_create_publish_requests_table.php`
- Model: `app/Models/PublishRequest.php`
- Controller handling: `app/Http/Controllers/CourseController.php`

TODO: send notification/email to the requester when a request is declined.

## Notes

- Access control is role-aware for student/instructor/admin.
- Admin endpoints handle role changes, bans, and queued review moderation.
- Admin moderation queue handles both review and lesson comment approval.
- Local dev token creation expects seeded `email` and `password` credentials.
- Progress and quiz attempt actions include enrollment/instructor checks.
- Newly submitted course reviews enter the moderation queue unpublished until an admin approves them.
- Newly submitted lesson comments also enter the moderation queue unpublished until an admin approves them.
- Request validation is handled with FormRequest classes.
