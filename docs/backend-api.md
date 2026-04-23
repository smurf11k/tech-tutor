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

## Protected Routes (Sanctum)

Banned users are blocked from protected routes.

### Admin

- `GET /admin/users`
- `PATCH /admin/users/{user}`
- `GET /admin/moderation-queue`
- `PATCH /admin/moderation-queue/reviews/{review}`
- `PATCH /admin/moderation-queue/comments/{comment}`

### Courses

- `POST /courses`
- `PUT /courses/{course}`
- `PATCH /courses/{course}`
- `DELETE /courses/{course}`

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

### Quizzes

- `GET /courses/{course}/quizzes`
- `POST /courses/{course}/quizzes`
- `GET /courses/{course}/quizzes/{quiz}`
- `PUT /courses/{course}/quizzes/{quiz}`
- `PATCH /courses/{course}/quizzes/{quiz}`
- `DELETE /courses/{course}/quizzes/{quiz}`

### Quiz Attempts

- `GET /quizzes/{quiz}/attempts`
- `POST /quizzes/{quiz}/attempts`

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

## Notes

- Access control is role-aware for student/instructor/admin.
- Admin endpoints handle role changes, bans, and queued review moderation.
- Admin moderation queue handles both review and lesson comment approval.
- Local dev token creation expects seeded `email` and `password` credentials.
- Progress and quiz attempt actions include enrollment/instructor checks.
- Newly submitted course reviews enter the moderation queue unpublished until an admin approves them.
- Newly submitted lesson comments also enter the moderation queue unpublished until an admin approves them.
- Request validation is handled with FormRequest classes.
