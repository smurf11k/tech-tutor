---
outline: deep
---

# Backend API (Current)

Base URL during local backend development:

- `http://127.0.0.1:8000/api`

## Public Routes

- `GET /courses`
- `GET /courses/{course}`

## Protected Routes (Sanctum)

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

### Payments

- `GET /payments`
- `POST /courses/{course}/payments`

## Notes

- Access control is role-aware for student/instructor/admin.
- Progress and quiz attempt actions include enrollment/instructor checks.
- Request validation is handled with FormRequest classes.
