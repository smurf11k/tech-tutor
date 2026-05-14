---
outline: deep
---

# Налаштування бекенду

## Передумови

- PHP 8.3+
- Composer
- Docker Desktop (для PostgreSQL)

## Оточення

Файл оточення бекенду: `backend/.env`

Обов'язкові значення БД для Laravel:

```env
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=techtutor
DB_USERNAME=techtutor_user
DB_PASSWORD=techtutor_pass
```

Обов'язкові значення для Docker Postgres service (дивіться Compose env file):

```env
POSTGRES_DB=techtutor
POSTGRES_USER=techtutor_user
POSTGRES_PASSWORD=techtutor_pass
```

Необов'язкові mail-параметри для email-сповіщень:

```env
MAIL_MAILER=smtp
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_ENCRYPTION=tls
MAIL_USERNAME=your-mailbox@example.com
MAIL_PASSWORD=your-app-password
MAIL_FROM_ADDRESS=your-mailbox@example.com
MAIL_FROM_NAME=TechTutor
```

Для Gmail SMTP використовуйте app password. Не комітьте реальні mail credentials.

## Запуск бази даних

З кореня проєкту:

```bash
docker compose up -d
```

Дані Postgres зберігаються у:

- `backend/database/data`

## Встановлення і запуск бекенду

Із `backend`:

```bash
composer install
php artisan key:generate
php artisan migrate
php artisan db:seed
php artisan serve
```

## Демо-акаунти після seed

Після `php artisan migrate --seed` або `composer db:fresh` доступні локальні демо-акаунти:

- `admin@techtutor.test`
- `instructor@techtutor.test`
- `student@techtutor.test`
- `student2@techtutor.test`
- `banned@techtutor.test`

Спільний пароль для всіх демо-акаунтів:

```txt
password
```

## Корисні команди

```bash
php artisan migrate:fresh --seed
composer cleanup
composer cleanup:optimize
composer start:fresh
composer start:fresh:seed
php artisan test
vendor/bin/pint
```

### Cleanup

```bash
composer cleanup
```

Очищає скомпільовані та runtime-кеші Laravel для повернення в чистий стан.

Виконує:

- `php artisan optimize:clear`
- `php artisan config:clear`
- `php artisan cache:clear`
- `php artisan route:clear`
- `php artisan view:clear`
- `php artisan event:clear`

Використовуйте після:

- зміни значень у `.env`
- перемикання гілок
- оновлення залежностей
- неочікуваної поведінки через кеш під час локальної розробки

### Cleanup + Optimize

```bash
composer cleanup:optimize
```

Запускає стандартне очищення та відновлює оптимізовані кеші через:

- `php artisan optimize`

Корисно, якщо потрібен чистий і водночас оптимізований локальний стан.

## Швидке скидання БД

Початкове очищення і міграція з `backend`:

```bash
composer start:fresh
```

Команда виконує cleanup, а потім запускає міграції БД.

Початкове очищення, міграція і seed з `backend`:

```bash
composer start:fresh:seed
```

Виконує той самий cleanup, потім свіжу міграцію і сідинг.

Soft reset із `backend`:

```bash
composer db:fresh
```

Пересоздає всі таблиці та повторно сідує БД, але зберігає каталог даних/container Postgres.

::: info
У цьому проєкті `docker compose down -v` сам по собі не повністю стирає Postgres, бо база зберігається у bind-mounted папці `backend/database/data`, а не в named Docker volume.
:::
