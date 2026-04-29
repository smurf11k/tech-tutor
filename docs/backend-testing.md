---
outline: deep
---

# API Testing

This page contains copy-paste testing examples for the current backend.

## Get Sanctum Token Quickly (Local Dev)

Use this endpoint to mint a token for an existing user in local debug environment.

Endpoint:

- `POST /api/dev/token`

Example:

```bash
curl -X POST "http://127.0.0.1:8000/api/dev/token" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@example.com",
    "token_name": "frontend-dev-student",
    "abilities": ["*"]
  }'
```

If you set `DEV_TOKEN_KEY` in backend env, include:

```bash
-H "X-Dev-Key: your-dev-key"
```

Response contains a `token` value. Use it as bearer token in requests below.

## Base Variables

Use these in your shell before running commands.

```bash
BASE_URL="http://127.0.0.1:8000/api"
TOKEN="YOUR_SANCTUM_TOKEN"
```

For PowerShell:

```powershell
$BASE_URL = "http://127.0.0.1:8000/api"
$TOKEN = "YOUR_SANCTUM_TOKEN"
```

## Public Endpoints

List courses:

```bash
curl -X GET "$BASE_URL/courses"
```

Get one course:

```bash
curl -X GET "$BASE_URL/courses/1"
```

## Authenticated Endpoints (Sanctum)

Create course:

```bash
curl -X POST "$BASE_URL/courses" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Laravel API Basics",
    "slug": "laravel-api-basics",
    "description": "Intro backend course",
    "price": 49.99,
    "is_published": true
  }'
```

Create module:

```bash
curl -X POST "$BASE_URL/courses/1/modules" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Module 1",
    "slug": "module-1",
    "position": 1
  }'
```

Create lesson:

```bash
curl -X POST "$BASE_URL/modules/1/lessons" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Lesson 1",
    "slug": "lesson-1",
    "type": "text",
    "content": "Hello TechTutor",
    "position": 1,
    "is_preview": false
  }'
```

Enroll in course:

```bash
curl -X POST "$BASE_URL/courses/1/enrollments" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/json"
```

Update lesson progress:

```bash
curl -X POST "$BASE_URL/lessons/1/progress" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{
    "progress_percent": 100
  }'
```

Create quiz:

```bash
curl -X POST "$BASE_URL/courses/1/quizzes" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Final Quiz",
    "description": "Module checkpoint",
    "pass_score": 60,
    "is_published": true
  }'
```

Submit quiz attempt:

```bash
curl -X POST "$BASE_URL/quizzes/1/attempts" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{
    "answers": {
      "q1": "a"
    },
    "score": 80
  }'
```

Create review:

```bash
curl -X POST "$BASE_URL/courses/1/reviews" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{
    "rating": 5,
    "comment": "Great course"
  }'
```

Create payment:

```bash
curl -X POST "$BASE_URL/courses/1/payments" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "stripe",
    "amount": 49.99,
    "currency": "USD",
    "transaction_id": "txn_1001"
  }'
```

## Publish-request workflow (testing)

Use this to test the instructor→admin publish request flow.

Prereqs:

- Run migrations/seeds so users exist and DB is ready (`php artisan migrate --seed`).
- The dev token helper is available only in local debug: `app()->isLocal()` and `config('app.debug')` must be true.
- If `DEV_TOKEN_KEY` is set, include header `X-Dev-Key: <key>` when requesting a dev token.

1. Mint a dev token for the instructor (use seeded instructor email/password):

```bash
curl -s -X POST "$BASE_URL/dev/token" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -H "X-Dev-Key: $DEV_TOKEN_KEY" \
  -d '{"email":"instructor@example.com","password":"secret","token_name":"dev-instructor"}'
```

2. Instructor creates a draft and requests publishing:

```bash
curl -X POST "$BASE_URL/courses" \
  -H "Authorization: Bearer $INSTRUCTOR_TOKEN" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{"title":"Draft Course","price":10.0,"request_publish":true}'
```

3. Admin mints a token and accepts the publish request by publishing the course:

```bash
curl -s -X POST "$BASE_URL/dev/token" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"secret","token_name":"dev-admin"}'

curl -X PATCH "$BASE_URL/courses/{courseId}" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{"is_published":true}'
```

4. Admin declines a pending publish request (optional reason):

```bash
curl -X PATCH "$BASE_URL/courses/{courseId}" \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{"decline_publish":true,"publish_request_declined_reason":"Needs more content"}'
```

Notes:

- The dev token endpoint returns `user` and `role` in the response so you can mint tokens for different roles.
- The publish-request records are stored in the `publish_requests` table and can be inspected directly in the DB for test assertions.

## Postman Testing

## Environment Variables

Create a Postman environment with:

- `baseUrl` = `http://127.0.0.1:8000/api`
- `token` = your Sanctum token
- `courseId` = `1`
- `moduleId` = `1`
- `lessonId` = `1`
- `quizId` = `1`

## Authorization Setup

At collection level:

- Type: Bearer Token
- Token: <code v-pre>{{token}}</code>

For public endpoints, set Auth to `No Auth` per request.

## Suggested Request Order

1. <code v-pre>GET {{baseUrl}}/courses</code>
2. <code v-pre>POST {{baseUrl}}/courses</code>
3. <code v-pre>POST {{baseUrl}}/courses/{{courseId}}/modules</code>
4. <code v-pre>POST {{baseUrl}}/modules/{{moduleId}}/lessons</code>
5. <code v-pre>POST {{baseUrl}}/courses/{{courseId}}/enrollments</code>
6. <code v-pre>POST {{baseUrl}}/lessons/{{lessonId}}/progress</code>
7. <code v-pre>POST {{baseUrl}}/courses/{{courseId}}/quizzes</code>
8. <code v-pre>POST {{baseUrl}}/quizzes/{{quizId}}/attempts</code>
9. <code v-pre>POST {{baseUrl}}/courses/{{courseId}}/reviews</code>
10. <code v-pre>POST {{baseUrl}}/courses/{{courseId}}/payments</code>

## Quick Troubleshooting

- `401 Unauthorized`: missing or invalid bearer token.
- `403 Forbidden`: role/enrollment restrictions blocked access.
- `422 Unprocessable Entity`: request body failed validation.
- `404 Not Found`: nested IDs do not belong to each other.
