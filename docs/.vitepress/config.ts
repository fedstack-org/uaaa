import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: 'UAAA',
  description: 'Unified Authentication And Authorization Framework',
  locales: {
    root: {
      label: '简体中文',
      lang: 'zh-Hans',
      themeConfig: {
        // https://vitepress.dev/reference/default-theme-config
        logo: '/logo.svg',

        nav: [
          { text: '首页', link: '/' },
          { text: 'English', link: '/en/' }
        ],

        sidebar: [
          {
            text: '文档',
            items: [
              { text: '(English documentation only)', link: '/en/' }
            ]
          }
        ]
      }
    },
    en: {
      label: 'English',
      lang: 'en',
      themeConfig: {
        logo: '/logo.svg',

        nav: [
          { text: 'Home', link: '/en/' },
          { text: 'Docs', link: '/en/architecture' },
          { text: 'Guides', link: '/en/deployment' }
        ],

        sidebar: [
          {
            text: 'Getting Started',
            collapsed: false,
            items: [
              { text: 'Introduction', link: '/en/' },
              { text: 'Architecture', link: '/en/architecture' },
              { text: 'OAuth2 Compatibility', link: '/en/oauth2-compatibility' },
              { text: 'Deployment', link: '/en/deployment' }
            ]
          },
          {
            text: 'Configuration & Operations',
            collapsed: false,
            items: [
              { text: 'Configuration Reference', link: '/en/configuration' },
              { text: 'Maintenance & Operations', link: '/en/maintenance' }
            ]
          },
          {
            text: 'Plugin System',
            collapsed: false,
            items: [
              { text: 'Plugin Ecosystem', link: '/en/plugins/' },
              { text: 'Developing Plugins', link: '/en/plugins/developing-plugins' }
            ]
          },
          {
            text: 'Integration Guides',
            collapsed: false,
            items: [
              { text: 'OAuth2 & OIDC Standard', link: '/en/integrations/oauth2-oidc' },
              { text: 'PreAuth + NonInteractive', link: '/en/integrations/pre-auth' },
              { text: 'PreferType + NonInteractive', link: '/en/integrations/prefer-type' }
            ]
          }
        ],

        socialLinks: [
          { icon: 'github', link: 'https://github.com/fedstack-org/uaaa' }
        ],

        footer: {
          message: 'Released under the MIT License.',
          copyright: 'Copyright © 2024-present UAAA Team'
        },

        search: {
          provider: 'local'
        }
      }
    }
  },

  themeConfig: {
    socialLinks: [
      { icon: 'github', link: 'https://github.com/fedstack-org/uaaa' }
    ]
  }

  // Note: Mermaid diagrams are supported natively in VitePress 1.0+
  // Simply use ```mermaid code blocks in markdown files
})
