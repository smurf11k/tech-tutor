---
outline: deep
---

# Тестування API

Ця сторінка містить практичні приклади тестування поточного бекенду (copy-paste).

## Швидке отримання Sanctum Token (локальна розробка)

Використайте endpoint для випуску токена для наявного користувача у локальному debug-оточенні.

Endpoint:

- `POST /api/dev/token`

Приклад:

```bash
curl -X POST "http://127.0.0.1:8000/api/dev/token" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@techtutor.test",
    "token_name": "frontend-dev-student",
    "abilities": ["*"]
  }'
```

Якщо у backend `.env` задано `DEV_TOKEN_KEY`, додайте:

```bash
-H "X-Dev-Key: your-dev-key"
```

Відповідь містить поле `token`. Далі використовуйте його як bearer token.

## Перевірки безпеки auth

Якщо CAPTCHA увімкнена в `.env`, auth endpoint-и вимагають `captcha_token`.

До auth-маршрутів застосовано rate limit на сервері, тому повторні логін/реєстрація можуть повертати throttle error.

## Базові змінні

```bash
BASE_URL="http://127.0.0.1:8000/api"
TOKEN="YOUR_SANCTUM_TOKEN"
```

PowerShell:

```powershell
$BASE_URL = "http://127.0.0.1:8000/api"
$TOKEN = "YOUR_SANCTUM_TOKEN"
```

## Публічні endpoint-и

Список курсів:

```bash
curl -X GET "$BASE_URL/courses"
```

Пошук/фільтрація каталогу:

```bash
curl -X GET "$BASE_URL/courses?q=laravel&category=backend&price_type=paid&sort=price_desc"
```

Отримати один курс:

```bash
curl -X GET "$BASE_URL/courses/1"
```

Реєстрація:

```bash
curl -X POST "$BASE_URL/auth/register" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Student",
    "email": "new.student@example.com",
    "password": "password123",
    "password_confirmation": "password123",
    "role": "student",
    "token_name": "manual-test",
    "captcha_token": "demo-captcha-token"
  }'
```

Логін:

```bash
curl -X POST "$BASE_URL/auth/login" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{"email":"student@techtutor.test","password":"password","token_name":"manual-test","captcha_token":"demo-captcha-token"}'
```

Forgot/reset password:

```bash
curl -X POST "$BASE_URL/auth/forgot-password" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{"email":"student@techtutor.test"}'
```

```bash
curl -X POST "$BASE_URL/auth/reset-password" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{"email":"student@techtutor.test","token":"RESET_TOKEN","password":"new-password123","password_confirmation":"new-password123"}'
```

## Автентифіковані endpoint-и (Sanctum)

Поточний користувач:

```bash
curl -X GET "$BASE_URL/auth/me" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/json"
```

Повторне надсилання email verification:

```bash
curl -X POST "$BASE_URL/auth/email/resend" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/json"
```

Logout:

```bash
curl -X POST "$BASE_URL/auth/logout" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/json"
```

Дашборд викладача:

```bash
curl -X GET "$BASE_URL/instructor/dashboard" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/json"
```

Моніторинг платформи адміна:

```bash
curl -X GET "$BASE_URL/admin/platform-dashboard" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/json"
```

Створення курсу:

```bash
curl -X POST "$BASE_URL/courses" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Laravel API Basics",
    "slug": "laravel-api-basics",
    "description": "Intro backend course",
    "subtitle": "Build REST APIs with Laravel",
    "category": "backend",
    "level": "beginner",
    "language": "en",
    "thumbnail_path": "/courses/laravel-api-basics.png",
    "duration_minutes": 180,
    "price": 49.99,
    "is_published": true
  }'
```

Створення модуля:

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

Створення уроку:

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

Запис на курс:

```bash
curl -X POST "$BASE_URL/courses/1/enrollments" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/json"
```

Для paid-курсів без попередньої оплати endpoint повертає `402`.

Покупка paid-курсу з отриманням квитанції:

```bash
curl -X POST "$BASE_URL/courses/1/payments" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "manual_demo",
    "amount": 49.99,
    "currency": "USD",
    "transaction_id": "txn_manual_demo_1001",
    "provider_payload": {
      "source": "manual_test"
    }
  }'
```

Створення Stripe Checkout session:

```bash
curl -X POST "$BASE_URL/courses/1/payments/stripe-checkout" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{
    "success_url": "http://127.0.0.1:5173/payment/success",
    "cancel_url": "http://127.0.0.1:5173/payment/cancel"
  }'
```

Локальний запуск Stripe webhook forwarding:

```bash
stripe login
stripe listen --forward-to http://127.0.0.1:8000/api/stripe/webhook --events checkout.session.completed
```

Скопіюйте `whsec_...` у backend `.env`:

