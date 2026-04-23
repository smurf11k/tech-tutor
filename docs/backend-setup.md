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

```env
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=techtutor
DB_USERNAME=techtutor_user
DB_PASSWORD=techtutor_pass
```

Required values for Docker Postgres service (read through Compose env file):

```env
POSTGRES_DB=techtutor
POSTGRES_USER=techtutor_user
POSTGRES_PASSWORD=techtutor_pass
```

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
php artisan test
vendor/bin/pint
```

## Reset Database Quickly

Soft reset from `backend`:

```bash
composer db:fresh
```

This recreates all tables and reseeds the database, but keeps the Postgres data directory/container in place.

Hard reset from `backend`:

```bash
composer db:reset-hard
```

This stops Docker Compose, deletes `backend/database/data`, starts the Postgres service again, and runs `php artisan migrate:fresh --seed`.

Important: in this project, `docker compose down -v` alone does not fully wipe Postgres data because the database is stored in a bind-mounted folder at `backend/database/data`, not a named Docker volume.
