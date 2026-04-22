# TechTutor

> Modern LMS platform for creating, selling, and consuming online courses.

---

## Overview

**TechTutor** is a full-stack learning platform built with a scalable architecture.  
It supports course management, payments, quizzes, and progress tracking.

---

## Tech Stack

| Layer    | Technology        |
| -------- | ----------------- |
| Backend  | Laravel (PHP)     |
| Frontend | React (SPA + SSR) |
| Database | PostgreSQL        |
| Search   | MeiliSearch       |
| API      | REST              |

### Additional packages

#### Frontend

- Vite
- Tailwind CSS
- shadcn/ui
- Radix UI
- class-variance-authority
- clsx
- tailwind-merge
- tw-animate-css
- lucide-react
- @fontsource-variable/geist
- axios
- @dnd-kit/core
- @dnd-kit/sortable
- @dnd-kit/utilities
- ESLint
- eslint-plugin-react-hooks
- eslint-plugin-react-refresh
- @types/react
- @types/react-dom
- globals

#### Build tooling

- laravel-vite-plugin
- concurrently

---

## Features

### Students

- Sign up / Login (Email + OAuth)
- Purchase courses
- Watch lessons (video, text, files)
- Pass quizzes & get results
- Track learning progress
- Leave reviews & comments

---

### Instructors/Teachers

- Create & manage courses
- Upload lessons & materials
- Build quizzes
- Track student progress
- View course analytics

---

### Admin

- Manage users & roles
- Moderate content
- Monitor platform activity
- Manage payments

---

## Authentication & Security

- JWT / Session-based auth
- Email verification
- Password reset
- Optional 2FA
- Rate limiting & CAPTCHA
- Protection against XSS / SQL Injection

---

## Core Capabilities

- Course search & filtering
- Responsive UI
- Notifications (Email / Push)
- Payment integration (LiqPay / Stripe)
- Analytics integration

---

## Data Model

```
User
Course
Module
Lesson
Quiz
QuizAttempt
Enrollment
Progress
```

---

## API

RESTful API for all core features.

---

## Architecture Notes

- Role-based access control (RBAC)
- SSR for performance & SEO
- Modular structure (Courses → Modules → Lessons)
- Scalable service integrations

---

## Current Implementation Snapshot

### Backend (implemented)

- PostgreSQL-backed Laravel API with migrations
- Domain models and relations:
	- User, Course, Module, Lesson, Enrollment, Progress, Quiz, QuizAttempt, Review, Payment
- CRUD and flow endpoints for:
	- Courses, modules, lessons
	- Enrollment and lesson progress
	- Quizzes and quiz attempts
	- Reviews and payments
- Role-aware access checks (student, instructor, admin)
- Sanctum-protected routes for private actions
- Feature tests for core flows

### Frontend (minimal integration shell)

- Course list from backend
- Course detail (modules + lessons)
- Token input (Sanctum bearer token)
- Enroll action wired to backend

---

## Documentation

Detailed setup, API, and testing notes live in `docs/`:

- [Backend Overview](docs/backend-overview.md)
- [Backend Setup](docs/backend-setup.md)
- [API Reference](docs/backend-api.md)
- [API Testing](docs/backend-testing.md)

For local development commands and token helper details, see the docs pages above.

---

## Roadmap

### Infrastructure & Auth

- [ ] Project setup (Laravel + React + PostgreSQL + Docker)
- [ ] JWT / session-based authentication
- [ ] Email + OAuth login (Google, GitHub)
- [ ] Email verification
- [ ] Password reset flow
- [ ] Optional 2FA
- [ ] Rate limiting & CAPTCHA
- [ ] XSS / SQL injection protection
- [x] Role-based access control (student, instructor, admin)

### Core Course Structure

- [x] Course CRUD (instructor)
- [x] Module CRUD (instructor)
- [x] Lesson CRUD — text, video, file uploads (instructor)
- [x] Course publish / draft logic
- [ ] Course thumbnail & metadata
- [x] Modular structure (Course → Modules → Lessons)

### Student Experience

- [ ] Course catalog with search & filtering (MeiliSearch)
- [ ] Course detail / preview page
- [x] Enrollment flow
- [ ] Lesson viewer (video player, text renderer, file downloads)
- [x] Progress tracking (per lesson, per module, per course)
- [ ] Course completion certificates

### Quizzes

- [x] Quiz CRUD (instructor)
- [ ] Question types (single choice, multiple choice)
- [x] Quiz attempts & scoring
- [x] Pass threshold logic
- [x] Attempt history for students
- [ ] Quiz analytics for instructors

### Payments

- [ ] Payment integration (Stripe / LiqPay)
- [ ] Course pricing (free / paid / subscription)
- [ ] Purchase flow & receipts
- [ ] Refund handling
- [ ] Instructor payouts
- [ ] Admin payment monitoring

### Reviews & Community

- [x] Course reviews & star ratings
- [ ] Lesson comments
- [ ] Comment moderation (admin)
- [ ] Review moderation (admin)

### Notifications

- [ ] Email notifications (enrollment, quiz results, new content)
- [ ] In-app notifications
- [ ] Push notifications

### Instructor Dashboard

- [ ] Course management overview
- [ ] Student progress per course
- [ ] Revenue & enrollment analytics
- [ ] Content upload & management

### Admin Panel

- [ ] User management (view, ban, role change)
- [ ] Content moderation queue
- [ ] Platform activity monitor
- [ ] Payment & revenue overview

### Analytics

- [ ] Student engagement metrics
- [ ] Course completion rates
- [ ] Revenue reports
- [ ] Search analytics (popular queries, zero results)

### SSR & Performance

- [ ] SSR setup for public pages (catalog, course detail)
- [ ] SEO meta tags & Open Graph
- [ ] Image optimization & CDN
- [ ] Lazy loading & pagination

### Polish & Extras

- [ ] Responsive UI across all pages
- [ ] Dark / light mode
- [ ] Multi-language support
- [ ] Accessibility (WCAG compliance)
- [ ] API documentation
- [x] Tests (unit + feature)
- [x] Seed / mock data
- [ ] CI/CD pipeline

## Additional

[Design Template](https://dp-tech-tutor-template.netlify.app/)
