[![License: MPL 2.0](https://img.shields.io/badge/License-MPL_2.0-brightgreen.svg)](./LICENSE)
![Status: Under Development](https://img.shields.io/badge/status-under--development-orange)

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

<details>
<summary>Frontend</summary>

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

</details>

<details>
<summary>Build tooling</summary>

- [laravel-vite-plugin](https://laravel.com/docs/vite)
- [concurrently](https://www.npmjs.com/package/concurrently)

</details>

---

## Features

### Students

- Sign up / login with email
- Email verification and password reset
- OAuth login
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

- Sanctum token authentication
- Email/password login
- Email verification and password reset
- OAuth login
- 2FA (optional)
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

## Roadmap

### Infrastructure & Auth

- [x] Project setup (Laravel + React + PostgreSQL + Docker)
- [x] Sanctum token authentication
- [x] Email/password login
- [x] Registration flow
- [x] Current-user profile endpoint
- [x] Logout / token revocation
- [x] Email verification
- [x] Password reset flow
- [x] OAuth login with Google
- [ ] OAuth login with GitHub (optional)
- [ ] 2FA (optional)
- [ ] Rate limiting
- [ ] CAPTCHA
- [ ] Production security hardening
- [x] Role-based access control (student, instructor, admin)
- [x] Ban enforcement for protected API routes

### Core Course Structure

- [x] Course CRUD (instructor)
- [x] Module CRUD (instructor)
- [x] Lesson CRUD (instructor)
- [x] Lesson content fields for text/video/file metadata
- [ ] Production-ready lesson file upload/storage pipeline
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
- [x] Course completion certificates

### Quizzes

- [x] Quiz CRUD (instructor)
- [x] Question types (single choice, multiple choice)
- [x] Quiz attempts & backend-calculated scoring
- [x] Pass threshold logic
- [x] Attempt history for students
- [x] Quiz analytics for instructors

### Payments

- [x] Internal payment records
- [x] Course pricing for free/paid courses
- [x] Instructor/admin revenue reporting from internal paid records
- [x] Admin payment monitoring dashboard
- [x] Verified purchase state and paid-course access gating
- [x] Purchase flow
- [x] Receipts
- [x] Stripe checkout session creation
- [x] Stripe webhook verification and paid access activation
- [ ] LiqPay checkout integration (optional)
- [ ] LiqPay webhook verification (optional)
- [ ] Refund handling
- [ ] Instructor payouts
- [ ] Subscription pricing

### Reviews & Community

- [x] Course reviews & star ratings
- [x] Lesson comments
- [x] Comment moderation (admin)
- [x] Review moderation (admin)

### Notifications

- [x] Email notifications (enrollment, quiz results, certificates, publish requests)
- [x] Auth email notifications (verification, password reset)
- [ ] New content email notifications
- [ ] In-app notifications
- [ ] Push notifications

### Instructor Dashboard

- [x] Course management overview
- [x] Student progress per course
- [x] Revenue & enrollment analytics
- [ ] Content upload & management

### Admin Panel

- [x] User management (view, ban, role change)
- [x] Content moderation queue
- [x] Platform activity monitor
- [x] Payment & revenue overview

### Analytics

- [ ] Student engagement metrics
- [x] Course completion rates in instructor dashboard
- [x] Revenue reports
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
