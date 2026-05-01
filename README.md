# TechTutor

> Modern LMS platform for creating, selling, and consuming online courses.

---

## Overview

**TechTutor** is a full-stack learning platform built with a scalable architecture.  
It supports course management, payments, quizzes, and progress tracking.

---

## Tech Stack

| Layer    | Technology                                  |
| -------- | ------------------------------------------- |
| Backend  | [Laravel (PHP)](https://laravel.com/)       |
| Frontend | [React (SPA + SSR)](https://react.dev/)     |
| Database | [PostgreSQL](https://www.postgresql.org/)   |
| Search   | [MeiliSearch](https://www.meilisearch.com/) |
| API      | [REST](https://restfulapi.net/)             |

### Additional packages

#### Frontend

- [Vite](https://vitejs.dev/)
- [Tailwind CSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)
- [Radix UI](https://www.radix-ui.com/)
- [class-variance-authority](https://cva.style/docs)
- [clsx](https://github.com/lukeed/clsx)
- [tailwind-merge](https://github.com/dcastil/tailwind-merge)
- [tw-animate-css](https://github.com/jamiebuilds/tailwindcss-animate)
- [lucide-react](https://lucide.dev/)
- [@fontsource-variable/geist](https://fontsource.org/fonts/geist)
- [axios](https://axios-http.com/)
- [@dnd-kit/core](https://docs.dndkit.com/)
- [@dnd-kit/sortable](https://dndkit.com/concepts/sortable/)
- [@dnd-kit/utilities](https://github.com/clauderic/dnd-kit)
- [ESLint](https://eslint.org/)
- [eslint-plugin-react-hooks](https://www.npmjs.com/package/eslint-plugin-react-hooks)
- [eslint-plugin-react-refresh](https://www.npmjs.com/package/eslint-plugin-react-refresh)
- [@types/react](https://www.npmjs.com/package/@types/react)
- [@types/react-dom](https://www.npmjs.com/package/@types/react-dom)
- [globals](https://www.npmjs.com/package/globals)

#### Build tooling

- [laravel-vite-plugin](https://laravel.com/docs/vite)
- [concurrently](https://www.npmjs.com/package/concurrently)

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
  - User, Course, Module, Lesson, Enrollment, Progress, Quiz, QuizAttempt, Review, Comment, Payment
- CRUD and flow endpoints for:
  - Courses, modules, lessons
  - Course catalog search, filters, sorting, and catalog metadata
  - Enrollment and lesson progress
  - Quizzes and quiz attempts
  - Reviews, lesson comments, moderation queue, and payments
- Admin endpoints for:
  - User listing, role changes, and ban management
  - Content moderation queue plus review and comment approval
- Role-aware access checks (student, instructor, admin)
- Ban enforcement for protected API access
- Rich demo seed data for users, courses, lessons, enrollments, progress, payments, quizzes, reviews, lesson comments, and moderation queue items
- Sanctum-protected routes for private actions
- Feature tests for core flows

- Publish-request workflow (instructors request publishing; admins approve/decline). See `docs/backend-api.md` for details.

### Frontend (demo integration shell)

- Course list and course detail from backend
- Quick seeded login for student, instructor, admin, and banned-user testing
- Role-aware demo panels for payments, admin users, and moderation queue
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

- [x] Project setup (Laravel + React + PostgreSQL + Docker)
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
- [x] Course thumbnail & metadata
- [x] Modular structure (Course → Modules → Lessons)

### Student Experience

- [x] Course catalog with database-backed search & filtering
- [ ] MeiliSearch-powered catalog indexing/search
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
- [x] Lesson comments
- [x] Comment moderation (admin)
- [x] Review moderation (admin)

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

- [x] User management (view, ban, role change)
- [x] Content moderation queue
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
- [x] API documentation
- [x] Tests (unit + feature)
- [x] Seed / mock data
- [ ] CI/CD pipeline

## Additional

[Design Template](https://dp-tech-tutor-template.netlify.app/)
