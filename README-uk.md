[![License: MPL 2.0](https://img.shields.io/badge/License-MPL_2.0-brightgreen.svg)](./LICENSE)

> Англійська версія доступна: [README in english](./README.md)

# TechTutor

> Сучасна LMS‑платформа для створення, продажу та проходження онлайн‑курсів.

---

## Огляд

**TechTutor** — це повноцінна (full‑stack) навчальна платформа, побудована зі масштабованою архітектурою.  
Вона підтримує керування курсами, платежі, тести та відстеження прогресу.

---

## Технологічний стек

| Рівень     | Технологія                                  |
| ---------- | ------------------------------------------- |
| Бекенд     | [Laravel (PHP)](https://laravel.com/)       |
| Фронтенд   | [React (SPA + SSR)](https://react.dev/)     |
| База даних | [PostgreSQL](https://www.postgresql.org/)   |
| Пошук      | [MeiliSearch](https://www.meilisearch.com/) |
| API        | [REST](https://restfulapi.net/)             |

### Додаткові пакети

<details>
<summary>Фронтенд</summary>

- <https://vitejs.dev/>
- <https://tailwindcss.com/>
- <https://ui.shadcn.com/>
- <https://www.radix-ui.com/>
- <https://cva.style/docs>
- <https://github.com/lukeed/clsx>
- <https://github.com/dcastil/tailwind-merge>
- <https://github.com/jamiebuilds/tailwindcss-animate>
- <https://lucide.dev/>
- <https://fontsource.org/fonts/geist>
- <https://axios-http.com/>
- <https://docs.dndkit.com/>
- <https://dndkit.com/concepts/sortable/>
- <https://github.com/clauderic/dnd-kit>
- <https://eslint.org/>
- <https://www.npmjs.com/package/eslint-plugin-react-hooks>
- <https://www.npmjs.com/package/eslint-plugin-react-refresh>
- <https://www.npmjs.com/package/@types/react>
- <https://www.npmjs.com/package/@types/react-dom>
- <https://www.npmjs.com/package/globals>

</details>

<details>
<summary>Інструменти збірки</summary>

- <https://laravel.com/docs/vite>
- <https://www.npmjs.com/package/concurrently>

</details>

---

## Можливості

### Студенти

- Реєстрація / вхід через email
- Підтвердження електронної пошти та скидання пароля
- OAuth‑вхід
- Купівля курсів
- Перегляд уроків (відео, текст, файли)
- Проходження тестів та отримання результатів
- Відстеження прогресу навчання
- Залишення відгуків і коментарів

---

### Інструктори / Викладачі

- Створення та керування курсами
- Завантаження уроків і матеріалів
- Створення тестів
- Відстеження прогресу студентів
- Перегляд аналітики курсу

---

### Адміністратор

- Керування користувачами та ролями
- Модерація контенту
- Моніторинг активності платформи
- Керування платежами

---

## Аутентифікація та безпека

- Аутентифікація через токени Sanctum
- Вхід через email/пароль
- Підтвердження email та скидання пароля
- OAuth‑вхід
- 2FA (опціонально)
- Обмеження частоти запитів (rate limiting) для auth endpoint'ів
- CAPTCHA при реєстрації/вході
- Валідація та очищення вхідних даних
- Захист від XSS / SQL‑інʼєкцій

---

## Основні можливості

- Пошук і фільтрація курсів
- Адаптивний інтерфейс
- Сповіщення (Email / Push)
- Інтеграція оплат (LiqPay / Stripe)
- Інтеграція аналітики

---

## Модель даних

    User
    Course
    Module
    Lesson
    Quiz
    QuizAttempt
    Enrollment
    Progress

---

## API

RESTful API для всіх ключових функцій.

---

## Примітки щодо архітектури

- Контроль доступу на основі ролей (RBAC)
- SSR для продуктивності та SEO
- Модульна структура (Курси → Модулі → Уроки)
- Масштабовані інтеграції сервісів

---

## Локальне сканування безпеки (ZAP)

Цей проєкт містить файл zap.yaml для автоматизації локального базового сканування OWASP ZAP.

Запуск із кореня проєкту:

```powershell
docker run -t -v ${PWD}:/zap/wrk:rw ghcr.io/zaproxy/zaproxy:stable zap.sh -cmd -autorun /zap/wrk/zap.yaml
```

Примітки:

- Ціль сканування наразі встановлена як http://host.docker.internal:8000 у zap.yaml.
- Це налаштування призначене для локального тестування та підвищення безпеки під час розробки.

---

### Додатково

Дорожню карту (roadmap) з чек-листом можна переглянути в основному [README.md](./README.md#roadmap).
