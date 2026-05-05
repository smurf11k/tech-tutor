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
- CourseCertificate
- PublishRequest

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

### Instructor Dashboard

- Live dashboard summary for instructors and admins
- Course management overview with published/draft counts
- Student progress per course from lesson completion records
- Enrollment, completion, certificate, quiz score, and revenue aggregates
- No dashboard statistics tables are stored
- Revenue currently reads internal paid payment records and can be refined when real payment provider webhooks are introduced

### Admin Monitoring

- Live platform activity monitor for admins
- User, course, enrollment, certificate, quiz attempt, and moderation totals
- Payment status breakdown and paid revenue by course
- Recent activity feed from existing users, courses, enrollments, payments, and certificates
- No platform monitoring statistics tables are stored

### Student Learning Flow

- Enroll into course
- Save lesson progress (0-100)
- Track completion timestamp when progress reaches 100
- Issue an idempotent course certificate after every course lesson is completed
- Certificate visibility is role-aware: students see their own, instructors see certificates for their courses, admins see all
- Email the student when enrollment is created and when a certificate is issued

### Quiz Flow

- Quiz CRUD under course
- Single-choice and multiple-choice quiz questions
- Quiz attempts under quiz
- Backend-calculated attempt score from submitted answers
- Automatic `passed` computation from calculated score and pass threshold
- Live instructor/admin quiz analytics computed from existing attempts and questions
- No separate statistics tables are stored for quiz analytics
- Email the student after each completed quiz attempt with score/pass status

### Notifications

- Laravel mail notifications use the configured mailer from `.env`
- Current email triggers: new enrollment, completed quiz attempt, issued certificate, and admin-handled publish request
- Notification tests fake the notification channel so SMTP credentials are never used by the automated suite

### Commerce and Community

- Course review create/update/delete
- Payment create/list with provider, amount, currency, status
- Publish requests notify instructors when admins approve or decline them

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
- Email notification trigger assertions
- Review and payment flow

Run tests:

```bash
php artisan test
```
