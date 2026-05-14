import { defineConfig } from "vitepress";

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "TechTutor",
  description: "TechTutor documentation",
  appearance: true,
  head: [
    ["link", { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" }],
  ],
  locales: {
    root: {
      label: "English",
      lang: "en",
      title: "TechTutor",
      description:
        "Documentation for TechTutor, a modern LMS platform built with Laravel, React, and PostgreSQL",
      themeConfig: {
        nav: [
          { text: "Home", link: "/" },
          { text: "Backend Overview", link: "/backend-overview" },
          { text: "API", link: "/backend-api" },
          { text: "Testing", link: "/backend-testing" },
        ],
        sidebar: [
          {
            text: "Backend",
            items: [
              { text: "Overview", link: "/backend-overview" },
              { text: "Setup", link: "/backend-setup" },
              { text: "API Reference", link: "/backend-api" },
              { text: "API Testing", link: "/backend-testing" },
            ],
          },
        ],
        langMenuLabel: "Language",
      },
    },
    uk: {
      label: "Українська",
      lang: "uk",
      title: "TechTutor",
      description:
        "Документація TechTutor для сучасної LMS-платформи на Laravel, React і PostgreSQL",
      themeConfig: {
        nav: [
          { text: "Головна", link: "/uk/" },
          { text: "Огляд бекенду", link: "/uk/backend-overview" },
          { text: "API", link: "/uk/backend-api" },
          { text: "Тестування", link: "/uk/backend-testing" },
        ],
        sidebar: [
          {
            text: "Бекенд",
            items: [
              { text: "Огляд", link: "/uk/backend-overview" },
              { text: "Налаштування", link: "/uk/backend-setup" },
              { text: "Довідник API", link: "/uk/backend-api" },
              { text: "Тестування API", link: "/uk/backend-testing" },
            ],
          },
        ],
        langMenuLabel: "Мова",
      },
    },
  },
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    socialLinks: [
      { icon: "github", link: "https://github.com/smurf11k/tech-tutor" },
    ],
  },
});
