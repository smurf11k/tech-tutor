---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
  name: "TechTutor"
  text: "Backend Documentation"
  tagline: Current API, auth, and course logic implemented in Laravel
  actions:
    - theme: brand
      text: Backend Overview
      link: /backend-overview
    - theme: alt
      text: API Reference
      link: /backend-api

features:
  - title: Course Domain
    details: Course, module, lesson, enrollment, progress, quiz, review, and payment logic are wired with relational models.
  - title: Auth and Roles
    details: Sanctum-protected routes and role-aware access checks for student, instructor, and admin flows.
  - title: Tested Flows
    details: Feature tests cover core course flow, quiz attempts, and commerce flow.
---

