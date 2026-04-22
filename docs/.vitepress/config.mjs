import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "TechTutor",
  description: "Documentation for TechTutor, a modern LMS platform built with Laravel, React, and PostgreSQL",
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Backend Overview', link: '/backend-overview' },
      { text: 'API', link: '/backend-api' },
      { text: 'Testing', link: '/backend-testing' }
    ],

    sidebar: [
      {
        text: 'Backend',
        items: [
          { text: 'Overview', link: '/backend-overview' },
          { text: 'Setup', link: '/backend-setup' },
          { text: 'API Reference', link: '/backend-api' },
          { text: 'API Testing', link: '/backend-testing' }
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/smurf11k/tech-tutor' }
    ]
  }
})
