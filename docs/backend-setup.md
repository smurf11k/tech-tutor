---
outline: deep
---

# Backend Setup

## Prerequisites

- PHP 8.3+
- Composer
- Docker Desktop (for PostgreSQL)

## Environment

Backend env file: `backend/.env`

Required database values for Laravel:

```
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=techtutor
DB_USERNAME=techtutor_user
DB_PASSWORD=techtutor_pass
```

Required values for Docker Postgres service (read through Compose env file):

```
POSTGRES_DB=techtutor
POSTGRES_USER=techtutor_user
POSTGRES_PASSWORD=techtutor_pass
```

Optional mail values for email notifications:

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

Use an app password for Gmail SMTP. Do not commit real mail credentials.

## Start Database

From project root:

```bash
docker compose up -d
```

Postgres data is persisted under:

- `backend/database/data`

## Install and Run Backend

From `backend`:

```bash
composer install
php artisan key:generate
php artisan migrate
php artisan db:seed
php artisan serve
```

## Seeded Demo Accounts

After `php artisan migrate --seed` or `composer db:fresh`, these local demo accounts are available:

- `admin@techtutor.test`
- `instructor@techtutor.test`
- `student@techtutor.test`
- `student2@techtutor.test`
- `banned@techtutor.test`

Shared password for all demo accounts:

```txt
password
```

## Useful Commands

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

Clears Laravel’s compiled and runtime caches to restore a clean application state.

Internally runs:

- `php artisan optimize:clear`
- `php artisan config:clear`
- `php artisan cache:clear`
- `php artisan route:clear`
- `php artisan view:clear`
- `php artisan event:clear`

Use this after:

- changing `.env` values
- pulling new branches
- dependency updates
- encountering unexpected cached behavior during local development

### Cleanup + Optimize

```bash
composer cleanup:optimize
```

Runs the standard cleanup and then rebuilds optimized caches using:

- `php artisan optimize`

This is useful when you want a clean but fully optimized local state.

## Reset Database Quickly

First-start cleanup and migrate from `backend`:

```bash
composer start:fresh
```

This runs the cleanup command and then executes database migrations.

First-start cleanup, migrate, and seed from `backend`:

```bash
composer start:fresh:seed
```

This performs the same cleanup, then runs a fresh migration and seeds the database.

Soft reset from `backend`:

```bash
composer db:fresh
```

This recreates all tables and reseeds the database, but keeps the Postgres data directory/container in place.

::: info
In this project, `docker compose down -v` alone does not fully wipe Postgres data because the database is stored in a bind-mounted folder at `backend/database/data`, not a named Docker volume.
:::
