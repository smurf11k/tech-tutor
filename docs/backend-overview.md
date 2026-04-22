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

- `student@example.com`
- `instructor@example.com`
- `admin@example.com`

## Test Coverage

Feature tests currently cover:

- Course creation, enrollment, and lesson progress
- Quiz creation and student attempt submission
- Review and payment flow

Run tests:

```bash
php artisan test
```
