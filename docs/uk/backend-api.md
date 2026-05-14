---
outline: deep
---

# Backend API (Поточний стан)

Базовий URL під час локальної розробки бекенду:

- `http://127.0.0.1:8000/api`

## Публічні маршрути

- `GET /courses`
- `GET /courses/{course}`
- `POST /auth/register`
- `POST /auth/register/request-verification-code`
- `POST /auth/register/verify-code`
- `POST /auth/login`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`
- `GET /auth/email/verify/{id}/{hash}`
- `POST /dev/token` (локальний debug helper для seed-акаунтів)

### Авторизація

`POST /auth/register` створює обліковий запис студента або викладача, відправляє email-верифікацію та повертає Sanctum bearer token.

```json
{
  "name": "New Student",
  "email": "student@example.com",
  "password": "password123",
  "password_confirmation": "password123",
  "role": "student",
  "token_name": "frontend"
}
```

Для self-registration дозволені ролі `student` і `instructor`; адміністратори керуються через seed або admin tooling.

Коли CAPTCHA увімкнена у backend `.env`, реєстрація та логін також вимагають `captcha_token`.

`POST /auth/login` приймає `email`, `password` та необов'язковий `token_name`, після чого повертає:

```json
{
  "token": "1|...",
  "token_type": "Bearer",
  "user": {
    "id": 1,
    "email": "student@example.com",
    "role": "student"
  }
}
```

Заблоковані користувачі не можуть виконати логін.

До auth endpoint-ів застосовується rate limit для захисту від brute-force.

Потік reset password:

- `POST /auth/forgot-password` з `{ "email": "student@example.com" }` надсилає email для скидання.
- `POST /auth/reset-password` з `email`, `token`, `password`, `password_confirmation` оновлює пароль і відкликає чинні Sanctum-токени.

Потік верифікації email:

- Під час реєстрації надсилається підписаний verification URL.
- `GET /auth/email/verify/{id}/{hash}` верифікує адресу, якщо підпис URL валідний.
- `POST /auth/email/resend` повторно надсилає verification email для автентифікованого користувача.

**Альтернативна верифікація email через 6-значний код:**

TechTutor також підтримує двокрокову реєстрацію через verification code:

1. `POST /auth/register/request-verification-code` — створює verification record, генерує 6-значний код і відправляє його на email.
   - Потрібні `name`, `email`, `password`, `password_confirmation`, optional `role`, і `captcha_token` (якщо CAPTCHA увімкнена)
   - Код діє 5 хвилин
   - У відповідь повертається email

2. `POST /auth/register/verify-code` — перевіряє 6-значний код і завершує реєстрацію.
   - Потрібні `email`, `code`, `name`, `password`, `password_confirmation`, optional `role`, `token_name`
   - Успішна відповідь повертає Sanctum bearer token і дані користувача

### cURL / Postman приклади для auth

Реєстрація з CAPTCHA token:

```bash
curl -X POST "http://127.0.0.1:8000/api/auth/register" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Student",
    "email": "student@example.com",
    "password": "password123",
    "password_confirmation": "password123",
    "role": "student",
    "token_name": "frontend",
    "captcha_token": "demo-captcha-token"
  }'
```

Логін з CAPTCHA token:

```bash
curl -X POST "http://127.0.0.1:8000/api/auth/login" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@example.com",
    "password": "password123",
    "token_name": "frontend",
    "captcha_token": "demo-captcha-token"
  }'
```

Forgot password:

```bash
curl -X POST "http://127.0.0.1:8000/api/auth/forgot-password" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@example.com"
  }'
```

Reset password:

```bash
curl -X POST "http://127.0.0.1:8000/api/auth/reset-password" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "RESET_TOKEN_HERE",
    "email": "student@example.com",
    "password": "new-password123",
    "password_confirmation": "new-password123"
  }'