```env
STRIPE_WEBHOOK_SECRET=whsec_...
```

Після цього, за потреби, очистьте config cache:

```bash
php artisan config:clear
```

Оновлення прогресу уроку:

```bash
curl -X POST "$BASE_URL/lessons/1/progress" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{
    "progress_percent": 100
  }'
```

Список сертифікатів:

```bash
curl -X GET "$BASE_URL/certificates" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/json"
```

Ручна перевірка права на сертифікат:

```bash
curl -X POST "$BASE_URL/courses/1/certificate" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/json"
```

Створення квізу:

```bash
curl -X POST "$BASE_URL/courses/1/quizzes" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Final Quiz",
    "description": "Module checkpoint",
    "pass_score": 60,
    "is_published": true,
    "questions": [
      {
        "type": "single_choice",
        "prompt": "Which package protects API routes?",
        "options": [
          { "key": "sanctum", "text": "Laravel Sanctum", "is_correct": true },
          { "key": "vite", "text": "Vite" }
        ]
      },
      {
        "type": "multiple_choice",
        "prompt": "Which items are backend responsibilities?",
        "points": 2,
        "options": [
          { "key": "policies", "text": "Policies", "is_correct": true },
          { "key": "middleware", "text": "Middleware", "is_correct": true },
          { "key": "tailwind", "text": "Tailwind classes" }
        ]
      }
    ]
  }'
```

Надсилання спроби квізу:

```bash
curl -X POST "$BASE_URL/quizzes/1/attempts" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{
    "answers": {
      "1": "sanctum",
      "2": ["middleware", "policies"]
    }
  }'
```

Аналітика квізу:

```bash
curl -X GET "$BASE_URL/quizzes/1/analytics" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/json"
```

Створення відгуку:

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

## Publish request workflow (тестування)

1. Згенеруйте dev token для викладача.
2. Викладач створює чернетку з `request_publish: true`.
3. Адмін схвалює запит через `PATCH /courses/{courseId}` з `is_published: true`.
4. Або адмін відхиляє через `decline_publish: true` і optional reason.

Цей процес зберігає записи у `publish_requests` і надсилає email-сповіщення викладачу.

## Google OAuth тестування

### Передумови

```bash
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI=http://127.0.0.1:8000/auth/google/callback
```

Налаштуйте OAuth credentials у Google Cloud Console і додайте redirect URI:

- `http://127.0.0.1:8000/auth/google/callback`

### Ручне тестування у браузері

1. Відкрийте:
   - `http://127.0.0.1:8000/auth/google/redirect?return_to=http://localhost:5173`
2. Увійдіть через Google.
3. Бекенд обробить callback і поверне popup HTML з `window.postMessage()` payload.
4. Popup закриється автоматично за наявності opener-вікна.

### Автотести з моками

OAuth flow покритий у:

- `tests/Feature/AuthFlowTest.php`

Запуск:

```bash
php artisan test tests/Feature/AuthFlowTest.php --filter=google
```

## Postman тестування

### Змінні оточення

- `baseUrl` = `http://127.0.0.1:8000/api`
- `token` = ваш Sanctum token
- `courseId` = `1`
- `moduleId` = `1`
- `lessonId` = `1`
- `quizId` = `1`

### Авторизація

На рівні колекції:

- Type: Bearer Token
- Token: <code v-pre>{{token}}</code>

### Рекомендований порядок запитів

1. <code v-pre>GET {{baseUrl}}/courses</code>
2. <code v-pre>POST {{baseUrl}}/auth/login</code>
3. <code v-pre>GET {{baseUrl}}/auth/me</code>
4. <code v-pre>POST {{baseUrl}}/courses</code>
5. <code v-pre>POST {{baseUrl}}/courses/{{courseId}}/modules</code>
6. <code v-pre>POST {{baseUrl}}/modules/{{moduleId}}/lessons</code>
7. <code v-pre>POST {{baseUrl}}/courses/{{courseId}}/enrollments</code>
8. <code v-pre>POST {{baseUrl}}/lessons/{{lessonId}}/progress</code>
9. <code v-pre>POST {{baseUrl}}/courses/{{courseId}}/quizzes</code>
10. <code v-pre>POST {{baseUrl}}/quizzes/{{quizId}}/attempts</code>
11. <code v-pre>POST {{baseUrl}}/courses/{{courseId}}/reviews</code>
12. <code v-pre>POST {{baseUrl}}/courses/{{courseId}}/payments</code>

## Швидке усунення проблем

- `401 Unauthorized`: відсутній або невалідний bearer token.
- `403 Forbidden`: рольові або enrollment-обмеження.
- `422 Unprocessable Entity`: помилка валідації тіла запиту.
- `404 Not Found`: вкладені ID не відповідають одне одному.
