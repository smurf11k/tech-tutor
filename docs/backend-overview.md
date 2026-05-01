---
outline: deep
---

# Backend Overview

This documentation describes the backend logic currently implemented for TechTutor.

## Stack

- Laravel 13
- PHP 8.3
- PostgreSQL 16
- Laravel Sanctum

## Implemented Domain Model

- User
- Course
- Module
- Lesson
- Enrollment
- Progress
- Quiz
- QuizAttempt
- Review
- Payment

## Current Capabilities

### Roles and Access

- Role field on users (`student`, `instructor`, `admin`)
- Role-aware checks in business logic and policies
- Sanctum middleware for protected routes

### Course Structure

- Course CRUD
- Module CRUD nested under course
- Lesson CRUD nested under module
- Publish/draft flags and metadata fields on course and quiz
- Course catalog metadata: subtitle, category, level, language, thumbnail path, and duration
- Database-backed course catalog search, filtering, sorting, rating average, review count, and enrollment count

TODO: move free-text catalog search and ranking to MeiliSearch when search infrastructure is added.

### Student Learning Flow

- Enroll into course
- Save lesson progress (0-100)
- Track completion timestamp when progress reaches 100

### Quiz Flow

- Quiz CRUD under course
- Quiz attempts under quiz
- Automatic `passed` computation from score and pass threshold

### Commerce and Community

- Course review create/update/delete
- Payment create/list with provider, amount, currency, status

### Seed Data

Database seeding includes role-based users:

- `admin@techtutor.test`
- `instructor@techtutor.test`
- `student@techtutor.test`
- `student2@techtutor.test`
- `banned@techtutor.test`

## Test Coverage

Feature tests currently cover:

- Course creation, enrollment, and lesson progress
- Course catalog search/filtering and metadata
- Quiz creation and student attempt submission
- Review and payment flow

Run tests:

```bash
php artisan test
```