```

#### Реєстрація через email verification code

Запит коду верифікації:

```bash
curl -X POST "http://127.0.0.1:8000/api/auth/register/request-verification-code" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Student",
    "email": "student@example.com",
    "password": "password123",
    "password_confirmation": "password123",
    "role": "student",
    "captcha_token": "demo-captcha-token"
  }'
```

Відповідь:

```json
{
  "message": "Verification code sent to your email.",
  "email": "student@example.com"
}
```

Перевірка коду і завершення реєстрації:

```bash
curl -X POST "http://127.0.0.1:8000/api/auth/register/verify-code" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "student@example.com",
    "code": "123456",
    "name": "New Student",
    "password": "password123",
    "password_confirmation": "password123",
    "role": "student",
    "token_name": "frontend"
  }'
```

### Параметри запиту каталогу курсів

`GET /courses` підтримує фільтри каталогу і full-text пошук через MeiliSearch, коли Scout налаштований на MeiliSearch:

- `q`: пошук за title, subtitle, description, category, slug
- `category`
- `level`
- `language`
- `instructor_id`
- `price_type`: `free` або `paid`
- `min_price`
- `max_price`
- `sort`: `newest`, `oldest`, `title`, `price_asc`, `price_desc`, `rating`
- `per_page`: 1-50

Приклад:

```bash
curl -X GET "$BASE_URL/courses?q=laravel&category=backend&price_type=paid&sort=price_desc"
```

Коли `SCOUT_DRIVER=meilisearch`, параметр `q` йде через MeiliSearch, а решта фільтрів застосовується до каталогу звично.

## Захищені маршрути (Sanctum)

Заблоковані користувачі не мають доступу до захищених маршрутів.

### Автентифікований користувач

- `GET /auth/me`
- `POST /auth/logout`
- `POST /auth/email/resend`

`POST /auth/logout` видаляє поточний Sanctum access token.

### Адміністратор

- `GET /admin/users`
- `PATCH /admin/users/{user}`
- `GET /admin/platform-dashboard`
- `GET /admin/moderation-queue`
- `PATCH /admin/moderation-queue/reviews/{review}`
- `PATCH /admin/moderation-queue/comments/{comment}`

`GET /admin/platform-dashboard` повертає метрики живого моніторингу платформи (тільки для адміна) без окремого збереження статистичних рядків.

Дані включають:

- totals по users/courses/enrollments/certificates/quiz attempts
- moderation queue counts
- payment totals і paid revenue
- payment status breakdown
- paid revenue по курсах
- recent activity feed

### Дашборд викладача

- `GET /instructor/dashboard`

Доступний викладачам і адміністраторам. Відповідь обчислюється в реальному часі на основі курсів, зарахувань, прогресу уроків, сертифікатів, спроб квізів і paid платежів.

Повертає:

- `courses_count`
- `published_courses_count`
- `draft_courses_count`
- `enrollments_count`
- `certificates_count`
- `revenue_total`
- `average_progress`
- `average_quiz_score`

### Курси

- `POST /courses`
- `PUT /courses/{course}`
- `PATCH /courses/{course}`
- `DELETE /courses/{course}`

Payload створення/оновлення курсу підтримує метадані:

- `subtitle`
- `category`
- `level`
- `language`
- `thumbnail_path`
- `duration_minutes`

### Зарахування

- `GET /courses/{course}/enrollments`
- `POST /courses/{course}/enrollments`
- `DELETE /courses/{course}/enrollments/{enrollment}`

Для paid-курсів потрібна попередня оплата. Якщо оплати немає, endpoint повертає `402` з повідомленням про необхідність покупки.

### Модулі

- `GET /courses/{course}/modules`
- `POST /courses/{course}/modules`
- `GET /courses/{course}/modules/{module}`
- `PUT /courses/{course}/modules/{module}`
- `PATCH /courses/{course}/modules/{module}`
- `DELETE /courses/{course}/modules/{module}`

### Уроки

- `GET /modules/{module}/lessons`
- `POST /modules/{module}/lessons`
- `GET /modules/{module}/lessons/{lesson}`
- `PUT /modules/{module}/lessons/{lesson}`
- `PATCH /modules/{module}/lessons/{lesson}`
- `DELETE /modules/{module}/lessons/{lesson}`

### Прогрес

- `POST /lessons/{lesson}/progress`
- `PUT /lessons/{lesson}/progress`

Коли прогрес досягає `100`, бекенд перевіряє завершення всіх уроків курсу і видає (або повертає) сертифікат.

### Сертифікати

- `GET /certificates`
- `GET /certificates/{certificate}`
- `POST /courses/{course}/certificate`

Доступ до сертифікатів рольовий:

- Студенти бачать свої сертифікати
- Викладачі бачать сертифікати своїх курсів
- Адміни бачать усі сертифікати

### Квізи

- `GET /courses/{course}/quizzes`
- `POST /courses/{course}/quizzes`
- `GET /courses/{course}/quizzes/{quiz}`
- `PUT /courses/{course}/quizzes/{quiz}`
- `PATCH /courses/{course}/quizzes/{quiz}`
- `DELETE /courses/{course}/quizzes/{quiz}`

Підтримувані типи запитань:

- `single_choice`: рівно один варіант із `is_correct: true`
- `multiple_choice`: один або більше варіантів із `is_correct: true`

### Спроби квізу

- `GET /quizzes/{quiz}/attempts`
- `POST /quizzes/{quiz}/attempts`

У спробі приймається тільки `answers`; `score` і `passed` рахує бекенд.

### Аналітика квізу

- `GET /quizzes/{quiz}/analytics`

Доступно лише викладачу курсу та адмінам. Аналітика рахується в реальному часі з `quiz_attempts` і `quiz_questions` без окремої таблиці статистики.

### Відгуки

- `GET /courses/{course}/reviews`
- `POST /courses/{course}/reviews`
- `PUT /courses/{course}/reviews/{review}`
- `PATCH /courses/{course}/reviews/{review}`
- `DELETE /courses/{course}/reviews/{review}`

### Коментарі до уроків

- `GET /lessons/{lesson}/comments`
- `POST /lessons/{lesson}/comments`
- `PUT /lessons/{lesson}/comments/{comment}`
- `PATCH /lessons/{lesson}/comments/{comment}`
- `DELETE /lessons/{lesson}/comments/{comment}`

### Платежі

- `GET /payments`
- `GET /payments/{payment}`
- `POST /courses/{course}/payments`
- `POST /courses/{course}/payments/stripe-checkout`
- `POST /stripe/webhook`
- `GET /payments/status`
- `POST /payments/stripe/confirm`

`POST /courses/{course}/payments` — внутрішній purchase endpoint: перевіряє суму, створює `paid` payment, генерує receipt, надає доступ і створює/повертає active enrollment.

Stripe Checkout + webhook flow повністю реалізовані. Інтеграція LiqPay запланована. Потік провайдер-агностичний: і Stripe webhook, і internal payment формують однакові `payments` із `status = paid`.

### Публікація курсів (publish request)

Викладачі можуть створювати курси як чернетки і запитувати публікацію.

- Запит викладача: у `POST/PUT/PATCH` курсу передати `request_publish: true`
- Схвалення адміном: `PATCH /courses/{course}` з `{ "is_published": true }`
- Відхилення адміном: `PATCH /courses/{course}` з `{ "decline_publish": true, "publish_request_declined_reason": "optional reason" }`

### Email-сповіщення

Поточні тригери:

- Верифікація реєстрації
- Скидання пароля
- Підтвердження зарахування
- Результат квізу
- Видача сертифіката
- Схвалення/відхилення publish request

## Примітки

- Контроль доступу рольовий: student/instructor/admin
- Admin endpoints керують ролями, банами та модерацією
- Progress і quiz attempt мають перевірки enrollment/instructor
- Нові відгуки та коментарі до уроків проходять через moderation queue
- Валідація виконується через FormRequest-класи
