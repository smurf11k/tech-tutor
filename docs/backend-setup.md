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

## Useful Commands

```bash
php artisan migrate:fresh --seed
php artisan test
vendor/bin/pint
```
